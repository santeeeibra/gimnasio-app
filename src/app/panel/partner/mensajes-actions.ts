"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";

export type PartnerMensaje = {
  id: string;
  autor: "admin" | "partner";
  cuerpo: string;
  leido: boolean;
  creado_at: string;
};

async function partnerIdActual(): Promise<string | null> {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin
    .from("partners")
    .select("id, nombre")
    .eq("user_id", profile.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function listarMensajesPartnerAction(): Promise<PartnerMensaje[]> {
  const partnerId = await partnerIdActual();
  if (!partnerId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_mensajes")
    .select("id, autor, cuerpo, leido, creado_at")
    .eq("partner_id", partnerId)
    .order("creado_at", { ascending: true });
  return (data ?? []) as PartnerMensaje[];
}

// El partner consulta al admin (vos). Envía push a los superadmins.
export async function enviarMensajePartnerAction(
  cuerpo: string,
): Promise<{ error?: string }> {
  const texto = cuerpo.trim();
  if (!texto) return { error: "Escribí un mensaje." };

  const profile = await requireProfile();
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, nombre")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!partner) return { error: "No sos partner." };

  const { error } = await admin.from("partner_mensajes").insert({
    partner_id: partner.id,
    autor: "partner",
    cuerpo: texto,
  });
  if (error) return { error: "No se pudo enviar." };

  const { data: superadmins } = await admin
    .from("profiles")
    .select("id")
    .eq("rol", "superadmin");
  await enviarPush(
    (superadmins ?? []).map((s: { id: string }) => s.id),
    {
      title: `Partner: ${partner.nombre}`,
      body: texto.slice(0, 120),
      url: "/admin/partner",
      tag: "partner-mensaje",
    },
  );

  revalidatePath("/panel/partner");
  return {};
}

export async function marcarMensajesPartnerLeidosAction(): Promise<void> {
  const partnerId = await partnerIdActual();
  if (!partnerId) return;
  const admin = createAdminClient();
  await admin
    .from("partner_mensajes")
    .update({ leido: true })
    .eq("partner_id", partnerId)
    .eq("autor", "admin")
    .eq("leido", false);
}
