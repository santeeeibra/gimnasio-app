"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function guardarSuscripcion(
  sub: SubJSON,
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth)
    return { error: "Suscripción inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      profile_id: profile.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("guardarSuscripcion", error);
    return { error: "No se pudo activar." };
  }
  return {};
}

export async function borrarSuscripcion(
  endpoint: string,
): Promise<{ error?: string }> {
  await requireProfile();
  if (!endpoint) return {};
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return {};
}
