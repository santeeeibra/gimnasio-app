"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sugerirReferralCode, esReferralCodeValido } from "@/lib/partners/codigos";
import { compensateFailedPartnerRegistration } from "@/lib/partners/registration";
import { PARTNER_TERMS_VERSION } from "@/lib/partners/terms";

export type RegistroPartnerState = {
  error?: string;
  success?: boolean;
  requiresEmailVerification?: boolean;
};

async function codigoDisponible(nombre: string, userId: string): Promise<string> {
  const admin = createAdminClient();
  const baseSugerida = sugerirReferralCode(nombre);
  const base = esReferralCodeValido(baseSugerida)
    ? baseSugerida
    : `partner-${userId.slice(0, 8)}`;

  for (let intento = 0; intento < 6; intento += 1) {
    const suffix = intento === 0 ? "" : `-${userId.replaceAll("-", "").slice(intento, intento + 5)}`;
    const candidato = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    const { data } = await admin
      .from("partners")
      .select("id")
      .eq("referral_code", candidato)
      .maybeSingle();
    if (!data) return candidato;
  }

  return `partner-${userId.replaceAll("-", "").slice(0, 16)}`;
}

export async function registrarPartnerAction(
  _prev: RegistroPartnerState,
  formData: FormData,
): Promise<RegistroPartnerState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const emailIngresado = String(formData.get("email") ?? "").trim().toLowerCase();
  const clave = String(formData.get("clave") ?? "");
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const ciudad = String(formData.get("ciudad") ?? "").trim();
  const provincia = String(formData.get("provincia") ?? "").trim();
  const aceptaTerminos = formData.get("acepta_terminos") === "on";

  if (nombre.length < 2) return { error: "Ingresá tu nombre y apellido." };
  if (!emailIngresado || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailIngresado)) {
    return { error: "Ingresá un email válido." };
  }
  if (!whatsapp) return { error: "Ingresá tu WhatsApp." };
  if (!ciudad || !provincia) return { error: "Ingresá tu ciudad y provincia." };
  if (!aceptaTerminos) return { error: "Tenés que aceptar los términos para registrarte." };

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user: sessionUser } } = await supabase.auth.getUser();

  let userId: string;
  let email: string;
  let createdNewAuthUser = false;
  let requiresEmailVerification = false;

  if (sessionUser) {
    userId = sessionUser.id;
    email = sessionUser.email?.toLowerCase() ?? emailIngresado;
    if (email !== emailIngresado) {
      return { error: "El email debe coincidir con la cuenta con la que iniciaste sesión." };
    }
  } else {
    if (clave.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailIngresado,
      password: clave,
      options: {
        ...(baseUrl ? { emailRedirectTo: `${baseUrl}/auth/callback` } : {}),
        data: { nombre, signup_kind: "partner" },
      },
    });
    if (authError || !authData.user) {
      return { error: "No se pudo crear la cuenta. Si el email ya existe, iniciá sesión y volvé a registrarte." };
    }
    userId = authData.user.id;
    email = emailIngresado;
    createdNewAuthUser = true;
    requiresEmailVerification = !authData.session;
  }

  const { data: yaExiste } = await admin
    .from("partners")
    .select("id, estado")
    .eq("user_id", userId)
    .maybeSingle();
  if (yaExiste) redirect("/partner");

  const referralCode = await codigoDisponible(nombre, userId);
  const ahora = new Date().toISOString();
  const { error: insertError } = await admin.from("partners").insert({
    user_id: userId,
    nombre,
    email,
    whatsapp,
    ciudad,
    provincia,
    referral_code: referralCode,
    estado: "activo",
    terminos_version: PARTNER_TERMS_VERSION,
    terminos_aceptados_at: ahora,
    actualizado_at: ahora,
  });

  if (insertError) {
    const compensation = await compensateFailedPartnerRegistration({
      createdNewAuthUser,
      userId,
      deleteAuthUser: async (id) => {
        const { error } = await admin.auth.admin.deleteUser(id);
        return !error;
      },
    });

    if (compensation.recoveryRequired) {
      console.error("registro_partner_requiere_recuperacion", { userId, insertError });
      return {
        error: "La cuenta Auth se creó, pero el alta Partner no pudo completarse. Contactá a soporte para recuperar el registro; no intentes crear otra cuenta.",
      };
    }
    return { error: "No se pudo completar el alta Partner. La cuenta incompleta fue revertida; intentá nuevamente." };
  }

  if (requiresEmailVerification) {
    return { success: true, requiresEmailVerification: true };
  }
  redirect("/partner");
}
