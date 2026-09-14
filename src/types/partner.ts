// Tipos del programa SysGym Partner (referidos B2B) + gating de plan
// gratuito. Ver supabase/migrations/0044_partners_program.sql.

export type EstadoPartner = "activo" | "suspendido";

export type Partner = {
  id: string;
  user_id: string;
  nombre: string;
  email: string | null;
  referral_code: string;
  cbu_cvu: string | null;
  alias_mp: string | null;
  estado: EstadoPartner;
  creado_at: string;
  datos_cobro_actualizados_at: string | null;
  override_commission_pct: number | null;
};

export type DatosCobroPartner = {
  cbu_cvu: string | null;
  alias_mp: string | null;
};

export type PartnerCommission = {
  id: string;
  partner_id: string;
  gimnasio_id: string;
  pago_plataforma_id: string;
  monto_base_ars: number;
  porcentaje: number;
  monto_comision_ars: number;
  periodo: string; // 'YYYY-MM'
  creado_at: string;
  estado: "pendiente" | "aprobada" | "revertida";
  disponible_desde: string;
  revertida_at: string | null;
};

export type MilestoneNumero = 5 | 10 | 15;

/** Fila de la tabla partner_tiers (rangos configurables de comisión + bono).
 * Es la ÚNICA fuente de verdad para porcentajes y montos — no hay
 * constantes de respaldo en el código a propósito: si esta tabla no se
 * puede leer, el dashboard debe mostrar un error, nunca un número inventado. */
export type PartnerTier = {
  id: number;
  name: string;
  min_active_gyms: number;
  commission_pct: number;
  milestone_bonus_amount: number;
};

export type RangoPartnerId = "starter" | "pro" | "elite" | "black";

export type RangoPartnerInfo = {
  id: RangoPartnerId;
  nombre: string;
  badge: string;
  color: string;
  /** Texto armado en base al tier real de la DB (ver calcularRangoPartner). */
  beneficio: string;
};

// Identidad visual del rango (nombre/badge/color) — no lleva montos. Los
// montos y porcentajes siempre salen del tier de partner_tiers que matchea.
const IDENTIDAD_RANGO: Record<RangoPartnerId, Omit<RangoPartnerInfo, "beneficio">> = {
  starter: { id: "starter", nombre: "Partner Starter", badge: "🥉 Nivel 1", color: "#a1a1aa" },
  pro: { id: "pro", nombre: "Partner Pro", badge: "🥈 Nivel 2", color: "#38bdf8" },
  elite: { id: "elite", nombre: "Partner Elite", badge: "🥇 Nivel 3", color: "#fbbf24" },
  black: { id: "black", nombre: "Embajador Black", badge: "💎 Nivel Máximo", color: "#10e7a0" },
};

const NOMBRE_TIER_A_RANGO: Record<string, RangoPartnerId> = {
  Starter: "starter",
  Pro: "pro",
  Elite: "elite",
  Black: "black",
};

/**
 * Rango visual (badge/color/beneficio) según la cantidad de gimnasios
 * pago-activos, calculado 100% a partir de `tiers` (partner_tiers desde la
 * DB) — sin números de respaldo en el código. Si `tiers` viene vacío, el
 * caller (dashboard) ya debió haber cortado antes con un estado de error.
 */
export function calcularRangoPartner(
  gymsPagos: number,
  tiers: PartnerTier[],
): RangoPartnerInfo {
  const ordenados = [...tiers].sort((a, b) => b.min_active_gyms - a.min_active_gyms);
  const alcanzado = ordenados.find((t) => gymsPagos >= t.min_active_gyms) ?? ordenados[ordenados.length - 1];
  const id = alcanzado ? NOMBRE_TIER_A_RANGO[alcanzado.name] ?? "starter" : "starter";
  const identidad = IDENTIDAD_RANGO[id];

  const beneficio = !alcanzado
    ? ""
    : Number(alcanzado.milestone_bonus_amount) > 0
    ? `Bono de $${(Number(alcanzado.milestone_bonus_amount) / 1000).toLocaleString("es-AR")}k cobrado al llegar a ${alcanzado.min_active_gyms} gyms`
    : `Comisión del ${alcanzado.commission_pct}% en tus primeros gimnasios`;

  return { ...identidad, beneficio };
}

export type EstadoPayout = "pendiente" | "pagado" | "rechazado" | "cancelado";

export type PartnerPayout = {
  id: string;
  partner_id: string;
  monto_ars: number;
  estado: EstadoPayout;
  destino_snapshot: DatosCobroPartner;
  nota: string | null;
  solicitado_at: string;
  procesado_at: string | null;
};

export const RETIRO_MINIMO_ARS = 10000;

export type GimnasioReferidoDetalle = {
  id: string;
  nombre: string;
  creado_at: string;
  alumnosActivos: number;
  esPagoActivo: boolean;
  planNombre: string;
};

export type TipoNotificacionPartner =
  | "nuevo_registro"
  | "gimnasio_pago"
  | "bono_alcanzado"
  | "retiro_pagado";

export type PartnerNotification = {
  id: string;
  partner_id: string;
  tipo: TipoNotificacionPartner;
  titulo: string;
  mensaje: string;
  leido: boolean;
  metadata?: Record<string, unknown>;
  creado_at: string;
};

/** Resumen para el dashboard del partner (`/panel/partner` o similar). */
export type ResumenPartner = {
  partner: Partner;
  balanceDisponible: number;
  gimnasiosReferidos: number;
  gimnasiosPagoActivos: number;
  comisionesUltimos30d: number;
  hitosAlcanzados: MilestoneNumero[];
  proximoHito: { milestone: MilestoneNumero; faltan: number } | null;
  gimnasiosDetalle: GimnasioReferidoDetalle[];
  notificaciones?: PartnerNotification[];
  /** Rangos configurables desde partner_tiers (comisión + bono por hito). */
  tiers: PartnerTier[];
};

// ── Gating de plan gratuito (cap de 40 alumnos) ─────────────────────────

export const LIMITE_ALUMNOS_GRATIS = 40;

export const LIMIT_EXCEEDED_UPGRADE_REQUIRED = "LIMIT_EXCEEDED_UPGRADE_REQUIRED" as const;

