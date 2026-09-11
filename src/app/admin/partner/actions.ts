"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";

function limpiarSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Crea un gimnasio de simulación con prefijo obligatorio (SIM_ o DEMO_)
 * y lo vincula al partner elegido para disparar el flujo de referidos.
 */
export async function crearGimnasioSimuladoAction(formData: FormData): Promise<{
  ok: boolean;
  msg: string;
  gym?: { id: string; nombre: string; slug: string };
}> {
  const adminProfile = await requireSuperadmin();
  const db = createAdminClient();

  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const partnerCodigoRaw = String(formData.get("partner_codigo") ?? "").trim();
  const nombreRaw = String(formData.get("nombre") ?? "").trim();
  const prefijoRaw = String(formData.get("prefijo") ?? "SIM_").trim().toUpperCase();

  const prefijoValido = prefijoRaw === "DEMO_" ? "DEMO_" : "SIM_";

  if (!nombreRaw) {
    return { ok: false, msg: "El nombre del gimnasio de prueba es obligatorio." };
  }

  // Forzar prefijo en nombre
  const tienePrefijo =
    nombreRaw.toUpperCase().startsWith("SIM_") ||
    nombreRaw.toUpperCase().startsWith("DEMO_");
  const nombreFinal = tienePrefijo
    ? nombreRaw
    : `${prefijoValido}${nombreRaw}`;

  // Resolver partner id
  let partnerReferidorId: string | null = partnerId || null;
  let partnerReferidorCodigo: string | null = null;
  let partnerReferidorNombre: string | null = null;

  if (!partnerReferidorId && partnerCodigoRaw) {
    const { data: pFound } = await db
      .from("partners")
      .select("id, referral_code, nombre")
      .eq("referral_code", partnerCodigoRaw.toLowerCase())
      .maybeSingle();

    if (pFound) {
      partnerReferidorId = pFound.id;
      partnerReferidorCodigo = pFound.referral_code;
      partnerReferidorNombre = pFound.nombre;
    }
  } else if (partnerReferidorId) {
    const { data: pFound } = await db
      .from("partners")
      .select("referral_code, nombre")
      .eq("id", partnerReferidorId)
      .maybeSingle();
    if (pFound) {
      partnerReferidorCodigo = pFound.referral_code;
      partnerReferidorNombre = pFound.nombre;
    }
  }

  // Generar slug con prefijo obligatorio sim- o demo-
  const baseSlugPrefix = prefijoValido === "DEMO_" ? "demo-" : "sim-";
  let slugLimpio = limpiarSlug(nombreFinal);
  if (!slugLimpio.startsWith("sim-") && !slugLimpio.startsWith("demo-")) {
    slugLimpio = `${baseSlugPrefix}${slugLimpio}`;
  }

  // Evitar colisiones de slug agregando sufijo numérico
  const { data: slugExistente } = await db
    .from("gimnasios")
    .select("id")
    .eq("slug", slugLimpio)
    .maybeSingle();

  if (slugExistente) {
    slugLimpio = `${slugLimpio}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const { data: gymCreado, error: errGym } = await db
    .from("gimnasios")
    .insert({
      nombre: nombreFinal,
      slug: slugLimpio,
      estado: "prueba",
      referred_by_partner_id: partnerReferidorId,
    })
    .select("id, nombre, slug, referred_by_partner_id")
    .single();

  if (errGym || !gymCreado) {
    return { ok: false, msg: `Error al insertar gimnasio simulado: ${errGym?.message ?? "desconocido"}` };
  }

  // Disparar notificación al partner si aplica (idéntico al flujo de registro real)
  if (partnerReferidorId) {
    try {
      await db.from("partner_notifications").insert({
        partner_id: partnerReferidorId,
        tipo: "nuevo_registro",
        titulo: "¡Nuevo gimnasio adherido con tu código! (Simulación)",
        mensaje: `El gimnasio de prueba "${nombreFinal}" se registró con tu código (${partnerReferidorCodigo ?? "partner"}).`,
        metadata: {
          gimnasio_id: gymCreado.id,
          nombre_gimnasio: nombreFinal,
          simulacion: true,
        },
      });
    } catch (e) {
      console.error("[crearGimnasioSimuladoAction] Error notif partner:", e);
    }
  }

  await registrarAccionAdmin(adminProfile.id, "crear_gimnasio_simulado", gymCreado.id, {
    nombre: gymCreado.nombre,
    slug: gymCreado.slug,
    partnerId: partnerReferidorId,
    partnerCodigo: partnerReferidorCodigo,
  });

  revalidatePath("/admin/partner");
  revalidatePath("/admin/gimnasios");
  revalidatePath("/admin");

  return {
    ok: true,
    msg: `Gimnasio simulado "${gymCreado.nombre}" creado exitosamente.${
      partnerReferidorNombre ? ` Vinculado a partner ${partnerReferidorNombre}.` : ""
    }`,
    gym: {
      id: gymCreado.id,
      nombre: gymCreado.nombre,
      slug: gymCreado.slug,
    },
  };
}

/**
 * Simula la aprobación de un pago sobre un gimnasio de prueba (SIM_ o DEMO_).
 * Inserta el registro en pagos_plataforma y lo pasa a 'aprobado',
 * disparando automáticamente los triggers de comisión, hitos y notificaciones en Postgres.
 */
export async function simularPagoAprobadoAction(formData: FormData): Promise<{
  ok: boolean;
  msg: string;
  pagoId?: string;
  comisionGenerada?: number;
}> {
  const adminProfile = await requireSuperadmin();
  const db = createAdminClient();

  const gimnasioId = String(formData.get("gimnasio_id") ?? "").trim();
  const montoRaw = Number(formData.get("monto_ars") ?? 25000);
  const monto = Number.isFinite(montoRaw) && montoRaw > 0 ? montoRaw : 25000;

  if (!gimnasioId) {
    return { ok: false, msg: "Seleccioná un gimnasio de simulación." };
  }

  // 1. Verificación dura de seguridad: Solo operar sobre gimnasios SIM_ o DEMO_
  const { data: gym, error: gymErr } = await db
    .from("gimnasios")
    .select("id, nombre, slug, referred_by_partner_id")
    .eq("id", gimnasioId)
    .single();

  if (gymErr || !gym) {
    return { ok: false, msg: "Gimnasio no encontrado." };
  }

  const esSimulado =
    gym.nombre.toUpperCase().startsWith("SIM_") ||
    gym.nombre.toUpperCase().startsWith("DEMO_") ||
    gym.slug.toLowerCase().startsWith("sim-") ||
    gym.slug.toLowerCase().startsWith("demo-");

  if (!esSimulado) {
    return {
      ok: false,
      msg: "SEGURIDAD: Solo se pueden simular pagos sobre gimnasios de prueba con prefijo SIM_ o DEMO_. Acción abortada.",
    };
  }

  // 2. Insertar pago pendiente
  const { data: pagoPendiente, error: insErr } = await db
    .from("pagos_plataforma")
    .insert({
      gimnasio_id: gym.id,
      monto_ars: monto,
      dias: 30,
      estado: "pendiente",
      tipo: "plan_mensual",
      proveedor: "manual",
    })
    .select("id")
    .single();

  if (insErr || !pagoPendiente) {
    return { ok: false, msg: `Error al crear pago pendiente: ${insErr?.message ?? "desconocido"}` };
  }

  // 3. Aprobar pago (esto dispara en Postgres: trg_procesar_comision_partner() y trg_notificar_partner_comision())
  const { error: updErr } = await db
    .from("pagos_plataforma")
    .update({
      estado: "aprobado",
      confirmado_at: new Date().toISOString(),
    })
    .eq("id", pagoPendiente.id)
    .eq("estado", "pendiente");

  if (updErr) {
    return { ok: false, msg: `Error al aprobar pago simulado: ${updErr.message}` };
  }

  // 4. Leer la comisión que generó el trigger para mostrarla en UI
  const { data: comision } = await db
    .from("partner_commissions")
    .select("monto_comision_ars, porcentaje")
    .eq("pago_plataforma_id", pagoPendiente.id)
    .maybeSingle();

  await registrarAccionAdmin(adminProfile.id, "simular_pago_aprobado", gym.id, {
    pagoId: pagoPendiente.id,
    monto,
    gimnasioNombre: gym.nombre,
    referredByPartnerId: gym.referred_by_partner_id,
    comisionGenerada: comision?.monto_comision_ars ?? 0,
  });

  revalidatePath("/admin/partner");
  revalidatePath("/admin/gimnasios");
  revalidatePath("/admin");

  return {
    ok: true,
    msg: `Pago de $${monto.toLocaleString("es-AR")} aprobado sobre ${gym.nombre}.${
      comision
        ? ` Trigger generó comisión de $${Number(comision.monto_comision_ars).toLocaleString("es-AR")} (${comision.porcentaje}%).`
        : gym.referred_by_partner_id
          ? " (Trigger procesó la comisión)."
          : " (Gimnasio sin partner referidor)."
    }`,
    pagoId: pagoPendiente.id,
    comisionGenerada: comision ? Number(comision.monto_comision_ars) : undefined,
  };
}

/**
 * Borra de forma limpia y explícita todos los gimnasios que tengan el prefijo SIM_ o DEMO_
 * junto con sus pagos, clientes, perfiles, comisiones y notificaciones asociadas.
 */
export async function borrarDatosSimulacionAction(): Promise<{
  ok: boolean;
  msg: string;
  borrados?: {
    gimnasios: number;
    pagos: number;
    clientes: number;
    profiles: number;
    comisiones: number;
    notificaciones: number;
  };
}> {
  const adminProfile = await requireSuperadmin();
  const db = createAdminClient();

  // Buscar todos los gimnasios con prefijo SIM_ o DEMO_
  const { data: gymsSimulados, error: searchErr } = await db
    .from("gimnasios")
    .select("id, nombre, slug")
    .or("nombre.ilike.SIM_%,nombre.ilike.DEMO_%,slug.ilike.sim-%,slug.ilike.demo-%");

  if (searchErr) {
    return { ok: false, msg: `Error al buscar gimnasios de prueba: ${searchErr.message}` };
  }

  if (!gymsSimulados || gymsSimulados.length === 0) {
    return {
      ok: true,
      msg: "No se encontraron gimnasios de simulación activos para borrar.",
      borrados: {
        gimnasios: 0,
        pagos: 0,
        clientes: 0,
        profiles: 0,
        comisiones: 0,
        notificaciones: 0,
      },
    };
  }

  const gymIds = gymsSimulados.map((g) => g.id);

  // 1. Borrar pagos de plataforma asociados
  const { count: pagosBorrados } = await db
    .from("pagos_plataforma")
    .delete({ count: "exact" })
    .in("gimnasio_id", gymIds);

  // 2. Borrar clientes de gimnasios de prueba
  const { count: clientesBorrados } = await db
    .from("clientes")
    .delete({ count: "exact" })
    .in("gimnasio_id", gymIds);

  // 3. Borrar perfiles asociados a esos gimnasios
  const { count: profilesBorrados } = await db
    .from("profiles")
    .delete({ count: "exact" })
    .in("gimnasio_id", gymIds);

  // 4. Borrar comisiones asociadas a esos gimnasios
  const { count: comisionesBorradas } = await db
    .from("partner_commissions")
    .delete({ count: "exact" })
    .in("gimnasio_id", gymIds);

  // 5. Borrar notificaciones asociadas a esos gimnasios
  // Buscamos notificaciones con metadata->>'gimnasio_id' en gymIds
  let notifsBorradasTotal = 0;
  for (const gid of gymIds) {
    const { count } = await db
      .from("partner_notifications")
      .delete({ count: "exact" })
      .contains("metadata", { gimnasio_id: gid });
    notifsBorradasTotal += count ?? 0;
  }

  // 6. Finalmente borrar los gimnasios
  const { count: gymsBorrados, error: delGymErr } = await db
    .from("gimnasios")
    .delete({ count: "exact" })
    .in("id", gymIds);

  if (delGymErr) {
    return { ok: false, msg: `Error al eliminar gimnasios: ${delGymErr.message}` };
  }

  await registrarAccionAdmin(adminProfile.id, "borrar_simulacion_e2e", "batch", {
    cantidadGimnasios: gymsBorrados ?? gymIds.length,
    gymIds,
    pagos: pagosBorrados ?? 0,
    clientes: clientesBorrados ?? 0,
  });

  revalidatePath("/admin/partner");
  revalidatePath("/admin/gimnasios");
  revalidatePath("/admin");

  return {
    ok: true,
    msg: `Limpieza completada: se borraron ${gymsBorrados ?? 0} gimnasio(s) de prueba y todos sus datos asociados.`,
    borrados: {
      gimnasios: gymsBorrados ?? 0,
      pagos: pagosBorrados ?? 0,
      clientes: clientesBorrados ?? 0,
      profiles: profilesBorrados ?? 0,
      comisiones: comisionesBorradas ?? 0,
      notificaciones: notifsBorradasTotal,
    },
  };
}
