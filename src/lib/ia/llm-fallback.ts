import "server-only";

// Wrapper único de texto-por-IA para todo el proyecto: prueba varios
// proveedores en orden hasta que uno responda. Así una caída/sin-crédito en
// uno no tira abajo la función — sólo se degrada a la próxima opción gratis.
//
// Orden por CALIDAD de redacción, no por facilidad de setup:
// Claude (de pago) → GitHub Models/GPT-4o-mini (gratis con cuenta de
// GitHub) → Gemini (gratis sin tarjeta, aistudio.google.com) → Groq/Llama
// 3.3 (gratis sin tarjeta, console.groq.com — el más generoso en límites,
// por eso queda de último respaldo). Cada uno se activa solo si su
// *_API_KEY está en .env.local; sin ninguna key, se comporta como si ese
// proveedor no existiera.

export type LlamadaIa = {
  system: string;
  userMessage: string;
  maxTokens: number;
};

type Proveedor = {
  nombre: string;
  disponible: () => boolean;
  llamar: (args: LlamadaIa) => Promise<string>;
};

async function llamarClaude(args: LlamadaIa): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

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
  const apiKey = process.env.GROQ_API_KEY!;

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

async function llamarGemini(args: LlamadaIa): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: args.system }] },
        contents: [{ role: "user", parts: [{ text: args.userMessage }] }],
        generationConfig: { maxOutputTokens: args.maxTokens },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!texto) throw new Error("Respuesta vacía de Gemini");
  return texto;
}

async function llamarGithubModels(args: LlamadaIa): Promise<string> {
  const apiKey = process.env.GITHUB_MODELS_TOKEN!;

  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: args.maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.userMessage },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub Models API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = data.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new Error("Respuesta vacía de GitHub Models");
  return texto;
}

// Orden por calidad de redacción (no por orden de implementación): Claude
// Haiku 4.5 > GPT-4o-mini > Gemini 2.0 Flash > Llama 3.3 70B. Los tres
// primeros son modelos propietarios con mejor fluidez/naturalidad en
// español rioplatense para textos cortos; Llama es sólido pero queda último
// porque tiende a sonar más genérico en este tipo de copy — igual gana en
// límites gratis más generosos, por eso conviene como último respaldo, no
// como segunda opción.
const PROVEEDORES: Proveedor[] = [
  {
    nombre: "Claude",
    disponible: () => Boolean(process.env.ANTHROPIC_API_KEY),
    llamar: llamarClaude,
  },
  {
    nombre: "GitHub Models (GPT-4o-mini)",
    disponible: () => Boolean(process.env.GITHUB_MODELS_TOKEN),
    llamar: llamarGithubModels,
  },
  {
    nombre: "Gemini",
    disponible: () => Boolean(process.env.GEMINI_API_KEY),
    llamar: llamarGemini,
  },
  {
    nombre: "Groq (Llama 3.3)",
    disponible: () => Boolean(process.env.GROQ_API_KEY),
    llamar: llamarGroq,
  },
];

/**
 * Prueba cada proveedor configurado en orden (Claude → Groq → Gemini) hasta
 * que uno responda. Si un proveedor no tiene su *_API_KEY en .env.local, se
 * saltea directo, sin contar como falla. Si ninguno responde, tira un error
 * con el detalle de cada intento.
 */
export async function llamarIaConFallback(args: LlamadaIa): Promise<string> {
  const errores: string[] = [];

  for (const proveedor of PROVEEDORES) {
    if (!proveedor.disponible()) continue;
    try {
      return await proveedor.llamar(args);
    } catch (err) {
      errores.push(`${proveedor.nombre}: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (errores.length === 0) {
    throw new Error(
      "Ningún proveedor de IA está configurado (falta ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY o GITHUB_MODELS_TOKEN en .env.local)",
    );
  }
  throw new Error(`Fallaron todos los proveedores de IA: ${errores.join(" | ")}`);
}
