"use server";

import { revalidatePath } from "next/cache";
import { requirePartner } from "@/lib/partners/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";

export type PartnerMensaje = {
  id: string;
  autor: "admin" | "partner";
  cuerpo: string;
  leido: boolean;
  creado_at: string;
};

export async function listarMensajesPartnerAction(): Promise<PartnerMensaje[]> {
  const partner = await requirePartner();
  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_mensajes")
    .select("id, autor, cuerpo, leido, creado_at")
    .eq("partner_id", partner.id)
    .order("creado_at", { ascending: true });
  return (data ?? []) as PartnerMensaje[];
}

// El partner consulta al admin (vos). Envía push a los superadmins.
export async function enviarMensajePartnerAction(
  cuerpo: string,
): Promise<{ error?: string }> {
  const texto = cuerpo.trim();
  if (!texto) return { error: "Escribí un mensaje." };

  const partner = await requirePartner();
  const admin = createAdminClient();

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

  revalidatePath("/partner");
  return {};
}

export async function marcarMensajesPartnerLeidosAction(): Promise<void> {
  const partner = await requirePartner();
  const admin = createAdminClient();
  await admin
    .from("partner_mensajes")
    .update({ leido: true })
    .eq("partner_id", partner.id)
    .eq("autor", "admin")
    .eq("leido", false);
}
