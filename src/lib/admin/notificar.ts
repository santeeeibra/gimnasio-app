import "server-only";

import { enviarPush } from "@/lib/push/enviar";
import { enviarEmail, escaparHtml } from "@/lib/email/enviar";

// Aviso al superadmin de la plataforma (santeee). Dos canales, ambos best-effort:
//  - Push: a los dispositivos del perfil SUPERADMIN_ID (mismo que "Push de
//    prueba" en /admin).
//  - Email: a SUPERADMIN_EMAIL vía Resend, como respaldo.
//
// Contrato: NUNCA lanza. Si falta config, cada canal se saltea solo. Pensado
// para llamarse desde catch blocks y desde la auditoría de /admin sin miedo a
// romper el flujo que la invoca.

type Canales = { push?: boolean; email?: boolean };

// Anti-spam mínimo en memoria: mismo (titulo|detalle) dentro de esta ventana no
// se reenvía. No persiste entre despliegues, alcanza para evitar ráfagas cuando
// un mismo fallo dispara varios registrarError seguidos.
const VENTANA_MS = 60_000;
const ultimos = new Map<string, number>();

export async function notificarSuperadmin(
  titulo: string,
  detalle: string,
  canales: Canales = { push: true, email: true },
): Promise<void> {
  try {
    const clave = `${titulo}|${detalle}`;
    const ahora = Date.now();
    const prev = ultimos.get(clave);
    if (prev && ahora - prev < VENTANA_MS) return;
    ultimos.set(clave, ahora);
    if (ultimos.size > 200) {
      for (const [k, t] of ultimos) {
        if (ahora - t > VENTANA_MS) ultimos.delete(k);
      }
    }

    const superId = process.env.SUPERADMIN_ID;
    const superEmail = process.env.SUPERADMIN_EMAIL;
    const cuerpo = detalle.slice(0, 500);

    const tareas: Promise<unknown>[] = [];

    if (canales.push !== false && superId) {
      tareas.push(
        enviarPush([superId], {
          title: titulo.slice(0, 80),
          body: cuerpo,
          url: "/admin",
          tag: "admin-aviso",
        }),
      );
    }

    if (canales.email !== false && superEmail) {
      const html = `<p><strong>${escaparHtml(titulo)}</strong></p><p style="white-space:pre-wrap">${escaparHtml(
        cuerpo,
      )}</p><p style="color:#888;font-size:12px">Aviso automático de SISTEMA GYM.</p>`;
      tareas.push(enviarEmail(superEmail, `[SISTEMA GYM] ${titulo}`, html));
    }

    await Promise.allSettled(tareas);
  } catch (err) {
    console.error("[admin/notificar]", err);
  }
}
