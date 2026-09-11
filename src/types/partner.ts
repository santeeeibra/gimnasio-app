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
};

export type MilestoneNumero = 5 | 10;

export const BONOS_HITO: Record<MilestoneNumero, number> = {
  5: 30000,
  10: 80000,
};

export type PartnerMilestoneAward = {
  id: string;
  partner_id: string;
  milestone: MilestoneNumero;
  bono_ars: number;
  gyms_pagos_al_momento: number;
  creado_at: string;
};

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

/** Resumen para el dashboard del partner (`/panel/partner` o similar). */
export type ResumenPartner = {
  partner: Partner;
  balanceDisponible: number;
  gimnasiosReferidos: number;
  gimnasiosPagoActivos: number;
  comisionesUltimos30d: number;
  hitosAlcanzados: MilestoneNumero[];
  proximoHito: { milestone: MilestoneNumero; faltan: number } | null;
};

// ── Gating de plan gratuito (cap de 40 alumnos) ─────────────────────────

export const LIMITE_ALUMNOS_GRATIS = 40;

export const LIMIT_EXCEEDED_UPGRADE_REQUIRED = "LIMIT_EXCEEDED_UPGRADE_REQUIRED" as const;

export type CupoGratuitoInfo = {
  /** true si el gimnasio tiene un plan de plataforma asignado (Básico/Pro/Elite/...):
   * en ese caso este cap no aplica, rige cupoSocios() por el max_socios del plan. */
  tienePlanAsignado: boolean;
  usados: number;
  max: typeof LIMITE_ALUMNOS_GRATIS;
  restantes: number;
  canAddMember: boolean;
};

export type ResultadoOperacionConLimite<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: typeof LIMIT_EXCEEDED_UPGRADE_REQUIRED; message: string };
