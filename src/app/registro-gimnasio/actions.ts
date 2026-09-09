"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";

export type RegistroState = {
  error?: string;
  success?: boolean;
};

export async function registrarGimnasio(
  _prev: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const tipoCuenta = String(formData.get("tipoCuenta") ?? "dueno").trim();
  const nombreGymRaw = String(formData.get("nombreGimnasio") ?? "").trim();
  const nombreDueno = String(formData.get("nombreDueno") ?? "").trim();
  const dniRaw = String(formData.get("dni") ?? "").trim();
  const emailRecuperacion = String(formData.get("email") ?? "").trim().toLowerCase();
  const clave = String(formData.get("clave") ?? "");

  const dniLimpio = dniRaw.replace(/\D/g, "");
  if (!dniLimpio || dniLimpio.length < 5) {
    return { error: "El DNI/Documento debe ser numérico y tener al menos 5 dígitos." };
  }

  if (!nombreDueno || !clave || clave.length < 6) {
    return { error: "Por favor completá tu nombre y una contraseña de al menos 6 caracteres." };
  }

  const admin = createAdminClient();

  // Si es Atleta Independiente (B2C Solo), asignamos o buscamos el gimnasio genérico 'atletas'
  let slugGym = "";
  let nombreGymFinal = "";

  if (tipoCuenta === "solo") {
    slugGym = "atletas";
    nombreGymFinal = "Atletas SysGym";
  } else {
    if (!nombreGymRaw) {
      return { error: "Ingresá el nombre de tu gimnasio o centro de entrenamiento." };
    }
    nombreGymFinal = nombreGymRaw;
    // Generar slug limpio
    slugGym = nombreGymRaw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slugGym) slugGym = `gym-${Date.now()}`;
  }

  // Buscar si ya existe el gimnasio por slug (si no es 'atletas')
  let gymId = "";

  if (tipoCuenta === "solo") {
    const { data: gymExistente } = await admin
      .from("gimnasios")
      .select("id")
      .eq("slug", "atletas")
      .maybeSingle();

    if (gymExistente) {
      gymId = gymExistente.id;
    } else {
      const { data: nuevoGym, error: errGym } = await admin
        .from("gimnasios")
        .insert({
          nombre: "Atletas SysGym",
          slug: "atletas",
          estado: "activo",
        })
        .select("id")
        .single();
      if (errGym) return { error: "Error al configurar la cuenta de atleta. Intentá de nuevo." };
      gymId = nuevoGym.id;
    }
  } else {
    // Verificar slug duplicado
    const { data: existente } = await admin
      .from("gimnasios")
      .select("id, slug")
      .eq("slug", slugGym)
      .maybeSingle();

    if (existente) {
      slugGym = `${slugGym}-${Math.floor(Math.random() * 899 + 100)}`;
    }

    const { data: nuevoGym, error: errGym } = await admin
      .from("gimnasios")
      .insert({
        nombre: nombreGymFinal,
        slug: slugGym,
        estado: "prueba", // 14 días de prueba gratis
      })
      .select("id")
      .single();

    if (errGym) {
      return { error: `Error al crear el gimnasio: ${errGym.message}` };
    }
    gymId = nuevoGym.id;
  }

  // Email sintético para auth
  const emailAuth = dniAEmail(dniLimpio, slugGym);

  // Crear usuario en Auth
  const { data: createdUser, error: errAuth } = await admin.auth.admin.createUser({
    email: emailAuth,
    password: clave,
    email_confirm: true,
  });

  if (errAuth) {
    if (errAuth.message.includes("already registered")) {
      return { error: "Este DNI ya está registrado en este gimnasio. Intentá iniciar sesión." };
    }
    return { error: `Error al crear tu usuario: ${errAuth.message}` };
  }

  // Asignar Perfil
  const rol = tipoCuenta === "solo" ? "cliente" : "dueno";
  const { error: errProf } = await admin.from("profiles").insert({
    id: createdUser.user.id,
    gimnasio_id: gymId,
    rol: rol,
    dni: dniLimpio,
    nombre: nombreDueno,
    debe_cambiar_clave: false,
    email_recuperacion: emailRecuperacion || null,
  });

  if (errProf) {
    return { error: `Error al guardar perfil: ${errProf.message}` };
  }

  // Iniciar sesión inmediatamente
  const supabase = await createClient();
  const { error: errLogin } = await supabase.auth.signInWithPassword({
    email: emailAuth,
    password: clave,
  });

  if (errLogin) {
    redirect(`/login?gimnasio=${slugGym}&dni=${dniLimpio}`);
  }

  // Redirigir al panel correspondiente
  redirect(rol === "dueno" ? "/panel" : "/mi");
}
