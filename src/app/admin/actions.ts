"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { aprobarPagoPlataforma } from "@/lib/plataforma/aprobar-pago";
import { rechazarPagoPlataforma as ejecutarRechazoPagoPlataforma } from "@/lib/plataforma/rechazar-pago";

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

// Confirma a mano un pago pendiente de gimnasio -> plataforma (para el adapter
// `manual` o si el webhook falló). La lógica de aprobar + renovar vive en
// aprobarPagoPlataforma; acá solo va el gate de superadmin + auditoría.
export async function confirmarPagoPlataforma(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const pagoId = String(formData.get("pago_id") ?? "");
  if (!pagoId) return { ok: false, msg: "Falta el pago." };
  const fechaManual =
    String(formData.get("fecha_vencimiento_manual") ?? "").trim() || null;

  const db = createAdminClient();
  const r = await aprobarPagoPlataforma(db, pagoId, undefined, fechaManual);
  if (!r.ok) return { ok: false, msg: r.msg };

  await registrarAccionAdmin(
    admin.id,
    "confirmar_pago_plataforma",
    r.gimnasioId ?? null,
    { pago_id: pagoId, vence_el: r.venceEl },
  );
  if (r.gimnasioId) revalidatePath(`/admin/gimnasios/${r.gimnasioId}`);
  return { ok: true, msg: `Pago confirmado. ${r.msg}` };
}

