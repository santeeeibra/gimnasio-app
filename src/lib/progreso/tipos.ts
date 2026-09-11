// Tipos y helpers puros de Drop Sets (bajadas de peso escalonadas en una serie).
// Sin dependencias de Supabase/Next: se puede importar tanto en Server Actions
// como en el editor de UI (rutina-editor.tsx) sin arrastrar código de servidor.

export interface DropPaso {
  peso: number; // kg usados en este escalón
  reps: number; // reps logradas en este escalón
}

export interface RegistroDropSet {
  id?: string;
  ejercicioId: string;
  serieIndex: number; // típicamente la última serie
  pasos: DropPaso[]; // ej: [{ peso: 12, reps: 10 }, { peso: 8, reps: 8 }, { peso: 6, reps: 6 }]
  fecha?: string;
}

/**
 * Redondea un peso al múltiplo más cercano de `paso` (0.5 o 1 kg),
 * sin bajar de 0.
 */
function redondearPeso(peso: number, paso: 0.5 | 1): number {
  const redondeado = Math.round(peso / paso) * paso;
  return Math.max(0, redondeado);
}

/**
 * Calcula los pasos sugeridos de un drop set a partir del peso/reps base
 * de la última serie normal, aplicando reducciones del 20%-25% en cada
 * escalón. El peso se redondea a pasos de 1kg (o 0.5kg para cargas chicas,
 * donde un salto de 1kg sería demasiado agresivo).
 *
 * Pura: no toca la base de datos, solo sirve para pre-cargar sugerencias en la UI.
 */
export function calcularPasosSugeridos(
  pesoBase: number,
  repsBase: number,
  saltos: number = 2,
): DropPaso[] {
  if (!Number.isFinite(pesoBase) || pesoBase <= 0) return [];
  if (!Number.isFinite(repsBase) || repsBase <= 0) return [];

  const pasoRedondeo: 0.5 | 1 = pesoBase < 20 ? 0.5 : 1;
  const pasos: DropPaso[] = [];
  let pesoAnterior = pesoBase;

  for (let i = 0; i < Math.max(0, saltos); i++) {
    // Reducción variable 20%-25% (alternamos para no caer siempre en el mismo %).
    const porcentaje = i % 2 === 0 ? 0.2 : 0.25;
    let pesoSiguiente = redondearPeso(pesoAnterior * (1 - porcentaje), pasoRedondeo);

    // Nunca repetir el mismo peso que el escalón anterior ni llegar a 0.
    if (pesoSiguiente >= pesoAnterior) pesoSiguiente = redondearPeso(pesoAnterior - pasoRedondeo, pasoRedondeo);
    if (pesoSiguiente <= 0) break;

    pasos.push({ peso: pesoSiguiente, reps: repsBase });
    pesoAnterior = pesoSiguiente;
  }

  return pasos;
}
