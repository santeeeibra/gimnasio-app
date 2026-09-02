import "server-only";

// Envío de email simple vía Resend (free tier). Solo se usa para avisos al
// ADMIN de la plataforma (monitor de la base). No lanza: registra y devuelve
// false si falta config o falla el request.

type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function enviarEmail({ to, subject, text }: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  if (!key) {
    console.warn("[mail] Falta RESEND_API_KEY; no se envía email.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });

    if (!res.ok) {
      console.error("[mail] Resend", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] fetch", err);
    return false;
  }
}
