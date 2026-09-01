export type EstadoCuota = "al_dia" | "por_vencer" | "vencido";

export function diasRestantes(fechaVencimiento: string | null): number | null {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + "T00:00:00");
  return Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);
}

export function estadoDesdeDias(dias: number | null): EstadoCuota {
  if (dias === null || dias < 0) return "vencido";
  if (dias <= 6) return "por_vencer";
  return "al_dia";
}

export const ESTADO_LABEL: Record<EstadoCuota, string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencido: "Vencida",
};
