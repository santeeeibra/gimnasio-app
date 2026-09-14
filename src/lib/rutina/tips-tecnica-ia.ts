import "server-only";

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const userMessage = `Ejercicio: ${datos.nombre}
Grupo muscular: ${datos.grupoMuscular ?? "sin especificar"}
Patrón de movimiento: ${datos.patron ?? "sin especificar"}
Equipo: ${datos.equipo ?? "sin especificar"}
${datos.descripcionExistente ? `Nota interna existente: ${datos.descripcionExistente}` : ""}

Redactá exactamente 3 bullets cortos (uno por línea, empezando con "•") con
los puntos clave de ejecución correcta de este ejercicio. Español rioplatense,
directo, sin relleno.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 220,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const texto = data.content?.find((b) => b.type === "text")?.text?.trim();
  if (!texto) throw new Error("Respuesta vacía de Anthropic");
  return texto;
}
