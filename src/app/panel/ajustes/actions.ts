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
import { chequearContraste } from "@/lib/contraste";

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

  // Validar campos UI
  const escalaFuente = parseFloat(String(formData.get("escalaFuente") ?? "1"));
  if (![0.875, 1, 1.125, 1.25].includes(escalaFuente)) {
    return { error: "Escala de fuente inválida" };
  }
  tema.escalaFuente = escalaFuente;

  const radiosBordes = String(formData.get("radiosBordes") ?? "normal");
  if (!["tight", "normal", "soft"].includes(radiosBordes)) {
    return { error: "Radio de bordes inválido" };
  }
  tema.radiosBordes = radiosBordes as Tema["radiosBordes"];

  const espaciado = String(formData.get("espaciado") ?? "normal");
  if (!["compact", "normal", "spacious"].includes(espaciado)) {
    return { error: "Espaciado inválido" };
  }
  tema.espaciado = espaciado as Tema["espaciado"];

  const navegacionMovil = String(formData.get("navegacionMovil") ?? "bottom");
  if (!["bottom", "sidebar", "top"].includes(navegacionMovil)) {
    return { error: "Navegación móvil inválida" };
  }
  tema.navegacionMovil = navegacionMovil as Tema["navegacionMovil"];

  const navegacionDesktop = String(formData.get("navegacionDesktop") ?? "sidebar");
  if (!["sidebar", "top"].includes(navegacionDesktop)) {
    return { error: "Navegación desktop inválida" };
  }
  tema.navegacionDesktop = navegacionDesktop as Tema["navegacionDesktop"];

  const densidad = String(formData.get("densidad") ?? "comfortable");
  if (!["compact", "comfortable", "spacious"].includes(densidad)) {
    return { error: "Densidad inválida" };
  }
  tema.densidad = densidad as Tema["densidad"];

  // Validar contraste
  const { hayFallos } = chequearContraste(tema);
  if (hayFallos && formData.get("confirmar_contraste") !== "1") {
    return {
      error:
        "Hay combinaciones de bajo contraste. Revisá los avisos o confirmá que querés guardar igual.",
    };
  }

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

