"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import {
  CAMPOS_COLOR,
  ESTILOS_VISUALES_KEYS,
  FUENTES,
  isHex,
  parseTema,
  type EstiloVisual,
  type FuenteKey,
  type ReposoCheckin,
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

/** Email real del dueño, solo para recuperar la contraseña (no es el login). */
export async function actualizarEmailRecuperacion(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "El email no parece válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ email_recuperacion: email })
    .eq("id", dueno.id);

  if (error) {
    console.error("[actualizarEmailRecuperacion]", error);
    return { error: "No se pudo guardar el email" };
  }

  revalidatePath("/panel/ajustes");
  return { ok: email ? "Email de recuperación guardado" : "Email quitado" };
}

/** Mensaje de soporte del dueño al superadmin de la plataforma. */
export async function contactarSoporte(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const asunto = String(formData.get("asunto") ?? "").trim().slice(0, 120);
  const mensaje = String(formData.get("mensaje") ?? "").trim().slice(0, 2000);

  if (!asunto || !mensaje) {
    return { error: "Completá el asunto y el mensaje." };
  }

  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, slug")
    .eq("id", dueno.gimnasio_id)
    .single();

  await notificarSuperadmin(
    `Soporte: ${asunto}`,
    `De: ${dueno.nombre} (DNI ${dueno.dni})\nGimnasio: ${
      gym?.nombre ?? dueno.gimnasio_id
    }${gym?.slug ? ` (${gym.slug})` : ""}\n\n${mensaje}`,
  );

  return { ok: "Mensaje enviado. Te respondemos por mail o teléfono." };
}

/** Alias / CBU / titular que ve el socio en la app para transferir la cuota. */
export async function actualizarDatosPago(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const limpiar = (v: FormDataEntryValue | null, max: number) =>
    String(v ?? "").trim().slice(0, max) || null;

  const alias = limpiar(formData.get("pago_alias"), 60);
  const cbu = limpiar(formData.get("pago_cbu"), 40);
  const titular = limpiar(formData.get("pago_titular"), 120);

  if (cbu && !/^\d{18,22}$/.test(cbu)) {
    return { error: "El CBU/CVU son 22 dígitos (o 18 para CVU). Sin espacios." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ pago_alias: alias, pago_cbu: cbu, pago_titular: titular })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarDatosPago]", error);
    return { error: "No se pudo guardar los datos de transferencia" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/mi", "layout");
  return { ok: "Datos de transferencia guardados" };
}

/**
 * Pantalla de reposo (screensaver) del modo check-in. Se guarda anidada en
 * `gimnasios.tema.reposoCheckin`; el resto del tema queda intacto.
 */
export async function actualizarReposoCheckin(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const segundos = Number(formData.get("segundos"));
  if (!Number.isFinite(segundos) || segundos < 15 || segundos > 600) {
    return { error: "El tiempo de reposo va entre 15 y 600 segundos." };
  }

  const mensaje = String(formData.get("mensaje") ?? "")
    .trim()
    .slice(0, 60);
  if (!mensaje) {
    return { error: "Escribí un mensaje para la pantalla de reposo." };
  }

  const intensidad = String(formData.get("intensidad") ?? "normal");
  if (!["sutil", "normal", "estatico"].includes(intensidad)) {
    return { error: "Intensidad inválida" };
  }

  const reposoCheckin: ReposoCheckin = {
    activo: formData.get("activo") === "on",
    segundos: Math.round(segundos),
    mensaje,
    mostrarReloj: formData.get("mostrarReloj") === "on",
    mostrarLogo: formData.get("mostrarLogo") === "on",
    intensidad: intensidad as ReposoCheckin["intensidad"],
  };

  const supabase = await createClient();
  const { data: prevRow } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", gimnasioId)
    .single();

  const tema = parseTema(prevRow?.tema);
  tema.reposoCheckin = reposoCheckin;

  const { error } = await supabase
    .from("gimnasios")
    .update({ tema })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarReposoCheckin]", error);
    return { error: "No se pudo guardar la pantalla de reposo" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/checkin", "layout");
  return { ok: "Pantalla de reposo actualizada" };
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

  // La pantalla de reposo del check-in vive en el mismo jsonb pero no la edita
  // este form: la preservamos para no pisarla al guardar colores/tipografía.
  const { data: prevRow } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", gimnasioId)
    .single();
  tema.reposoCheckin = parseTema(prevRow?.tema).reposoCheckin;

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

