"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CAMPOS_COLOR,
  FUENTES,
  isHex,
  type FuenteKey,
  type Tema,
} from "@/lib/tema";

export type AjustesState = { error?: string; ok?: string };

export async function actualizarTema(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const tema = {} as Tema;
  for (const { key, label } of CAMPOS_COLOR) {
    const v = String(formData.get(key) ?? "").trim();
    if (!isHex(v)) {
      return { error: `${label}: color inválido (usá formato #RRGGBB)` };
    }
    tema[key] = v;
  }

  const fuente = String(formData.get("fuente") ?? "");
  if (!(fuente in FUENTES)) {
    return { error: "Tipografía inválida" };
  }
  tema.fuente = fuente as FuenteKey;

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ tema })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarTema]", error);
    return { error: "No se pudieron guardar los cambios" };
  }

  revalidatePath("/panel", "layout");
  revalidatePath("/mi", "layout");
  return { ok: "Tema actualizado correctamente" };
}
