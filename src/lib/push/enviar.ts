import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/admin/errores";

let configurado = false;

function configurar(): boolean {
  if (configurado) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) {
    console.warn("[push] Faltan VAPID keys; no se envían notificaciones.");
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configurado = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Envía a todos los dispositivos de los perfiles dados.
// No lanza: registra errores y borra suscripciones muertas (404/410).
export async function enviarPush(
  profileIds: string[],
  payload: PushPayload,
): Promise<void> {
  const ids = [...new Set(profileIds.filter(Boolean))];
  if (ids.length === 0) return;
  if (!configurar()) return;

  try {
    const supabase = createAdminClient();
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("profile_id", ids);

    if (error) {
      await registrarError(null, "push", error);
      return;
    }
    if (!subs?.length) return;

    const body = JSON.stringify(payload);
    const muertas: string[] = [];

    await Promise.allSettled(
      subs.map(
        async (s: { endpoint: string; p256dh: string; auth: string }) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              body,
            );
          } catch (err: unknown) {
            const code = (err as { statusCode?: number })?.statusCode;
            if (code === 404 || code === 410) muertas.push(s.endpoint);
            else {
              console.error("[push] sendNotification", code, err);
              await registrarError(null, "push", err);
            }
          }
        },
      ),
    );

    if (muertas.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", muertas);
    }
  } catch (err) {
    // Contrato: enviarPush no lanza. Sólo registramos para el semáforo.
    await registrarError(null, "push", err);
  }
}
