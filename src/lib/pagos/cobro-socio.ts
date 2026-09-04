import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Lógica compartida entre el pago manual (el dueño lo carga en
// /panel/clientes/[id]) y el cobro automático por Mercado Pago (webhook).
// Todo se hace con service_role: el webhook no tiene sesión.

/** Nombre del plan de plataforma que habilita el cobro automático. */
export const PLAN_COBRO_AUTOMATICO = "Elite";

export function sumarDias(fecha: Date, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Si el socio todavía tiene días, la cuota nueva se suma sobre el vencimiento;
 * si ya venció, arranca hoy. `fechaManual` (sólo flujo del dueño) pisa todo.
 */
export async function calcularCubreHasta(
  db: SupabaseClient,
  clienteId: string,
  duracionDias: number,
  fechaManual?: string | null,
): Promise<string> {
  if (fechaManual) return fechaManual;
  const { data: cli } = await db
    .from("clientes")
    .select("fecha_vencimiento")
    .eq("id", clienteId)
    .maybeSingle();
  const base =
    cli?.fecha_vencimiento && new Date(cli.fecha_vencimiento) > new Date()
      ? new Date(cli.fecha_vencimiento)
      : new Date();
  return sumarDias(base, duracionDias);
}

/** Deja al socio con la cuota al día hasta `cubreHasta`. */
export async function aplicarCuotaAlDia(
  db: SupabaseClient,
  clienteId: string,
  planId: string | null,
  cubreHasta: string,
): Promise<{ ok: boolean; msg?: string }> {
  const { error } = await db
    .from("clientes")
    .update({
      ...(planId ? { plan_id: planId } : {}),
      fecha_vencimiento: cubreHasta,
      estado_cuota: "al_dia",
      acceso_habilitado: true,
      en_prueba: false,
      ultimo_aviso_morosidad_enviado_en: null,
    })
    .eq("id", clienteId);
  return error ? { ok: false, msg: error.message } : { ok: true };
}

// ------------------------------------------------------ gate del feature ---

export type EstadoCobroAutomatico = {
  /** El gimnasio está en Elite (plan vigente). */
  elite: boolean;
  /** Hay una cuenta de Mercado Pago vinculada. */
  vinculado: boolean;
  /** elite && vinculado: recién ahí se le ofrece pagar al socio. */
  activo: boolean;
  vinculadoAt: string | null;
  collectorId: string | null;
};

/**
 * Gate calculado en el momento, sin columna `activo`: si el gimnasio baja de
 * Elite el cobro automático se apaga solo, y si vuelve a Elite se reactiva
 * porque el token nunca se borró.
 */
export async function estadoCobroAutomatico(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<EstadoCobroAutomatico> {
  const { data } = await db
    .from("gimnasios")
    .select(
      "estado, plan_plataforma_vence_el, mp_access_token, mp_vinculado_at, mp_collector_id, plan:planes_plataforma(nombre)",
    )
    .eq("id", gimnasioId)
    .maybeSingle();

  const plan = (data as { plan?: { nombre?: string } | null } | null)?.plan;
  const vence = data?.plan_plataforma_vence_el
    ? new Date(data.plan_plataforma_vence_el as string)
    : null;
  const vigente = !vence || vence >= new Date();

  const elite =
    plan?.nombre === PLAN_COBRO_AUTOMATICO &&
    vigente &&
    data?.estado !== "solo_lectura";
  const vinculado = Boolean(data?.mp_access_token);

  return {
    elite,
    vinculado,
    activo: elite && vinculado,
    vinculadoAt: (data?.mp_vinculado_at as string | null) ?? null,
    collectorId: (data?.mp_collector_id as string | null) ?? null,
  };
}

// --------------------------------------------- confirmación desde el hook --

export type ResultadoConfirmacion = {
  ok: boolean;
  yaProcesado?: boolean;
  msg?: string;
};

/**
 * Confirma un pago que estaba `pendiente` (creado al mandar al socio al
 * checkout) y le renueva la cuota. Idempotente: si ya está confirmado
 * devuelve `yaProcesado`.
 */
export async function confirmarPagoSocio(
  db: SupabaseClient,
  pagoId: string,
  proveedorRef: string | null,
): Promise<ResultadoConfirmacion> {
  const { data: pago } = await db
    .from("pagos")
    .select("id, cliente_id, plan_id, estado, gimnasio_id")
    .eq("id", pagoId)
    .maybeSingle();
  if (!pago) return { ok: false, msg: "Pago no encontrado." };
  if (pago.estado === "confirmado") return { ok: true, yaProcesado: true };

  let duracion = 30;
  if (pago.plan_id) {
    const { data: plan } = await db
      .from("planes")
      .select("duracion_dias")
      .eq("id", pago.plan_id)
      .maybeSingle();
    if (plan?.duracion_dias) duracion = Number(plan.duracion_dias);
  }

  const cubreHasta = await calcularCubreHasta(db, pago.cliente_id, duracion);

  const { error: updPago } = await db
    .from("pagos")
    .update({
      estado: "confirmado",
      cubre_hasta: cubreHasta,
      fecha_pago: new Date().toISOString().slice(0, 10),
      ...(proveedorRef ? { proveedor_ref: proveedorRef } : {}),
    })
    .eq("id", pagoId)
    .eq("estado", "pendiente");
  if (updPago) return { ok: false, msg: updPago.message };

  const r = await aplicarCuotaAlDia(db, pago.cliente_id, pago.plan_id, cubreHasta);
  if (!r.ok) return { ok: false, msg: r.msg };

  return { ok: true };
}

/** Marca el pago como rechazado (el socio abandonó o MP lo rechazó). */
export async function rechazarPagoSocio(
  db: SupabaseClient,
  pagoId: string,
  proveedorRef: string | null,
): Promise<void> {
  await db
    .from("pagos")
    .update({
      estado: "rechazado",
      ...(proveedorRef ? { proveedor_ref: proveedorRef } : {}),
    })
    .eq("id", pagoId)
    .eq("estado", "pendiente");
}
