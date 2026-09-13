/**
 * Compartir logros — detección de récord y cálculo de racha.
 * Funciones puras: reciben datos ya leídos, no tocan Supabase.
 */

import {
  HITOS_RACHA,
  type ResultadoRecord,
  type ResultadoRacha,
} from "./tipos";

// ── Récord de peso ───────────────────────────────────────────────────────────

/**
 * Compara `pesoNuevo` contra el máximo histórico previo del mismo ejercicio.
 * - Sin registros previos -> NO es récord (evita "récord" en la primera carga).
 * - `opts.excluirFecha`: descarta los registros de esa fecha (típicamente hoy,
 *   por el upsert que pisa el registro del día).
 */
export function detectarRecord(
  pesoNuevo: number,
  registros: { peso: number; fecha?: string }[],
  opts: { excluirFecha?: string } = {},
): ResultadoRecord {
  const previos = opts.excluirFecha
    ? registros.filter((r) => r.fecha !== opts.excluirFecha)
    : registros;

  if (previos.length === 0) {
    return { esRecord: false, pesoKg: pesoNuevo, pesoAnteriorKg: null };
  }

  const maxPrevio = previos.reduce((m, r) => (r.peso > m ? r.peso : m), 0);
  return {
    esRecord: pesoNuevo > maxPrevio,
    pesoKg: pesoNuevo,
    pesoAnteriorKg: maxPrevio,
  };
}

// ── Racha de constancia ─────────────────────────────────────────────────────

function restarDias(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Racha adaptativa por frecuencia programada (ej: 3 días/semana L-M-V).
 * Los días de descanso entre sesiones programadas NO rompen la racha.
 * Se corta únicamente si el socio supera la tolerancia de descanso de su plan.
 */
export function calcularRacha(
  fechasISO: string[],
  hoyISOOrOpts?: string | { diasPorSemana?: number; hoyISO?: string },
): ResultadoRacha {
  const hoyISO =
    typeof hoyISOOrOpts === "string"
      ? hoyISOOrOpts
      : hoyISOOrOpts?.hoyISO;
  const diasPorSemana =
    typeof hoyISOOrOpts === "object" ? hoyISOOrOpts?.diasPorSemana : undefined;

  const dias = new Set(fechasISO.map((f) => f.slice(0, 10)));
  const hoy = (hoyISO ?? new Date().toISOString()).slice(0, 10);

  // Tolerancia de descanso entre sesiones según frecuencia (ej: 3d/sem -> max 3 días de descanso)
  const maxDiasDescansoPermitidos =
    diasPorSemana && diasPorSemana > 0
      ? Math.max(2, Math.ceil(7 / diasPorSemana))
      : 1;

  // Buscar el check-in más reciente dentro de la ventana de tolerancia
  let cursor: string | null = null;
  for (let gap = 0; gap <= maxDiasDescansoPermitidos; gap++) {
    const d = restarDias(hoy, gap);
    if (dias.has(d)) {
      cursor = d;
      break;
    }
  }

  if (!cursor) {
    return { dias: 0, enHito: false, conPerdon: false };
  }

  let total = 0;
  let conPerdon = false;
  let diasConsecutivosSinEntrenar = 0;

  for (let i = 0; i < 500; i++) {
    const d = restarDias(cursor, i);
    if (dias.has(d)) {
      total++;
      if (diasConsecutivosSinEntrenar > 1) {
        conPerdon = true;
      }
      diasConsecutivosSinEntrenar = 0;
    } else {
      diasConsecutivosSinEntrenar++;
      if (diasConsecutivosSinEntrenar > maxDiasDescansoPermitidos) {
        break; // Superó el límite de su plan -> se corta
      }
    }
  }

  return {
    dias: total,
    enHito: (HITOS_RACHA as readonly number[]).includes(total),
    conPerdon,
  };
}
