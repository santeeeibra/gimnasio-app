"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin, claveInicial, dniAEmail } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { registrarAccionAdmin } from "@/lib/admin/audit";

// Las APIs de Auth de Supabase (updateUserById / deleteUser) no tienen versión
// batch: hay que llamarlas una vez por usuario. Al menos no las hacemos en
// serie — tandas cortas para no pasarnos del rate limit de Auth.
const TANDA = 10;
async function enTandas<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const salida: R[] = [];
  for (let i = 0; i < items.length; i += TANDA) {
    salida.push(...(await Promise.all(items.slice(i, i + TANDA).map(fn))));
  }
  return salida;
}
import { aprobarPagoPlataforma } from "@/lib/plataforma/aprobar-pago";
import { rechazarPagoPlataforma as ejecutarRechazoPagoPlataforma } from "@/lib/plataforma/rechazar-pago";

const ESTADOS = ["prueba", "activo", "solo_lectura", "suspendido"] as const;
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
  revalidatePath("/admin/gimnasios");
  return { ok: true, msg: `Estado cambiado a "${estado}".` };
}

// Nota interna del superadmin sobre un gimnasio. Solo se lee/escribe desde
// /admin (service_role); el dueño nunca la ve. Superadmin, auditado.
export async function actualizarNotaInterna(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const notaRaw = String(formData.get("nota_interna") ?? "").trim();
  if (!gimnasioId) return { ok: false, msg: "Falta el gimnasio." };
  const nota = notaRaw.slice(0, 1000) || null;

  const db = createAdminClient();
  const { error } = await db
    .from("gimnasios")
    .update({ nota_interna: nota })
    .eq("id", gimnasioId);
  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "actualizar_nota_interna", gimnasioId, {
    tiene_nota: nota != null,
  });
  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  revalidatePath("/admin/gimnasios");
  return { ok: true, msg: nota ? "Nota guardada." : "Nota borrada." };
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

    const { error: errBorrar } = await db
      .from("registros_entrada")
      .delete()
      .eq("cliente_id", clienteId);
    if (errBorrar) return { ok: false, msg: errBorrar.message };
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
    .select("id, slug, plan_plataforma_id")
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

  let planId = gym.plan_plataforma_id;
  if (!planId) {
    const { data: planBasico } = await db
      .from("planes_plataforma")
      .select("id")
      .eq("nombre", "Básico")
      .maybeSingle();
    if (planBasico) planId = planBasico.id;
  }

  const gymUpdate: {
    nombre: string;
    slug?: string;
    plan_plataforma_id?: string;
  } = { nombre: nombreGym };
  if (planId) gymUpdate.plan_plataforma_id = planId;
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

