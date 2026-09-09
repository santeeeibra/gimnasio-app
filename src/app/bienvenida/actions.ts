"use server";

import { createClient } from "@/lib/supabase/server";

export type ConfirmarState = { error?: string; ok?: boolean };

/** El dueño eligió NO cambiar la clave que le dieron: solo apaga el flag,
 * la clave real sigue siendo la default (claveInicial(dni)). */
export async function confirmarMantenerClave(): Promise<ConfirmarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión expiró, entrá de nuevo." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();
  if (profile?.rol !== "dueno") return { error: "No autorizado." };

  const { error } = await supabase
    .from("profiles")
    .update({ debe_cambiar_clave: false })
    .eq("id", user.id);
  if (error) return { error: "No se pudo guardar. Probá de nuevo." };

  return { ok: true };
}
