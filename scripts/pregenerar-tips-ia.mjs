import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function llamarGroq(system, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("No GROQ_API_KEY");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 220,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error("Groq " + res.status + ": " + (await res.text()));
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function completar() {
  const { data: ejercicios } = await supabase
    .from("ejercicios")
    .select("*")
    .is("tips_ia", null);

  console.log("Ejercicios sin tips:", ejercicios?.length || 0);
  if (!ejercicios || ejercicios.length === 0) {
    console.log("¡Todos los ejercicios ya tienen tips_ia!");
    return;
  }

  const SYSTEM_PROMPT =
    "Sos un entrenador personal certificado. Redactás tips de técnica de ejecución breves y accionables para un socio de gimnasio que ve el ejercicio en su celular mientras entrena. Nada de teoría, nada de anatomía detallada: solo indicaciones prácticas de postura y ejecución.";

  for (const ej of ejercicios) {
    const userMessage = `Ejercicio: ${ej.nombre}
Grupo muscular: ${ej.grupo_muscular ?? "sin especificar"}
Patrón de movimiento: ${ej.patron ?? "sin especificar"}
Equipo: ${ej.equipo ?? "sin especificar"}
${ej.descripcion ? `Nota interna existente: ${ej.descripcion}` : ""}

Redactá exactamente 3 bullets cortos (uno por línea, empezando con "•") con los puntos clave de ejecución correcta de este ejercicio. Español rioplatense, directo, sin relleno.`;

    try {
      const tips = await llamarGroq(SYSTEM_PROMPT, userMessage);
      if (tips) {
        await supabase
          .from("ejercicios")
          .update({ tips_ia: tips })
          .eq("id", ej.id);
        console.log("✅ Completado:", ej.nombre);
      }
    } catch (err) {
      console.error("❌ Error en", ej.nombre, err.message);
    }
  }

  const { data: finalData } = await supabase
    .from("ejercicios")
    .select("id, tips_ia");
  const total = finalData.length;
  const listos = finalData.filter((e) => e.tips_ia).length;
  console.log(`\n🎉 PROCESO FINALIZADO: ${listos}/${total} ejercicios con tips_ia pre-generados.`);
}

completar();