// Rechaza a mano un pago pendiente de gimnasio -> plataforma con motivo.
// Registra el motivo en la nota, notifica al dueño y audita la acción.
export async function rechazarPagoPlataforma(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const pagoId = String(formData.get("pago_id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!pagoId) return { ok: false, msg: "Falta el pago." };
  if (!motivo) return { ok: false, msg: "Tenés que indicar un motivo de rechazo." };

  const db = createAdminClient();
  const r = await ejecutarRechazoPagoPlataforma(db, pagoId, motivo);
  if (!r.ok) return { ok: false, msg: r.msg };

  await registrarAccionAdmin(
    admin.id,
    "rechazar_pago_plataforma",
    r.gimnasioId ?? null,
    { pago_id: pagoId, motivo },
  );
  if (r.gimnasioId) revalidatePath(`/admin/gimnasios/${r.gimnasioId}`);
  return { ok: true, msg: "Pago rechazado." };
}

// Fuerza el estado de cuota / prueba de un socio puntual, para probar los
// avisos (morosidad, prueba vencida) sin esperar fechas reales. Solo escribe
// clientes.{en_prueba,fecha_vencimiento,estado_cuota,...} y registros_entrada
// vía service_role. Superadmin, auditado. No es un flujo de negocio.
const PRESETS_SOCIO = new Set([
  "cuota_por_vencer",
  "cuota_vencida",
  "trial_activo",
  "trial_expirado",
]);

export async function forzarEstadoSocio(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const clienteId = String(formData.get("cliente_id") ?? "");
  const preset = String(formData.get("preset") ?? "");
  if (!clienteId) return { ok: false, msg: "Falta el socio." };
  if (!PRESETS_SOCIO.has(preset)) return { ok: false, msg: "Preset inválido." };

  const db = createAdminClient();
  const { data: cli } = await db
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("id", clienteId)
    .single();
  if (!cli) return { ok: false, msg: "Socio inexistente." };

  const hoy = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  if (preset === "cuota_por_vencer" || preset === "cuota_vencida") {
    let venc: string;
    if (preset === "cuota_por_vencer") {
      const { data: gym } = await db
        .from("gimnasios")
        .select("dias_aviso_morosidad")
        .eq("id", cli.gimnasio_id)
        .single();
      venc = addDays(gym?.dias_aviso_morosidad ?? 5);
    } else {
      venc = addDays(-1);
    }
    const { error } = await db
      .from("clientes")
      .update({
        en_prueba: false,
        prueba_iniciada_en: null,
        fecha_vencimiento: venc,
        estado_cuota: preset === "cuota_vencida" ? "vencido" : "por_vencer",
        ultimo_aviso_morosidad_enviado_en: null,
      })
      .eq("id", clienteId);
    if (error) return { ok: false, msg: error.message };
  } else {
    // trial_activo | trial_expirado
    const { error } = await db
      .from("clientes")
      .update({
        en_prueba: true,
        prueba_iniciada_en: iso(hoy),
        fecha_vencimiento: null,
        estado_cuota: "vencido",
        ultimo_aviso_morosidad_enviado_en: null,
      })
      .eq("id", clienteId);
    if (error) return { ok: false, msg: error.message };

    await db.from("registros_entrada").delete().eq("cliente_id", clienteId);
    if (preset === "trial_expirado") {
      await db
        .from("registros_entrada")
        .insert({ cliente_id: clienteId, gimnasio_id: cli.gimnasio_id });
    }
  }

  await registrarAccionAdmin(admin.id, "forzar_estado_socio", cli.gimnasio_id, {
    cliente_id: clienteId,
    preset,
  });
  revalidatePath(`/admin/gimnasios/${cli.gimnasio_id}`);
  return {
    ok: true,
    msg: "Estado forzado. Los avisos push salen en la próxima corrida del cron.",
  };
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

// Convierte un gimnasio genérico precargado (slug "dispN", ver
// scripts/seed.mjs) en el gimnasio real de un dueño que firmó en el momento:
// pisa nombre del gym, DNI y nombre del dueño (y clave, derivada del DNI
// nuevo). El slug de login se mantiene salvo que se pase uno nuevo.
export async function activarGimnasioDisponible(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const nombreGym = String(formData.get("nombre_gym") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const nombreDueno = String(formData.get("nombre_dueno") ?? "").trim();
  const nuevoSlugRaw = String(formData.get("nuevo_slug") ?? "")
    .trim()
    .toLowerCase();

  if (!gimnasioId || !nombreGym || !dni || !nombreDueno) {
    return { ok: false, msg: "Completá nombre del gym, DNI y nombre del dueño." };
  }
  if (!/^\d{6,}$/.test(dni)) {
    return { ok: false, msg: "El DNI debe ser numérico (mínimo 6 dígitos)." };
  }

  const db = createAdminClient();

  const { data: gym } = await db
    .from("gimnasios")
    .select("id, slug")
    .eq("id", gimnasioId)
    .single();
  if (!gym) return { ok: false, msg: "No se encontró el gimnasio." };

  const { data: dueno } = await db
    .from("profiles")
    .select("id")
    .eq("gimnasio_id", gym.id)
    .eq("rol", "dueno")
    .maybeSingle();
  if (!dueno) {
    return { ok: false, msg: "No se encontró el dueño de ese gimnasio." };
  }

  const slugFinal = (nuevoSlugRaw || gym.slug || "").toLowerCase();
  const email = `${dni.toLowerCase()}@${slugFinal}.gym.local`;
  const password = `gym${dni.replace(/\D/g, "").slice(-4)}`;

  const { error: authErr } = await db.auth.admin.updateUserById(dueno.id, {
    email,
    password,
    email_confirm: true,
  });
  if (authErr) return { ok: false, msg: authErr.message };

  const { error: profErr } = await db
    .from("profiles")
    .update({ dni, nombre: nombreDueno, debe_cambiar_clave: true })
    .eq("id", dueno.id);
  if (profErr) return { ok: false, msg: profErr.message };

  const gymUpdate: { nombre: string; slug?: string } = { nombre: nombreGym };
  if (nuevoSlugRaw) gymUpdate.slug = slugFinal;
  const { error: gymUpdErr } = await db
    .from("gimnasios")
    .update(gymUpdate)
    .eq("id", gym.id);
  if (gymUpdErr) return { ok: false, msg: gymUpdErr.message };

  await registrarAccionAdmin(admin.id, "activar_gimnasio_disponible", gym.id, {
    nombre_gym: nombreGym,
    slug: slugFinal,
  });

  revalidatePath("/admin/gimnasios");
  return {
    ok: true,
    msg: `Activado. Login → gimnasio: ${slugFinal} · DNI: ${dni} · clave: ${password}`,
  };
}
