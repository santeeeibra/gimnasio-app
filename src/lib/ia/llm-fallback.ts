import "server-only";

// Wrapper único de texto-por-IA para todo el proyecto: intenta Claude primero
// (mejor calidad) y si falla — sin crédito, caída del servicio, lo que sea —
// cae automáticamente a Groq, que tiene capa gratis sin tarjeta
// (console.groq.com) y sirve perfecto para estos textos cortos.
//
// Para activar el fallback: crear cuenta gratis en https://console.groq.com,
// generar una API key y ponerla en .env.local como GROQ_API_KEY=gsk_...
// Sin esa key, si Claude falla, la función tira el error de Claude tal cual
// (mismo comportamiento que antes de este archivo existir).

export type LlamadaIa = {
  system: string;
  userMessage: string;
  maxTokens: number;
};

async function llamarClaude(args: LlamadaIa): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: args.maxTokens,
      system: args.system,
      messages: [{ role: "user", content: args.userMessage }],
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

async function llamarGroq(args: LlamadaIa): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Falta GROQ_API_KEY");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.userMessage },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = data.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new Error("Respuesta vacía de Groq");
  return texto;
}

/**
 * Llama a Claude; si falla (sin crédito, rate limit, lo que sea) y hay
 * GROQ_API_KEY configurada, reintenta con Groq (gratis) antes de tirar el
 * error. Si no hay GROQ_API_KEY, se comporta como si Groq no existiera.
 */
export async function llamarIaConFallback(args: LlamadaIa): Promise<string> {
  try {
    return await llamarClaude(args);
  } catch (errClaude) {
    if (!process.env.GROQ_API_KEY) throw errClaude;
    try {
      return await llamarGroq(args);
    } catch (errGroq) {
      throw new Error(
        `Falló Claude (${errClaude instanceof Error ? errClaude.message : errClaude}) y también el fallback Groq (${errGroq instanceof Error ? errGroq.message : errGroq})`,
      );
    }
  }
}
