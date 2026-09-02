"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CAMPOS_COLOR,
  ESTILOS_VISUALES_KEYS,
  FUENTES,
  isHex,
  type EstiloVisual,
  type FuenteKey,
  type Tema,
} from "@/lib/tema";
import { chequearBloqueos, chequearContraste } from "@/lib/contraste";

export type AjustesState = { error?: string; ok?: string };

/** Persiste (o limpia) la URL pública del logo del gimnasio. */
export async function guardarLogo(
  gimnasioId: string,
  logoUrl: string | null,
): Promise<{ error?: string; ok?: boolean }> {
  const dueno = await requireDueno();
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }
  if (logoUrl !== null && !/^https?:\/\/\S+$/.test(logoUrl)) {
    return { error: "URL de logo inválida" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ logo_url: logoUrl })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[guardarLogo]", error);
    return { error: "No se pudo guardar el logo" };
  }

  revalidatePath("/panel", "layout");
  revalidatePath("/mi", "layout");
  return { ok: true };
}

/** Días antes del vencimiento en que se avisa a los socios por push. */
export async function actualizarDiasAvisoMorosidad(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const dias = Number(formData.get("dias_aviso_morosidad"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 15) {
    return { error: "Elegí un número de días entre 1 y 15." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ dias_aviso_morosidad: dias })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarDiasAvisoMorosidad]", error);
    return { error: "No se pudo guardar el cambio" };
  }

  revalidatePath("/panel/ajustes");
  return { ok: "Aviso de vencimiento actualizado" };
}

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

  const estiloVisual = String(formData.get("estiloVisual") ?? "clasico");
  if (!ESTILOS_VISUALES_KEYS.includes(estiloVisual as EstiloVisual)) {
    return { error: "Estilo visual inválido" };
  }
  tema.estiloVisual = estiloVisual as EstiloVisual;

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

  // Bloqueos duros: legibilidad básica y separación fondo/tarjetas. Sin excepción.
  const { bloqueado, motivos } = chequearBloqueos(tema);
  if (bloqueado) {
    return { error: motivos.join(" ") };
  }

  // Validar contraste (avisos salteables con confirmación)
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

