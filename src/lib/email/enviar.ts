import "server-only";

// Envío de email transaccional vía Resend (https://resend.com), API REST directa
// sin SDK. Free tier: 100 mails/día. Env: RESEND_API_KEY, RESEND_FROM.
//
// RESEND_FROM: si no hay dominio verificado, dejalo en "onboarding@resend.dev"
// (default). Ojo: con ese remitente Resend SOLO entrega al email con el que
// creaste la cuenta. Para mandar a socios/dueños hay que verificar un dominio
// y poner RESEND_FROM="no-reply@tudominio.com".
//
// Contrato: NUNCA lanza. Si falta la API key o la API responde con error, solo
// lo loguea y devuelve { ok: false }. El flujo que lo llama muestra un mensaje
// genérico igual, para no filtrar si el destinatario existe.

type ResultadoEmail = { ok: boolean; error?: string };

export async function enviarEmail(
  to: string,
  subject: string,
  html: string,
): Promise<ResultadoEmail> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("[email] Falta RESEND_API_KEY; no se envía nada.");
    return { ok: false, error: "sin_config" };
  }
  if (!to) return { ok: false, error: "sin_destinatario" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      console.error("[email] Resend respondió", res.status, detalle);
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] fallo de red", err);
    return { ok: false, error: "red" };
  }
}

/** Escapa texto para interpolarlo dentro de un cuerpo HTML de email. */
export function escaparHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
