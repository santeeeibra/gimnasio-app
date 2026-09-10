"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// Rate limit en memoria: 1 alta cada 60 s por IP. No persiste entre despliegues;
// alcanza para frenar un bot que dispara altas en loop.
const VENTANA_MS = 60_000;
const ultimasAltas = new Map<string, number>();

export async function registrarCuentaIndependiente(data: FormData) {
  const nombre = String(data.get("nombre") ?? "").trim();
  const email = String(data.get("email") ?? "").trim().toLowerCase();
  const password = String(data.get("password") ?? "");
  const tipo = data.get("tipo") as "individual" | "negocio_liviano";
  // Honeypot: campo oculto que un humano nunca completa. Si viene con algo, es bot.
  const trampa = String(data.get("empresa") ?? "").trim();

  if (trampa) {
    throw new Error("No se pudo completar el registro.");
  }

  if (!nombre || !email || !password || !tipo) {
    throw new Error("Faltan datos");
  }
  if (password.length < 6) {
    throw new Error("La contraseña debe tener al menos 6 caracteres.");
  }

  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "desconocida";
  const ahora = Date.now();
  const previa = ultimasAltas.get(ip);
  if (previa && ahora - previa < VENTANA_MS) {
    throw new Error("Esperá un minuto antes de volver a intentar.");
  }
  ultimasAltas.set(ip, ahora);
  if (ultimasAltas.size > 500) {
    for (const [k, t] of ultimasAltas) {
      if (ahora - t > VENTANA_MS) ultimasAltas.delete(k);
    }
  }

  // Se usa el cliente service_role: el alta crea filas en gimnasios/profiles/clientes,
  // y esas tablas no tienen policy de INSERT para usuarios anónimos (RLS las bloquea).
  const admin = createAdminClient();

  // 1. Crear usuario de Auth ya confirmado (sin mail de verificación)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      throw new Error("Ese email ya tiene una cuenta. Iniciá sesión.");
    }
    throw new Error(authError?.message || "Error al registrar");
  }

  const uid = authData.user.id;
  const slug = `user-${uid.substring(0, 8)}`;

  // 2. Crear gimnasio (cada cuenta individual/liviana es un gimnasio en sí misma)
  const { data: gymData, error: gymError } = await admin
    .from("gimnasios")
    .insert({ nombre, slug, estado: "prueba" })
    .select("id")
    .single();

  if (gymError) {
    await admin.auth.admin.deleteUser(uid);
    throw new Error(`Error al crear la cuenta: ${gymError.message}`);
  }

  // best-effort: si todavía no se aplicó la migración 0041, la columna no existe
  // y esto falla en silencio sin cortar el registro.
  await admin.from("gimnasios").update({ tipo_cuenta: tipo }).eq("id", gymData.id);

  // 3. Crear profile de dueño (DNI falso para evitar colisiones)
  const dni = `DNI-${uid.substring(0, 8)}`;
  const { error: profileError } = await admin.from("profiles").insert({
    id: uid,
    gimnasio_id: gymData.id,
    rol: "dueno",
    dni,
    nombre,
    debe_cambiar_clave: false,
    email_recuperacion: email,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(uid);
    throw new Error(`Error al guardar el perfil: ${profileError.message}`);
  }

  // 4. Si es individual, crear cliente asociado al dueño
  if (tipo === "individual") {
    const { error: clienteError } = await admin.from("clientes").insert({
      gimnasio_id: gymData.id,
      profile_id: uid,
      estado_cuota: "al_dia",
      email,
    });
    if (clienteError) {
      throw new Error(`Error al crear el socio: ${clienteError.message}`);
    }
  }

  // 5. Iniciar sesión (setea las cookies de sesión en la respuesta)
  const db = await createClient();
  const { error: loginError } = await db.auth.signInWithPassword({ email, password });
  if (loginError) {
    redirect("/login");
  }

  redirect("/panel");
}
