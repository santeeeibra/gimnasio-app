// Precios de plataforma (lo que el gimnasio le paga a la plataforma) y reglas
// de descuento. Fuente única para el panel del dueño, la consola de soporte y
// la aprobación de pagos. Los precios de los PLANES mensuales viven en
// planes_plataforma (editables desde /admin/planes); acá van los cargos
// únicos y las constantes de la promo.

export type TipoPago = "plan_mensual" | "setup" | "premium";

export const TIPO_PAGO_LABEL: Record<TipoPago, string> = {
  plan_mensual: "Plan mensual",
  setup: "Setup de la app",
  premium: "Modelo Premium",
};

export const TIPO_PAGO_DESC: Record<TipoPago, string> = {
  plan_mensual: "Renueva tu plan por 30 días.",
  setup: "Carga de socios, diseño y logo de tu gimnasio dentro de la app. Pago único.",
  premium: "Tu logo / marca como pantalla de inicio animada al iniciar sesión. Pago único.",
};

/** Cargos únicos (no son suscripción). Montos en ARS. */
export const CARGO_SETUP_ARS = 35000;
export const CARGO_PREMIUM_ARS = 15000;

/**
 * Promo "setup gratis": el cargo de setup sale 100% off si el pago se hace
 * antes de esta fecha. Vigencia de un mes desde el lanzamiento de la promo;
 * actualizar esta fecha manualmente si se extiende.
 */
export const PROMO_SETUP_GRATIS_FIN = new Date("2026-10-14T00:00:00-03:00");

/** true si hoy todavía está vigente la promo de setup gratis. */
export function enVentanaPromoSetupGratis(ahora: Date = new Date()): boolean {
  return ahora.getTime() < PROMO_SETUP_GRATIS_FIN.getTime();
}

/** Días de prueba gratis con los que arranca todo gimnasio nuevo. */
export const TRIAL_DIAS = 14;

/** Early-bird: comprar dentro de los primeros N días de la prueba. */
export const EARLY_BIRD_DIAS = 3;
export const EARLY_BIRD_PCT = 15;

const MS_DIA = 86_400_000;

/** true si `creadoAt` está dentro de la ventana early-bird (primeros N días). */
export function enVentanaEarlyBird(
  creadoAt: string | Date,
  ahora: Date = new Date(),
): boolean {
  const limite = new Date(creadoAt);
  limite.setDate(limite.getDate() + EARLY_BIRD_DIAS);
  return ahora.getTime() < limite.getTime();
}

/** Días que faltan para que termine la prueba (0..TRIAL_DIAS). */
export function diasRestantesPrueba(
  creadoAt: string | Date,
  ahora: Date = new Date(),
): number {
  const fin = new Date(creadoAt);
  fin.setDate(fin.getDate() + TRIAL_DIAS);
  return Math.max(0, Math.ceil((fin.getTime() - ahora.getTime()) / MS_DIA));
}

/** El early-bird aplica al plan mensual y al setup; el Premium no. */
export function tipoAdmiteEarlyBird(tipo: TipoPago): boolean {
  return tipo === "plan_mensual" || tipo === "setup";
}

/** Monto final tras aplicar un porcentaje de descuento (redondeado a $1). */
export function aplicarDescuento(montoARS: number, pct: number): number {
  if (!(pct > 0)) return Math.round(montoARS);
  return Math.round(montoARS * (1 - pct / 100));
}

/** Monto base de un cargo único; el plan mensual sale de planes_plataforma. */
export function montoBaseCargoUnico(tipo: "setup" | "premium"): number {
  return tipo === "setup" ? CARGO_SETUP_ARS : CARGO_PREMIUM_ARS;
}
