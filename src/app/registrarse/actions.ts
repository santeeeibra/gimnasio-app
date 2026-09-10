"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function registrarCuentaIndependiente(data: FormData) {
  const nombre = data.get("nombre") as string;
  const email = data.get("email") as string;
  const password = data.get("password") as string;
  const tipo = data.get("tipo") as "individual" | "negocio_liviano";

  if (!nombre || !email || !password || !tipo) {
    throw new Error("Faltan datos");
  }

  const db = await createClient();

  // Crear auth user con el email real (auth.users no expone email a public por defecto pero lo usa supabase)
  const { data: authData, error: authError } = await db.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Error al registrar");
  }

  // Generar slug falso
  const slug = `user-${authData.user.id.substring(0, 8)}`;
  
  // 1. Crear gimnasio
  const { data: gymData, error: gymError } = await db
    .from("gimnasios")
    .insert({ nombre, slug, tipo_cuenta: tipo })
    .select("id")
    .single();

  if (gymError) throw gymError;

  // 2. Crear profile de dueño (DNI falso para evitar colisiones)
  const dni = `DNI-${authData.user.id.substring(0, 8)}`;
  
  const { error: profileError } = await db.from("profiles").insert({
    id: authData.user.id,
    gimnasio_id: gymData.id,
    rol: "dueno",
    dni,
    nombre,
    debe_cambiar_clave: false,
    email_recuperacion: email,
  });

  if (profileError) throw profileError;

  // 3. Si es individual, crear cliente asociado al dueño
  if (tipo === "individual") {
    const { error: clienteError } = await db.from("clientes").insert({
      gimnasio_id: gymData.id,
      profile_id: authData.user.id,
      estado_cuota: "al_dia",
      email,
    });
    if (clienteError) throw clienteError;
  }

  redirect("/panel");
}
