/**
 * Compartir logros — tipos y constantes.
 * Récord de peso y racha de constancia se calculan al vuelo (sin migración de
 * estado). Ver SPEC_COMPARTIR_LOGROS.md.
 */

export type TipoLogro = "record" | "racha";

/** Hitos de racha (días consecutivos) que ofrecen compartir. Fijo en v1. */
export const HITOS_RACHA = [5, 7, 14, 21, 30, 50, 100] as const;

/** Racha mínima para mostrar la card en /mi (no mostrar "1 día"). */
export const RACHA_MINIMA_VISIBLE = 2;

/**
 * Días de "perdón" tolerados dentro de una racha (patrón Streak Freeze).
 * Falta 1 día -> no se reinicia, se descuenta del conteo. Faltan 2 seguidos
 * -> se corta. Regla fija en calcularRacha().
 */
export const PERDON_DIAS = 1;

export type ResultadoRecord = {
  esRecord: boolean;
  pesoKg: number;
  /** Máximo anterior; null si es la primera carga (no cuenta como récord). */
  pesoAnteriorKg: number | null;
};

export type ResultadoRacha = {
  /** Días consecutivos entrenando, terminando hoy o ayer. */
  dias: number;
  /** true si `dias` cae justo en un valor de HITOS_RACHA. */
  enHito: boolean;
  /** true si se usó el perdón (faltó un día pero la racha sigue viva). */
  conPerdon: boolean;
};
