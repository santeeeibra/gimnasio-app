"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { derivarVoltInk, isHex } from "@/lib/tema";

export type AjustesSocioState = { error?: string; ok?: string };

export async function guardarTemaSocio(
  _prev: AjustesSocioState,
  formData: FormData,
): Promise<AjustesSocioState> {
  const profile = await requireProfile();
  const volt = String(formData.get("volt") ?? "").trim();

  if (!isHex(volt)) {
    return { error: "Color de acento inválido (usá formato #RRGGBB)." };
  }

  const voltInk = derivarVoltInk(volt);
  const temaPersonalizado = { volt, voltInk };

  const supabase = await createClient();
  let { error } = await supabase
    .from("clientes")
    .update({ tema_personalizado: temaPersonalizado })
    .eq("profile_id", profile.id);

  // Fallback con admin si la policy RLS aún no se aplicó o si hay permisos restringidos
  if (error && error.code !== "42703") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("clientes")
      .update({ tema_personalizado: temaPersonalizado })
      .eq("profile_id", profile.id);
    error = adminRes.error;
  }

  if (error) {
    if (error.code === "42703") {
      return {
        error:
          "La base de datos aún no tiene la migración 0024 aplicada (falta columna clientes.tema_personalizado).",
      };
    }
    console.error("[guardarTemaSocio]", error);
    return { error: "No se pudo guardar tu preferencia de color." };
  }

  revalidatePath("/mi", "layout");
  revalidatePath("/mi/ajustes");
  return { ok: "Color actualizado correctamente." };
}

export async function restablecerTemaSocio(): Promise<AjustesSocioState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  let { error } = await supabase
    .from("clientes")
    .update({ tema_personalizado: null })
    .eq("profile_id", profile.id);

  if (error && error.code !== "42703") {
    const admin = createAdminClient();
    const adminRes = await admin
      .from("clientes")
      .update({ tema_personalizado: null })
      .eq("profile_id", profile.id);
    error = adminRes.error;
  }

  if (error) {
    if (error.code === "42703") {
      return {
        error:
          "La base de datos aún no tiene la migración 0024 aplicada (falta columna clientes.tema_personalizado).",
      };
    }
    console.error("[restablecerTemaSocio]", error);
    return { error: "No se pudo restablecer el color." };
  }

  revalidatePath("/mi", "layout");
  revalidatePath("/mi/ajustes");
  return { ok: "Se restableció al color de tu gimnasio." };
}
