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

// Valores por defecto usados solo como fallback si por algún motivo no se
// pudo leer partner_tiers (ver lib/plataforma/partner-tiers.ts). La fuente
// de verdad real vive en la tabla partner_tiers (editable sin deploy).
export const COMISION_ARRANQUE_PCT = 20; // Primeros 5 gimnasios (fast-start)
export const COMISION_ESTANDAR_PCT = 15; // A partir del 6to gimnasio

export type MilestoneNumero = 5 | 10 | 15;

export const BONOS_HITO: Record<MilestoneNumero, number> = {
  5: 20000,
  10: 60000,
  15: 100000,
};

/** Fila de la tabla partner_tiers (rangos configurables de comisión + bono). */
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
  beneficio: string;
};

export const RANGOS_PARTNER: Record<RangoPartnerId, RangoPartnerInfo> = {
  starter: {
    id: "starter",
    nombre: "Partner Starter",
    badge: "🥉 Nivel 1",
    color: "#a1a1aa",
    beneficio: "Bono de Arranque del 20% en tus primeros 5 gyms",
  },
  pro: {
    id: "pro",
    nombre: "Partner Pro",
    badge: "🥈 Nivel 2",
    color: "#38bdf8",
    beneficio: "Bono de $20k cobrado + Acceso a Kit de Difusión",
  },
  elite: {
    id: "elite",
    nombre: "Partner Elite",
    badge: "🥇 Nivel 3",
    color: "#fbbf24",
    beneficio: "Bono de $60k cobrado + Merch Oficial SysGym",
  },
  black: {
    id: "black",
    nombre: "Embajador Black",
    badge: "💎 Nivel Máximo",
    color: "#10e7a0",
    beneficio: "Bono de $100k cobrado + Llamada VIP con Fundador",
  },
};

/**
 * Rango visual (badge/color) según la cantidad de gimnasios pago-activos.
 * Si se pasan `tiers` (partner_tiers desde DB), el corte de cada rango sale
 * de ahí en vez de los números fijos 5/10/15 — así un cambio en la tabla se
 * refleja acá sin tocar código. Sin `tiers`, cae al fallback hardcodeado.
 */
export function calcularRangoPartner(
  gymsPagos: number,
  tiers?: PartnerTier[],
): RangoPartnerInfo {
  if (!tiers || tiers.length === 0) {
    if (gymsPagos >= 15) return RANGOS_PARTNER.black;
    if (gymsPagos >= 10) return RANGOS_PARTNER.elite;
    if (gymsPagos >= 5) return RANGOS_PARTNER.pro;
    return RANGOS_PARTNER.starter;
  }

  const ordenados = [...tiers].sort((a, b) => b.min_active_gyms - a.min_active_gyms);
  const alcanzado = ordenados.find((t) => gymsPagos >= t.min_active_gyms);
  const nombreANivel: Record<string, RangoPartnerId> = {
    Starter: "starter",
    Pro: "pro",
    Elite: "elite",
    Black: "black",
  };
  const id = alcanzado ? nombreANivel[alcanzado.name] ?? "starter" : "starter";
  return RANGOS_PARTNER[id];
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

