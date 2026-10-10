/** Actualiza consumidores locales sin volver a descargar toda la rutina. */
export const PROGRESO_GUARDADO = "sysgym:progreso-guardado";
export type ProgresoGuardado = { ejercicioId: string; peso: number; reps: number | null };

export function avisarProgresoGuardado(detalle: ProgresoGuardado) {
  window.dispatchEvent(new CustomEvent<ProgresoGuardado>(PROGRESO_GUARDADO, { detail: detalle }));
}
