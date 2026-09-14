"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import {
  CAMPOS_COLOR,
  ESTILOS_VISUALES_KEYS,
  FUENTES,
  isHex,
  parseTema,
  type CheckinFondo,
  type CheckinFondoOrigen,
  type EstiloVisual,
  type FuenteKey,
  type ReposoCheckin,
  type Tema,
} from "@/lib/tema";
import { chequearBloqueos, chequearContraste } from "@/lib/contraste";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";

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

  const supabase = await createClient();
  const planInfo = await verificarPlanGimnasio(supabase, dueno.gimnasio_id);
  if (!planInfo.permiteAvisosMorosidad) {
    return { error: "El aviso de morosidad es una función exclusiva del Plan Elite." };
  }

  const dias = Number(formData.get("dias_aviso_morosidad"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 15) {
    return { error: "Elegí un número de días entre 1 y 15." };
  }

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

/** Capacidad máxima de socios en sala, usada por el Medidor de Aforo (/mi). */
export async function actualizarCapacidadMaxima(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const capacidad = Number(formData.get("capacidad_maxima"));
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 2000) {
    return { error: "Elegí una capacidad entre 1 y 2000 personas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ capacidad_maxima: capacidad })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarCapacidadMaxima]", error);
    return { error: "No se pudo guardar el cambio" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/mi", "layout");
  return { ok: "Capacidad máxima actualizada" };
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

const CONDICIONES_IVA = ["monotributo", "responsable_inscripto", "exento"] as const;

/** Habilita/deshabilita facturación electrónica AFIP para el gimnasio (opt-in del dueño). */
export async function actualizarDatosAfip(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const habilitado = formData.get("afip_habilitado") === "on";

  const limpiar = (v: FormDataEntryValue | null, max: number) =>
    String(v ?? "").trim().slice(0, max) || null;

  const cuit = limpiar(formData.get("afip_cuit"), 13);
  const razonSocial = limpiar(formData.get("afip_razon_social"), 120);
  const condicionIva = limpiar(formData.get("afip_condicion_iva"), 30);
  const puntoVentaRaw = limpiar(formData.get("afip_punto_venta"), 6);
  const puntoVenta = puntoVentaRaw ? Number(puntoVentaRaw) : null;

  if (habilitado) {
    if (!cuit || !/^\d{11}$/.test(cuit)) {
      return { error: "El CUIT son 11 dígitos sin guiones" };
    }
    if (!razonSocial) {
      return { error: "Falta la razón social" };
    }
    if (!condicionIva || !CONDICIONES_IVA.includes(condicionIva as (typeof CONDICIONES_IVA)[number])) {
      return { error: "Elegí una condición frente al IVA válida" };
    }
    if (!puntoVenta || !Number.isInteger(puntoVenta) || puntoVenta <= 0) {
      return { error: "El punto de venta tiene que ser un número mayor a 0" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({
      afip_habilitado: habilitado,
      afip_cuit: cuit,
      afip_razon_social: razonSocial,
      afip_condicion_iva: condicionIva,
      afip_punto_venta: puntoVenta,
    })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarDatosAfip]", error);
    return { error: "No se pudieron guardar los datos de AFIP" };
  }

  revalidatePath("/panel/ajustes");
  return {
    ok: habilitado
      ? "Facturación AFIP habilitada"
      : "Facturación AFIP deshabilitada",
  };
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

  const supabase = await createClient();
  const planInfo = await verificarPlanGimnasio(supabase, dueno.gimnasio_id);
  if (!planInfo.permiteReposoCheckin) {
    return { error: "La pantalla de reposo es una función exclusiva del Plan Elite." };
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

/**
 * Fija la imagen de fondo de la pantalla de check-in (preset de SysGym o
 * subida propia del dueño, ya comprimida y ubicada en el bucket
 * `checkin-fondos` antes de llamar esto). Activa el fondo automáticamente.
 */
export async function guardarCheckinFondoImagen(
  gimnasioId: string,
  imagenUrl: string,
  origen: CheckinFondoOrigen,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }
  if (!/^\/|^https?:\/\//.test(imagenUrl)) {
    return { error: "URL de imagen inválida" };
  }

  const supabase = await createClient();
  const planInfo = await verificarPlanGimnasio(supabase, dueno.gimnasio_id);
  if (!planInfo.permiteCheckin) {
    return { error: "El fondo de check-in es una función exclusiva del Plan Elite." };
  }

  const { data: prevRow } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", gimnasioId)
    .single();

  const tema = parseTema(prevRow?.tema);
  const checkinFondo: CheckinFondo = {
    ...tema.checkinFondo,
    activo: true,
    imagenUrl,
    origen,
  };
  tema.checkinFondo = checkinFondo;

  const { error } = await supabase
    .from("gimnasios")
    .update({ tema })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[guardarCheckinFondoImagen]", error);
    return { error: "No se pudo guardar el fondo de check-in" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/checkin", "layout");
  return { ok: "Fondo de check-in actualizado" };
}

/** Quita la imagen de fondo (vuelve a la pantalla de check-in lisa). */
export async function quitarCheckinFondoImagen(
  gimnasioId: string,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const supabase = await createClient();
  const { data: prevRow } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", gimnasioId)
    .single();

  const tema = parseTema(prevRow?.tema);
  tema.checkinFondo = { activo: false, imagenUrl: null, origen: null, oscurecido: tema.checkinFondo.oscurecido };

  const { error } = await supabase
    .from("gimnasios")
    .update({ tema })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[quitarCheckinFondoImagen]", error);
    return { error: "No se pudo quitar el fondo de check-in" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/checkin", "layout");
  return { ok: "Fondo de check-in quitado" };
}

/** Toggle de activo/desactivo + intensidad del oscurecido sobre la imagen. */
export async function actualizarCheckinFondoAjustes(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");

  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const oscurecido = Number(formData.get("oscurecido"));
  if (!Number.isFinite(oscurecido) || oscurecido < 0 || oscurecido > 90) {
    return { error: "El oscurecido va entre 0 y 90." };
  }

  const supabase = await createClient();
  const { data: prevRow } = await supabase
    .from("gimnasios")
    .select("tema")
    .eq("id", gimnasioId)
    .single();

  const tema = parseTema(prevRow?.tema);
  tema.checkinFondo = {
    ...tema.checkinFondo,
    activo: formData.get("activo") === "on",
    oscurecido: Math.round(oscurecido),
  };

  const { error } = await supabase
    .from("gimnasios")
    .update({ tema })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarCheckinFondoAjustes]", error);
    return { error: "No se pudo guardar el fondo de check-in" };
  }

  revalidatePath("/panel/ajustes");
  revalidatePath("/checkin", "layout");
  return { ok: "Fondo de check-in actualizado" };
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

// Cuentas individuales (tipo_cuenta = "individual", ver auth/callback/route.ts):
// entraron con Google y no tienen contraseña propia en auth.users. Esto les
// permite fijar un teléfono + contraseña para loguearse después con
// nombre/email/teléfono desde la pestaña "Cuenta individual" del login
// (loginIndividual en login/actions.ts), sin depender de Google cada vez.
export async function actualizarCredencialesIndividuales(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();

  const admin = createAdminClient();
  const { data: gym } = await admin
    .from("gimnasios")
    .select("tipo_cuenta")
    .eq("id", dueno.gimnasio_id)
    .maybeSingle();
  if (gym?.tipo_cuenta !== "individual") {
    return { error: "Esta opción es solo para cuentas individuales." };
  }

  const telefonoRaw = String(formData.get("telefono") ?? "").trim();
  const telefono = telefonoRaw ? telefonoRaw.replace(/[^\d+]/g, "") : null;
  const clave = String(formData.get("clave") ?? "");

  if (clave && clave.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  if (telefono) {
    const { error: telErr } = await admin
      .from("profiles")
      .update({ telefono })
      .eq("id", dueno.id);
    if (telErr) {
      console.error("[actualizarCredencialesIndividuales]", telErr);
      return { error: "No se pudo guardar el teléfono." };
    }
  }

  if (clave) {
    const { error: passErr } = await admin.auth.admin.updateUserById(dueno.id, {
      password: clave,
    });
    if (passErr) {
      return { error: `No se pudo guardar la contraseña: ${passErr.message}` };
    }

    // La Admin API revoca las sesiones existentes al cambiar la contraseña
    // (medida de seguridad de Supabase): sin esto, el dueño quedaría
    // deslogueado apenas Next revalida esta página y nunca vería el mensaje
    // de éxito. Reautenticamos acá mismo con la contraseña nueva para que
    // la sesión (cookies) siga siendo válida.
    const { data: perfil } = await admin
      .from("profiles")
      .select("email_recuperacion")
      .eq("id", dueno.id)
      .maybeSingle();
    if (perfil?.email_recuperacion) {
      const supabase = await createClient();
      const { error: reloginErr } = await supabase.auth.signInWithPassword({
        email: perfil.email_recuperacion,
        password: clave,
      });
      if (reloginErr) {
        // La contraseña sí se guardó; solo avisamos que hay que volver a entrar.
        return {
          ok: "Contraseña guardada. Volvé a entrar con tu contraseña nueva.",
        };
      }
    }
  }

  revalidatePath("/panel/ajustes");
  return {
    ok:
      telefono && clave
        ? "Teléfono y contraseña guardados."
        : clave
          ? "Contraseña guardada."
          : "Teléfono guardado.",
  };
}

/** Prende/apaga el asistente IA (SPEC_ASISTENTE_IA_N8N.md). Exclusivo Elite. */
export async function actualizarAsistenteIa(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const admin = createAdminClient();
  const planInfo = await verificarPlanGimnasio(admin, dueno.gimnasio_id);
  if (!planInfo.permiteAsistenteIa) {
    return { error: "El asistente IA es una función exclusiva del Plan Elite." };
  }

  const activo = formData.get("activo") === "on";

  const { error } = await admin
    .from("gimnasios")
    .update({ asistente_ia_activo: activo })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarAsistenteIa]", error);
    return { error: "No se pudo guardar el asistente IA" };
  }

  revalidatePath("/panel/ajustes");
  return { ok: activo ? "Asistente IA activado correctamente" : "Asistente IA desactivado correctamente" };
}

/** Guarda una plantilla de cumpleaños editada a mano por el dueño (o la
 * borra para que se regenere con IA en el próximo cumpleaños si mandan el
 * campo vacío). Debe contener el placeholder {{nombre}} o el saludo sale sin
 * nombre para todos los socios. */
export async function actualizarPlantillaCumpleanos(
  _prev: AjustesState,
  formData: FormData,
): Promise<AjustesState> {
  const dueno = await requireDueno();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  if (gimnasioId !== dueno.gimnasio_id) {
    return { error: "No podés modificar este gimnasio" };
  }

  const texto = String(formData.get("plantilla_cumpleanos") ?? "").trim();

  if (texto && !texto.includes("{{nombre}}")) {
    return {
      error: 'La plantilla necesita el texto "{{nombre}}" en algún punto, para que se reemplace por el nombre de cada socio.',
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("gimnasios")
    .update({ plantilla_cumpleanos: texto || null })
    .eq("id", gimnasioId);

  if (error) {
    console.error("[actualizarPlantillaCumpleanos]", error);
    return { error: "No se pudo guardar la plantilla" };
  }

  revalidatePath("/panel/ajustes");
  return {
    ok: texto
      ? "Plantilla de cumpleaños guardada"
      : "Plantilla borrada: se va a regenerar con IA en el próximo cumpleaños",
  };
}

