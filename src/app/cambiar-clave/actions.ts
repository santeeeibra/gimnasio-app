"use server";

import { redirect } from "next/navigation";
import { intentarMutacion } from "@/lib/db/mutaciones";
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

  // Si esto no toca ninguna fila, la clave ya cambió pero el perfil sigue
  // marcado y el middleware devuelve al usuario acá: loop infinito.
  const baja = await intentarMutacion(
    supabase
      .from("profiles")
      .update({ debe_cambiar_clave: false })
      .eq("id", user.id)
      .select("id"),
    "actualizar tu perfil",
  );
  if (!baja.ok) {
    console.error("[cambiar-clave]", baja.msg);
    return {
      error:
        "Tu contraseña se cambió, pero no pudimos actualizar tu perfil. Cerrá sesión y volvé a entrar; si sigue igual, avisale a tu gimnasio.",
    };
  }

  redirect("/");
}
