"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function guardarFotoPropia(
  fotoUrl: string | null,
): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.rpc("actualizar_foto_propia", {
    p_foto_url: fotoUrl,
  });

  if (error) {
    return { error: "No se pudo actualizar la foto de perfil." };
  }

  revalidatePath("/mi/perfil");
  revalidatePath("/mi");
  return {};
}
