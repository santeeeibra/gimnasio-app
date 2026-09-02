"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { registrarAccionAdmin } from "@/lib/admin/audit";

const ESTADOS = ["prueba", "activo", "solo_lectura"] as const;
type EstadoGym = (typeof ESTADOS)[number];

// Cambia gimnasios.estado desde la consola de soporte (para probar el modo
// solo-lectura sin abrir el SQL Editor). Superadmin, service_role, auditado.
export async function cambiarEstadoGimnasio(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoGym;

  if (!gimnasioId || !ESTADOS.includes(estado)) {
    return { ok: false, msg: "Datos inválidos." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("gimnasios")
    .update({ estado })
    .eq("id", gimnasioId);

  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "cambiar_estado_gym", gimnasioId, {
    estado,
  });
  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  return { ok: true, msg: `Estado cambiado a "${estado}".` };
}

// ── Planes de plataforma (PLAN_PLANES_PLATAFORMA.md, fase 2) ──

// Alta o edición de un plan de plataforma. Con `id` actualiza; sin `id` crea.
// max_socios vacío = ilimitado (null). Superadmin, service_role, auditado.
export async function guardarPlanPlataforma(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();

  const id = String(formData.get("id") ?? "").trim() || null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const maxRaw = String(formData.get("max_socios") ?? "").trim();
  const precioRaw = String(formData.get("precio_mensual") ?? "").trim();
  const ordenRaw = String(formData.get("orden") ?? "").trim();
  const activo = formData.get("activo") != null;

  if (!nombre) return { ok: false, msg: "Falta el nombre." };
  const max_socios = maxRaw === "" ? null : Number(maxRaw);
  if (max_socios != null && (!Number.isInteger(max_socios) || max_socios < 1)) {
    return { ok: false, msg: "Máx. socios: entero ≥ 1 o vacío." };
  }
  const precio_mensual = precioRaw === "" ? 0 : Number(precioRaw);
  if (!Number.isFinite(precio_mensual) || precio_mensual < 0) {
    return { ok: false, msg: "Precio inválido." };
  }
  const orden = ordenRaw === "" ? 0 : Number(ordenRaw);

  const db = createAdminClient();
  const fila = { nombre, max_socios, precio_mensual, activo, orden };
  const { error } = id
    ? await db.from("planes_plataforma").update(fila).eq("id", id)
    : await db.from("planes_plataforma").insert(fila);
  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "editar_planes_plataforma", null, {
    id,
    nombre,
  });
  revalidatePath("/admin/planes");
  return { ok: true, msg: id ? "Plan actualizado." : "Plan creado." };
}

// Asigna (o desasigna) el plan de plataforma de un gimnasio y su vencimiento.
export async function asignarPlanPlataforma(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();

  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const planId = String(formData.get("plan_id") ?? "").trim() || null;
  const venceRaw = String(formData.get("vence_el") ?? "").trim();
  if (!gimnasioId) return { ok: false, msg: "Falta el gimnasio." };
  if (venceRaw && !/^\d{4}-\d{2}-\d{2}$/.test(venceRaw)) {
    return { ok: false, msg: "Fecha de vencimiento inválida." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("gimnasios")
    .update({
      plan_plataforma_id: planId,
      plan_plataforma_vence_el: venceRaw || null,
    })
    .eq("id", gimnasioId);
  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "asignar_plan_plataforma", gimnasioId, {
    plan_id: planId,
    vence_el: venceRaw || null,
  });
  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  return { ok: true, msg: planId ? "Plan asignado." : "Plan quitado." };
}

// Registra un pago del gimnasio a la plataforma: empuja el vencimiento
// `dias` días (desde hoy o desde el vencimiento vigente si es futuro) y deja
// el gimnasio en 'activo'. Superadmin, service_role, auditado.
export async function renovarPlanPlataforma(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const dias = Math.trunc(Number(formData.get("dias") ?? 30)) || 30;
  if (!gimnasioId) return { ok: false, msg: "Falta el gimnasio." };
  if (dias < 1 || dias > 366) return { ok: false, msg: "Días fuera de rango." };

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select("plan_plataforma_vence_el")
    .eq("id", gimnasioId)
    .single();

  const hoy = new Date();
  const vigente = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el)
    : null;
  const base = vigente && vigente > hoy ? vigente : hoy;
  base.setDate(base.getDate() + dias);
  const venceEl = base.toISOString().slice(0, 10);

  const { error } = await db
    .from("gimnasios")
    .update({ plan_plataforma_vence_el: venceEl, estado: "activo" })
    .eq("id", gimnasioId);
  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "renovar_plan_plataforma", gimnasioId, {
    dias,
    vence_el: venceEl,
  });
  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  return { ok: true, msg: `Renovado hasta ${venceEl}, gimnasio activo.` };
}

// Manda un push de prueba SOLO a los dispositivos del superadmin. Nunca a
// clientes ni dueños de un gimnasio.
export async function enviarPushPrueba(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();

  const title = String(formData.get("title") ?? "").trim() || "Prueba";
  const body =
    String(formData.get("body") ?? "").trim() || "Push de prueba desde soporte.";

  await enviarPush([admin.id], { title, body, tag: "admin-prueba" });
  await registrarAccionAdmin(admin.id, "push_prueba", null, { title });

  return { ok: true, msg: "Enviado a tus dispositivos suscriptos." };
}
