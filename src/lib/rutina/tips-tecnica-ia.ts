import "server-only";
import { llamarIaConFallback } from "@/lib/ia/llm-fallback";

// Genera tips de técnica de ejecución con Claude Haiku, una sola vez por
// ejercicio (ver obtenerTipsTecnica en asistente-actions.ts, que cachea el
// resultado en ejercicios.tips_ia). El catálogo de ejercicios es compartido
// por todos los gimnasios, así que esto se paga como máximo una vez por
// ejercicio en total, nunca por click ni por cliente.

const SYSTEM_PROMPT = `Sos un entrenador personal certificado. Redactás tips de
técnica de ejecución breves y accionables para un socio de gimnasio que ve el
ejercicio en su celular mientras entrena. Nada de teoría, nada de anatomía
detallada: solo indicaciones prácticas de postura y ejecución.`;

export type DatosEjercicioParaTips = {
  nombre: string;
  grupoMuscular: string | null;
  patron: string | null;
  equipo: string | null;
  descripcionExistente: string | null;
};

/** Llama a Claude Haiku y devuelve 3 bullets cortos de técnica. Tira si falla
 * (el caller decide el fallback: la descripción corta ya cargada en DB). */
export async function generarTipsTecnicaIa(
  datos: DatosEjercicioParaTips,
): Promise<string> {
  const userMessage = `Ejercicio: ${datos.nombre}
Grupo muscular: ${datos.grupoMuscular ?? "sin especificar"}
Patrón de movimiento: ${datos.patron ?? "sin especificar"}
Equipo: ${datos.equipo ?? "sin especificar"}
${datos.descripcionExistente ? `Nota interna existente: ${datos.descripcionExistente}` : ""}

Redactá exactamente 3 bullets cortos (uno por línea, empezando con "•") con
los puntos clave de ejecución correcta de este ejercicio. Español rioplatense,
directo, sin relleno.`;

  return llamarIaConFallback({
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 220,
  });
}