// ── Switcher rápido de plan para testing (Cockpit Dev) ──
// Cambia al instante el plan de un gimnasio (por defecto "sante") a Básico, Pro o Elite.
export async function cambiarPlanRapido(
  planNombre: "Básico" | "Pro" | "Elite",
  gimnasioSlug: string = "sante",
): Promise<{ ok: boolean; msg: string; planActual?: string }> {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const { data: plan } = await db
    .from("planes_plataforma")
    .select("id, nombre")
    .eq("nombre", planNombre)
    .single();

  if (!plan) return { ok: false, msg: `Plan "${planNombre}" no encontrado.` };

  const { data: gym } = await db
    .from("gimnasios")
    .select("id, slug")
    .eq("slug", gimnasioSlug)
    .single();

  if (!gym) return { ok: false, msg: `Gimnasio "${gimnasioSlug}" no encontrado.` };

  // Vencimiento a 1 año en el futuro para que esté 100% vigente en pruebas
  const vence = new Date();
  vence.setFullYear(vence.getFullYear() + 1);
  const venceStr = vence.toISOString().split("T")[0];

  const { error } = await db
    .from("gimnasios")
    .update({
      plan_plataforma_id: plan.id,
      plan_plataforma_vence_el: venceStr,
      estado: "activo",
    })
    .eq("id", gym.id);

  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "asignar_plan_plataforma", gym.id, {
    plan: planNombre,
    vence_el: venceStr,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/gimnasios/${gym.id}`);
  revalidatePath("/panel");
  revalidatePath("/panel/ajustes");
  revalidatePath("/checkin");

  return {
    ok: true,
    msg: `Plan cambiado a "${planNombre}" exitosamente.`,
    planActual: planNombre,
  };
}

// ── Alta de un nuevo gimnasio desde /admin (Onboarding móvil) ──

export type ResultadoAltaGym = {
  ok: boolean;
  msg: string;
  credenciales?: {
    gimnasioId: string;
    nombre: string;
    slug: string;
    dni: string;
    nombreDueno: string;
    emailSintetico: string;
    passwordTemporal: string;
  };
};

export async function crearGimnasio(
  _prev: ResultadoAltaGym | null,
  formData: FormData,
): Promise<ResultadoAltaGym> {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const slug = rawSlug.replace(/[^a-z0-9_-]/g, "");
  const dni = String(formData.get("dni") ?? "").replace(/\D/g, "");
  const nombreDueno = String(formData.get("nombre_dueno") ?? "").trim();
  const emailRecuperacion = String(formData.get("email_recuperacion") ?? "").trim().toLowerCase();
  const planId = String(formData.get("plan_id") ?? "").trim();

  if (!nombre || !slug || !dni || !nombreDueno) {
    return { ok: false, msg: "Completá nombre, slug, DNI y nombre del dueño." };
  }

  if (dni.length < 6) {
    return { ok: false, msg: "El DNI ingresado no parece válido." };
  }

  // 1. Verificar si el slug ya existe
  const { data: gymExistente } = await db
    .from("gimnasios")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (gymExistente) {
    return { ok: false, msg: `El slug "${slug}" ya está en uso por otro gimnasio.` };
  }

  // 2. Obtener plan seleccionado o Básico
  let planElegidoId: string | null = planId || null;
  if (!planElegidoId) {
    const { data: planBasico } = await db
      .from("planes_plataforma")
      .select("id")
      .eq("nombre", "Básico")
      .maybeSingle();
    planElegidoId = planBasico?.id ?? null;
  }

  // 3. Crear el gimnasio
  const { data: gym, error: gymErr } = await db
    .from("gimnasios")
    .insert({
      nombre,
      slug,
      plan_plataforma_id: planElegidoId,
      estado: "activo",
    })
    .select()
    .single();

  if (gymErr || !gym) {
    return { ok: false, msg: `Error al crear gimnasio: ${gymErr?.message ?? "desconocido"}` };
  }

  // 4. Crear usuario en Auth con email sintético
  const emailSintetico = `${dni}@${slug}.gym.local`;
  const passwordTemporal = `gym${dni.slice(-4)}`;

  const { data: createdUser, error: authErr } = await db.auth.admin.createUser({
    email: emailSintetico,
    password: passwordTemporal,
    email_confirm: true,
  });

  if (authErr || !createdUser.user) {
    // Revertir creación de gimnasio si falla auth. Si el rollback también
    // falla queda un gimnasio huérfano y sin dueño: hay que decirlo.
    const { data: revertido, error: errRollback } = await db
      .from("gimnasios")
      .delete()
      .eq("id", gym.id)
      .select("id");
    const rollbackOk = !errRollback && (revertido?.length ?? 0) > 0;
    if (!rollbackOk) {
      console.error(
        `[admin] crearGimnasio: rollback fallido del gimnasio ${gym.id}`,
        errRollback?.message ?? "0 filas afectadas",
      );
    }
    return {
      ok: false,
      msg:
        `Error creando usuario en Auth: ${authErr?.message ?? "desconocido"}` +
        (rollbackOk
          ? ""
          : ` (además quedó el gimnasio ${gym.slug} sin dueño: borralo a mano)`),
    };
  }

  // 5. Crear perfil del dueño
  const { error: profErr } = await db.from("profiles").insert({
    id: createdUser.user.id,
    gimnasio_id: gym.id,
    rol: "dueno",
    dni,
    nombre: nombreDueno,
    debe_cambiar_clave: true,
    email_recuperacion: emailRecuperacion || null,
  });

  if (profErr) {
    return { ok: false, msg: `Error creando perfil: ${profErr.message}` };
  }

  // 6. Auditoría
  await registrarAccionAdmin(admin.id, "crear_gimnasio", gym.id, {
    nombre,
    slug,
    dni,
    nombreDueno,
    planId: planElegidoId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/gimnasios");

  return {
    ok: true,
    msg: `¡Gimnasio "${nombre}" dado de alta con éxito!`,
    credenciales: {
      gimnasioId: gym.id,
      nombre,
      slug,
      dni,
      nombreDueno,
      emailSintetico,
      passwordTemporal,
    },
  };
}

// ── Reseteo de Contraseñas (Dev / Soporte) ──

export async function resetearClaveUsuarioAction(params: {
  profileId: string;
  nuevaClave?: string;
}): Promise<{
  ok: boolean;
  msg: string;
  clave?: string;
  dni?: string;
  nombre?: string;
  email?: string;
  rol?: string;
  slug?: string;
}> {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .select("id, dni, nombre, rol, gimnasio_id, gimnasios:gimnasio_id(id, nombre, slug)")
    .eq("id", params.profileId)
    .single();

  if (pErr || !profile) {
    return { ok: false, msg: "Usuario no encontrado." };
  }

  const gym = profile.gimnasios as unknown as { id: string; nombre: string; slug: string } | null;
  const slug = gym?.slug ?? "gym";
  const email = dniAEmail(profile.dni, slug);
  const clave = params.nuevaClave?.trim() || claveInicial(profile.dni);

  const { error: authErr } = await db.auth.admin.updateUserById(profile.id, {
    password: clave,
    email,
  });

  if (authErr) {
    return { ok: false, msg: `Error en Auth: ${authErr.message}` };
  }

  await db
    .from("profiles")
    .update({ debe_cambiar_clave: true })
    .eq("id", profile.id);

  await registrarAccionAdmin(admin.id, "resetear_clave", gym?.id ?? null, {
    profileId: profile.id,
    nombre: profile.nombre,
    dni: profile.dni,
    rol: profile.rol,
    nuevaClave: clave,
  });

  revalidatePath("/admin");
  if (gym?.id) {
    revalidatePath(`/admin/gimnasios/${gym.id}`);
  }

  return {
    ok: true,
    msg: `Contraseña restablecida exitosamente para ${profile.nombre ?? profile.dni}.`,
    clave,
    dni: profile.dni,
    nombre: profile.nombre ?? undefined,
    email,
    rol: profile.rol,
    slug,
  };
}

export async function resetearClavesGimnasioAction(params: {
  gimnasioId: string;
  objetivo: "dueno" | "todos_socios";
  nuevaClave?: string;
}): Promise<{
  ok: boolean;
  msg: string;
  clave?: string;
  afectados?: number;
  duenoInfo?: { dni: string; nombre?: string; email: string; clave: string; slug: string };
}> {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const { data: gym } = await db
    .from("gimnasios")
    .select("id, nombre, slug")
    .eq("id", params.gimnasioId)
    .single();

  if (!gym) return { ok: false, msg: "Gimnasio no encontrado." };

  if (params.objetivo === "dueno") {
    const { data: dueno } = await db
      .from("profiles")
      .select("id, dni, nombre, rol")
      .eq("gimnasio_id", gym.id)
      .eq("rol", "dueno")
      .maybeSingle();

    if (!dueno) {
      return { ok: false, msg: "No se encontró perfil de dueño en este gimnasio." };
    }

    const clave = params.nuevaClave?.trim() || claveInicial(dueno.dni);
    const email = dniAEmail(dueno.dni, gym.slug);

    const { error: authErr } = await db.auth.admin.updateUserById(dueno.id, {
      password: clave,
      email,
    });
    if (authErr) return { ok: false, msg: authErr.message };

    await db
      .from("profiles")
      .update({ debe_cambiar_clave: true })
      .eq("id", dueno.id);

    await registrarAccionAdmin(admin.id, "resetear_clave", gym.id, {
      profileId: dueno.id,
      nombre: dueno.nombre,
      dni: dueno.dni,
      rol: "dueno",
      nuevaClave: clave,
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/gimnasios/${gym.id}`);

    return {
      ok: true,
      msg: `Contraseña del dueño restablecida con éxito.`,
      clave,
      duenoInfo: {
        dni: dueno.dni,
        nombre: dueno.nombre ?? undefined,
        email,
        clave,
        slug: gym.slug,
      },
    };
  }

  if (params.objetivo === "todos_socios") {
    const { data: socios } = await db
      .from("profiles")
      .select("id, dni, nombre")
      .eq("gimnasio_id", gym.id)
      .eq("rol", "cliente");

    if (!socios || socios.length === 0) {
      return { ok: false, msg: "No hay socios registrados en este gimnasio." };
    }

    // Antes: por cada socio, 1 llamada a Auth + 1 UPDATE secuencial. Ahora las
    // de Auth van en tandas y el UPDATE de profiles sale en una sola consulta.
    const resetados = await enTandas(socios, async (socio) => {
      const clave = params.nuevaClave?.trim() || claveInicial(socio.dni);
      const email = dniAEmail(socio.dni, gym.slug);
      const { error: authErr } = await db.auth.admin.updateUserById(socio.id, {
        password: clave,
        email,
      });
      return authErr ? null : socio.id;
    });

    const idsReseteados = resetados.filter((id): id is string => id !== null);
    let actualizados = 0;
    if (idsReseteados.length > 0) {
      const { data: marcados, error: errMarcar } = await db
        .from("profiles")
        .update({ debe_cambiar_clave: true })
        .in("id", idsReseteados)
        .select("id");
      if (errMarcar) {
        return {
          ok: false,
          msg: `Se cambiaron las claves pero no se pudo marcar el cambio obligatorio: ${errMarcar.message}`,
        };
      }
      actualizados = marcados?.length ?? 0;
    }

    await registrarAccionAdmin(admin.id, "resetear_clave", gym.id, {
      tipo: "todos_socios",
      afectados: actualizados,
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/gimnasios/${gym.id}`);

    return {
      ok: true,
      msg: `Se restablecieron las contraseñas de ${actualizados} socios a su clave inicial (gym<últimos 4 DNI>).`,
      afectados: actualizados,
    };
  }

  return { ok: false, msg: "Objetivo no válido." };
}

export async function obtenerUsuariosGimnasioDev(gimnasioId: string): Promise<{
  ok: boolean;
  dueno: { id: string; nombre: string | null; dni: string; slug: string } | null;
  socios: { id: string; nombre: string | null; dni: string; estado_cuota?: string | null }[];
}> {
  await requireSuperadmin();
  const db = createAdminClient();

  const { data: gym } = await db
    .from("gimnasios")
    .select("id, slug")
    .eq("id", gimnasioId)
    .single();

  if (!gym) return { ok: false, dueno: null, socios: [] };

  const [{ data: dueno }, { data: sociosRaw }] = await Promise.all([
    db
      .from("profiles")
      .select("id, nombre, dni")
      .eq("gimnasio_id", gimnasioId)
      .eq("rol", "dueno")
      .maybeSingle(),
    db
      .from("clientes")
      .select("id, estado_cuota, profile:profiles(id, nombre, dni)")
      .eq("gimnasio_id", gimnasioId)
      .order("creado_en", { ascending: false }),
  ]);

  const socios = (sociosRaw ?? [])
    .map((c: any) => ({
      id: c.profile?.id as string,
      nombre: c.profile?.nombre as string | null,
      dni: c.profile?.dni as string,
      estado_cuota: c.estado_cuota as string | null,
    }))
    .filter((s) => Boolean(s.id && s.dni));

  return {
    ok: true,
    dueno: dueno ? { ...dueno, slug: gym.slug } : null,
    socios,
  };
}

const BUCKET_LOGOS = "logos";

// Borrado DEFINITIVO de un gimnasio: auth.users de todos sus profiles +
// logo del bucket + la fila de gimnasios (cascada limpia todo lo que cuelga
// de gimnasio_id: clientes, planes, pagos_plataforma, registros_entrada,
// partner_commissions donde este gym fue el referido, etc.).
// Irreversible. Superadmin, service_role, auditado ANTES de borrar (si se
// audita después ya no queda gimnasio_id vivo para asociar el log).
export async function eliminarGimnasioDefinitivamente(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const slugConfirmado = String(formData.get("confirmar_slug") ?? "").trim();
  if (!gimnasioId) return { ok: false, msg: "Falta el gimnasio." };

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select("id, nombre, slug")
    .eq("id", gimnasioId)
    .maybeSingle();
  if (!gym) return { ok: false, msg: "El gimnasio ya no existe." };

  if (slugConfirmado !== gym.slug) {
    return {
      ok: false,
      msg: `Para confirmar, escribí exactamente "${gym.slug}".`,
    };
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id")
    .eq("gimnasio_id", gimnasioId);
  const profileIds = (profiles ?? []).map((p) => p.id as string);

  // Salvavidas: si alguno de los dueños/socios de este gym es también un
  // SysGym Partner (identidad global, independiente del gimnasio), borrar
  // su auth.users se llevaría por cascada TODO su historial de comisiones
  // y referidos de OTROS gimnasios. Se bloquea hasta resolver a mano.
  if (profileIds.length > 0) {
    const { data: partnersLigados } = await db
      .from("partners")
      .select("id, referral_code")
      .in("user_id", profileIds);
    if (partnersLigados && partnersLigados.length > 0) {
      const codigos = partnersLigados.map((p) => p.referral_code).join(", ");
      return {
        ok: false,
        msg:
          `No se puede borrar: el dueño (u otro perfil) de este gimnasio es un SysGym Partner ` +
          `activo (código ${codigos}) con historial de referidos propio. Reasigná o dale de baja ` +
          `esa cuenta de Partner antes de borrar el gimnasio.`,
      };
    }
  }

  // Auditar ANTES de borrar: después de este punto el gimnasio_id deja de
  // existir y el log quedaría huérfano (la FK de admin_audit_log es opcional
  // pero preferimos dejarlo asociado mientras se puede).
  await registrarAccionAdmin(admin.id, "eliminar_gimnasio_definitivo", gimnasioId, {
    nombre: gym.nombre,
    slug: gym.slug,
    cantidad_perfiles: profileIds.length,
  });

  // Logo del bucket: best-effort, no bloquea el borrado si falla.
  try {
    await db.storage.from(BUCKET_LOGOS).remove([`${gimnasioId}.webp`]);
  } catch {
    // noop
  }

  // Borra cada cuenta de auth para que no quede un usuario huérfano ocupando
  // el email sintético (dni@slug.gym.local) ni el cupo de Auth de Supabase.
  // Cascada: auth.users -> profiles -> clientes -> pagos/registro_progreso/...
  const fallosAuth = await enTandas(profileIds, async (profileId) => {
    const { error } = await db.auth.admin.deleteUser(profileId);
    return error ? `${profileId}: ${error.message}` : null;
  });
  const erroresAuth = fallosAuth.filter((e): e is string => e !== null);

  // La fila de gimnasios: cascada lo que no dependía de un profile_id
  // (planes, pagos_plataforma, registros_entrada, partner_commissions del
  // gym como referido, etc.) y cualquier profile/cliente residual.
  const { error: delErr } = await db.from("gimnasios").delete().eq("id", gimnasioId);
  if (delErr) {
    return {
      ok: false,
      msg:
        `Se borraron las cuentas de acceso pero la fila del gimnasio no pudo eliminarse: ${delErr.message}` +
        (erroresAuth.length ? ` (además fallaron ${erroresAuth.length} auth.users)` : ""),
    };
  }

  revalidatePath("/admin/gimnasios");
  redirect("/admin/gimnasios");
}

