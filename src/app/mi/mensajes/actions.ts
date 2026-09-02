"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";

export async function marcarLeido(mensajeId: string): Promise<void> {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("mensaje_destinatarios")
    .update({ leido: true, leido_at: new Date().toISOString() })
    .eq("mensaje_id", mensajeId)
    .eq("profile_id", profile.id)
    .eq("leido", false);
  revalidatePath("/mi/mensajes");
  revalidatePath("/mi");
}

export async function responderCliente(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const profile = await requireProfile();
  const mensajeId = String(formData.get("mensaje_id") ?? "");
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  if (!mensajeId || !cuerpo) return { error: "Escribí una respuesta." };

  const supabase = await createClient();
  const { error } = await supabase.from("mensaje_respuestas").insert({
    mensaje_id: mensajeId,
    autor_id: profile.id,
    cuerpo,
  });
  if (error) return { error: "No se pudo enviar la respuesta." };

  const admin = createAdminClient();
  const { data: duenos } = await admin
    .from("profiles")
    .select("id")
    .eq("gimnasio_id", profile.gimnasio_id)
    .eq("rol", "dueno");
  await enviarPush(
    (duenos ?? []).map((d: { id: string }) => d.id),
    {
      title: `Respuesta de ${profile.nombre}`,
      body: cuerpo.length > 120 ? cuerpo.slice(0, 117) + "…" : cuerpo,
      url: `/panel/mensajes/${mensajeId}`,
      tag: `resp-cli-${mensajeId}`,
    },
  );

  revalidatePath(`/mi/mensajes/${mensajeId}`);
  return {};
}
