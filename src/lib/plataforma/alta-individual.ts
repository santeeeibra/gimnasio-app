import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TipoCuentaPropia = "individual" | "negocio_liviano";

// Estructura de una cuenta sin gimnasio real: cada persona tiene su propio
// "gimnasio" (una fila, tipo_cuenta individual o negocio_liviano), su profile
// de dueño y, si es individual, su ficha de cliente (la piden /mi/rutina,
// /mi/perfil y el peso). Es el único camino de alta para estas cuentas:
// /registrarse, "Atleta Solo" de /registro-gimnasio y el primer ingreso con
// Google lo usan. Nunca se comparte un gimnasio entre personas: todo el
// aislamiento de datos (RLS, feed, ranking, aforo, mensajes) va por gimnasio_id.
//
// El usuario de Auth lo crea quien llama. Si algo falla acá, se borra lo que
// se haya creado de esta estructura; borrar el usuario de Auth es decisión
// de quien llama.
export async function crearEstructuraIndividual(
  admin: SupabaseClient,
  datos: {
    uid: string;
    nombre: string;
    email: string | null;
    tipo: TipoCuentaPropia;
    tycAceptado?: boolean;
  },
): Promise<{ error?: string }> {
  const { uid, tipo } = datos;
  const nombre = datos.nombre.trim() || "Mi cuenta";
  const email = datos.email?.trim().toLowerCase() || null;
  const slug = `user-${uid.substring(0, 8)}`;

  const { data: gym, error: gymError } = await admin
    .from("gimnasios")
    .insert({ nombre, slug, estado: "prueba", tipo_cuenta: tipo })
    .select("id")
    .single();

  if (gymError || !gym) {
    console.error("[alta-individual] gimnasio", gymError);
    return { error: "No se pudo crear la cuenta. Probá de nuevo en un momento." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: uid,
    gimnasio_id: gym.id,
    rol: "dueno",
    dni: `DNI-${uid.substring(0, 8)}`,
    nombre,
    debe_cambiar_clave: false,
    email_recuperacion: email,
    ...(datos.tycAceptado ? { tyc_aceptado_en: new Date().toISOString() } : {}),
  });

  if (profileError) {
    console.error("[alta-individual] profile", profileError);
    await admin.from("gimnasios").delete().eq("id", gym.id);
    return { error: "No se pudo guardar tu perfil. Probá de nuevo en un momento." };
  }

  if (tipo === "individual") {
    const { error: clienteError } = await admin.from("clientes").insert({
      gimnasio_id: gym.id,
      profile_id: uid,
      estado_cuota: "al_dia",
      email,
    });
    if (clienteError) {
      console.error("[alta-individual] cliente", clienteError);
      await admin.from("profiles").delete().eq("id", uid);
      await admin.from("gimnasios").delete().eq("id", gym.id);
      return { error: "No se pudo crear tu ficha. Probá de nuevo en un momento." };
    }
  }

  return {};
}

// A dónde va cada cuenta después de entrar. Las individuales tienen perfil
// dueño y su inicio es /panel, que les muestra InicioIndividual.
export function destinoInicio(rol: string | null | undefined, _tipoCuenta?: string | null) {
  return rol === "dueno" || rol === "staff" ? "/panel" : "/mi";
}

// Alta completa con email + contraseña (usuario de Auth + estructura propia +
// sesión iniciada). También la usa "Atleta Solo" de /registro-gimnasio.
export async function crearCuentaConEmail(datos: {
  nombre: string;
  email: string;
  password: string;
  tipo: TipoCuentaPropia;
  tycAceptado: boolean;
}): Promise<{ error?: string }> {
  // service_role: el alta crea filas en gimnasios/profiles/clientes, y esas
  // tablas no tienen policy de INSERT para usuarios anónimos (RLS las bloquea).
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: datos.email,
    password: datos.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return { error: "Ese email ya tiene una cuenta. Iniciá sesión." };
    }
    console.error("[alta-individual] auth", authError);
    return { error: "No se pudo crear la cuenta. Probá de nuevo en un momento." };
  }

  const uid = authData.user.id;
  const estructura = await crearEstructuraIndividual(admin, {
    uid,
    nombre: datos.nombre,
    email: datos.email,
    tipo: datos.tipo,
    tycAceptado: datos.tycAceptado,
  });
  if (estructura.error) {
    await admin.auth.admin.deleteUser(uid);
    return estructura;
  }

  const db = await createClient();
  const { error: loginError } = await db.auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
  });
  if (loginError) {
    redirect("/login");
  }
  return {};
}
