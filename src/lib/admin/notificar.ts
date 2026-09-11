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

    // Para el push: el resumen directo sin adornos (máx 130 caracteres)
    const lineas = detalle.split("\n").map((l) => l.trim()).filter(Boolean);
    const primerLinea = lineas[0]?.replace(/^⚠️\s*/, "") || detalle;
    const cuerpoPush = primerLinea.slice(0, 130);

    const tareas: Promise<unknown>[] = [];

    if (canales.push !== false && superId) {
      tareas.push(
        enviarPush([superId], {
          title: titulo.slice(0, 80),
          body: cuerpoPush,
          url: "/admin/errores",
          tag: "admin-aviso",
        }),
      );
    }

    if (canales.email !== false && superEmail) {
      const lineasHtml = lineas
        .map((l) => {
          if (l.startsWith("Detalle técnico:")) {
            return `<div style="margin-top:12px;padding:8px 12px;background:#f1f5f9;border-radius:6px;font-family:monospace;font-size:12px;color:#334155;word-break:break-all">${escaparHtml(l)}</div>`;
          }
          return `<p style="margin:6px 0;font-size:14px;color:#1e293b">${escaparHtml(l)}</p>`;
        })
        .join("");

      const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
  <div style="display:inline-block;padding:3px 10px;background:#fee2e2;color:#991b1b;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
    Aviso del Sistema
  </div>
  <h2 style="margin:0 0 12px 0;font-size:18px;color:#0f172a;font-weight:700">${escaparHtml(titulo)}</h2>
  <div style="padding:14px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;margin-bottom:16px">
    ${lineasHtml}
  </div>
  <p style="margin:16px 0 0 0;font-size:12px;color:#64748b">
    Podés revisar todos los incidentes en el <a href="https://gimnasio-app.vercel.app/admin/errores" style="color:#2563eb;text-decoration:none;font-weight:600">Panel de Errores</a>.
  </p>
</div>`;

      tareas.push(enviarEmail(superEmail, `[SysGym] ${titulo}`, html));
    }

    await Promise.allSettled(tareas);
  } catch (err) {
    console.error("[admin/notificar]", err);
  }
}
