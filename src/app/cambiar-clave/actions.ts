"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type State = { error?: string };

export async function cambiarClave(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const nueva = String(formData.get("nueva") ?? "");
  const repetir = String(formData.get("repetir") ?? "");

  if (nueva.length < 6) {
    return { error: "Usá al menos 6 caracteres." };
  }
  if (nueva !== repetir) {
    return { error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "No se pudo cambiar la contraseña." };

  await supabase
    .from("profiles")
    .update({ debe_cambiar_clave: false })
    .eq("id", user.id);

  redirect("/");
}
