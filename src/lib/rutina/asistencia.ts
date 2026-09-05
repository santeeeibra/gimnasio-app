import type { Equipo } from "./tipos";

export type EstadoAsistencia = "pendiente" | "en_camino" | "atendido" | "cancelado";

export type PedidoAsistencia = {
  id: string;
  gimnasio_id: string;
  cliente_id: string;
  ejercicio_id: string | null;
  ejercicio_nombre: string;
  sector: string;
  estado: EstadoAsistencia;
  creado_at: string;
  atendido_at: string | null;
};

export const SECTORES_PREDETERMINADOS = [
  "Zona de mancuernas / peso libre",
  "Barras y racks",
  "Sector de máquinas",
  "Sector de poleas",
  "Colchonetas / suelo",
  "Cardio",
] as const;

/**
 * Deduce automáticamente el sector más probable del gimnasio
 * basándose en el equipo del ejercicio.
 */
export function deducirSector(equipo?: string | null): string {
  if (!equipo) return "Sala de pesas";

  switch (equipo.toLowerCase()) {
    case "mancuernas":
    case "mancuerna":
      return "Zona de mancuernas / peso libre";
    case "barra":
    case "barras":
      return "Barras y racks";
    case "maquina":
    case "máquina":
      return "Sector de máquinas";
    case "polea":
    case "poleas":
      return "Sector de poleas";
    case "peso_corporal":
    case "calistenia":
      return "Colchonetas / suelo";
    default:
      return "Sala de musculación";
  }
}
