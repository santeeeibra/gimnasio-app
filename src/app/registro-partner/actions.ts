"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sugerirReferralCode, esReferralCodeValido } from "@/lib/partners/codigos";

export type RegistroPartnerState = {
  error?: string;
  success?: boolean;
};

export async function registrarPartnerAction(
  _prev: RegistroPartnerState,
  formData: FormData
): Promise<RegistroPartnerState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const clave = String(formData.get("clave") ?? "");
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  if (!nombre || nombre.length < 2) {
    return { error: "Por favor ingresá tu nombre completo." };
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Por favor ingresá un email válido." };
  }

  if (!clave || clave.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = createAdminClient();

  // 1. Crear usuario auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: clave,
    email_confirm: true,
    user_metadata: { nombre, rol: "dueno" },
  });

  if (authErr || !authData.user) {
    if (authErr?.message?.includes("already registered") || authErr?.message?.includes("unique")) {
      return { error: "Este email ya está registrado. Por favor iniciá sesión." };
    }
    return { error: authErr?.message ?? "Error al registrar la cuenta." };
  }

  const userId = authData.user.id;

  // 2. Crear un gimnasio propio "individual" para el partner (nunca reusar
  // un gimnasio real: mezclaría al partner con los datos de un cliente vía
  // RLS por gimnasio_id). Mismo patrón que asegurarPerfilGoogleAction.
  const { data: gymNuevo, error: gymErr } = await admin
    .from("gimnasios")
    .insert({
      nombre: `Partner: ${nombre}`,
      slug: `partner-${userId.slice(0, 8)}`,
      estado: "activo",
      tipo_cuenta: "individual",
    })
    .select("id")
    .single();

  if (gymErr || !gymNuevo) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "No se pudo crear la cuenta de Partner. Intentá nuevamente." };
  }

  const gymId = gymNuevo.id;

  // 3. Crear perfil de usuario
  await admin.from("profiles").insert({
    id: userId,
    gimnasio_id: gymId,
    rol: "dueno",
    dni: email.split("@")[0].slice(0, 12),
    nombre,
    telefono,
    debe_cambiar_clave: false,
    email_recuperacion: email,
  });

  // 4. Crear registro de Partner
  let code = sugerirReferralCode(nombre);
  if (!esReferralCodeValido(code)) {
    code = `partner-${userId.slice(0, 6)}`;
  }

  const { data: existente } = await admin
    .from("partners")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (existente) {
    code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
  }

  await admin.from("partners").insert({
    user_id: userId,
    nombre,
    email,
    referral_code: code,
    estado: "activo",
  });

  // 5. Iniciar sesión automáticamente
  const supabase = await createClient();
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email,
    password: clave,
  });

  if (loginErr) {
    redirect("/login");
  }

  redirect("/panel/partner");
}
