"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type AjustesState = { error?: string; ok?: string };

export async function actualizarColores(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const colorPrimario = String(formData.get("color_primario") ?? "").trim();
  const colorAcento = String(formData.get("color_acento") ?? "").trim();
  const colorFondo = String(formData.get("color_fondo") ?? "").trim();

  // Validar que sean hex válidos
  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!hexPattern.test(colorPrimario)) {
    return { error: "Color principal inválido (usa formato #RRGGBB)" };
  }
  if (!hexPattern.test(colorAcento)) {
    return { error: "Color de acento inválido (usa formato #RRGGBB)" };
  }
  if (!hexPattern.test(colorFondo)) {
    return { error: "Color de fondo inválido (usa formato #RRGGBB)" };
  }

  // Verificar que el gimnasio sea el del dueño
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({
      color_primario: colorPrimario,
      color_acento: colorAcento,
      color_fondo: colorFondo,
    })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarColores]", error);
    return { error: "No se pudieron guardar los cambios" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/panel");
  revalidatePath("/mi");
  return { ok: "Colores actualizados correctamente" };
}
