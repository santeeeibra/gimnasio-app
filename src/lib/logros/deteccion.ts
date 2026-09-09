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
 * Racha = días consecutivos con al menos un check-in, terminando hoy o ayer.
 *
 * Perdón de un día (Streak Freeze): un día faltante NO reinicia la racha; no
 * suma al conteo pero la mantiene viva. Sólo se corta cuando faltan 2 días
 * seguidos.
 *
 * @param fechasISO fechas (o timestamps ISO) de los check-ins. Se deduplica por
 *                  día, no importa el orden.
 * @param hoyISO    fecha de referencia (default: hoy, UTC).
 */
export function calcularRacha(
  fechasISO: string[],
  hoyISO?: string,
): ResultadoRacha {
  const dias = new Set(fechasISO.map((f) => f.slice(0, 10)));
  const hoy = (hoyISO ?? new Date().toISOString()).slice(0, 10);
  const ayer = restarDias(hoy, 1);

  let cursor: string;
  if (dias.has(hoy)) cursor = hoy;
  else if (dias.has(ayer)) cursor = ayer;
  else return { dias: 0, enHito: false, conPerdon: false };

  let total = 0;
  let conPerdon = false;
  let huecoPrevio = false;
  let huecoPendiente = false;

  for (let i = 0; i < 500; i++) {
    const d = restarDias(cursor, i);
    if (dias.has(d)) {
      total++;
      if (huecoPendiente) {
        conPerdon = true;
        huecoPendiente = false;
      }
      huecoPrevio = false;
    } else {
      if (huecoPrevio) break; // 2 días seguidos sin entrenar -> corta
      huecoPrevio = true;
      huecoPendiente = true; // se confirma como "perdón" sólo si sigue la racha
    }
  }

  return {
    dias: total,
    enHito: (HITOS_RACHA as readonly number[]).includes(total),
    conPerdon,
  };
}
