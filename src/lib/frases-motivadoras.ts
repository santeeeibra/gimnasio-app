// Frases motivadoras estáticas para el banner de /mi/rutina
export const FRASES_MOTIVADORAS = [
  "La única mala rutina es la que no haces.",
  "Cada repetición cuenta. Cada día suma.",
  "Tu cuerpo puede con más de lo que tu mente cree.",
  "El esfuerzo de hoy es la fuerza de mañana.",
  "No se trata de ser el mejor, se trata de ser mejor que ayer.",
  "El dolor que sientes hoy será la fuerza que sientas mañana.",
  "Tu único límite eres tú mismo.",
  "Los campeones se hacen cuando nadie está mirando.",
  "El sudor es grasa llorando.",
  "No cuentes los días, haz que los días cuenten.",
  "La motivación te inicia, el hábito te mantiene.",
  "Tu cuerpo es el reflejo de tu estilo de vida.",
  "Lo difícil es empezar. Lo imposible es detenerse.",
  "Si te cansas, aprende a descansar, no a renunciar.",
  "El éxito no es final, el fracaso no es fatal: lo que cuenta es el coraje de continuar.",
  "Entrena como si tu peor enemigo estuviera mirando.",
  "Un año desde hoy, desearás haber empezado hoy.",
  "La disciplina es hacer lo que hay que hacer aunque no quieras hacerlo.",
  "Tu progreso puede ser lento, pero es progreso.",
  "El gimnasio es tu terapia. Las pesas son tu medicina.",
] as const;

/**
 * Devuelve la frase del día basada en la fecha actual.
 * Usa el día del año módulo la cantidad de frases para ser determinístico
 * (la misma frase se repite durante todo el día).
 */
export function obtenerFraseDelDia(fecha: Date = new Date()): string {
  const inicioDeLAño = new Date(fecha.getFullYear(), 0, 0);
  const diff = fecha.getTime() - inicioDeLAño.getTime();
  const unDia = 1000 * 60 * 60 * 24;
  const diaDelAño = Math.floor(diff / unDia);
  
  const indice = diaDelAño % FRASES_MOTIVADORAS.length;
  return FRASES_MOTIVADORAS[indice];
}
