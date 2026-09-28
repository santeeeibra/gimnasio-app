"use server";

import { requirePartner } from "@/lib/partners/auth";
import { createClient } from "@/lib/supabase/server";

type SubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function guardarSuscripcionPartner(
  sub: SubJSON,
): Promise<{ error?: string }> {
  const partner = await requirePartner();
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth)
    return { error: "Suscripción inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      partner_id: partner.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("guardarSuscripcionPartner", error);
    return { error: "No se pudo activar." };
  }
  return {};
}

export async function borrarSuscripcionPartner(
  endpoint: string,
): Promise<{ error?: string }> {
  const partner = await requirePartner();
  if (!endpoint) return {};
  const supabase = await createClient();
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("partner_id", partner.id);
  return {};
}
