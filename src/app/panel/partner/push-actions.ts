"use server";

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type SubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

async function partnerIdActual(): Promise<string | null> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function guardarSuscripcionPartner(
  sub: SubJSON,
): Promise<{ error?: string }> {
  const partnerId = await partnerIdActual();
  if (!partnerId) return { error: "No sos partner." };
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth)
    return { error: "Suscripción inválida." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      partner_id: partnerId,
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
  await partnerIdActual();
  if (!endpoint) return {};
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return {};
}
