import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { buscarGimnasioReal } from "./gimnasio-publico";

type AdminDb = ReturnType<typeof createAdminClient>;

/** True solo para cuentas creadas por solicitarAltaSocio (nunca para socios cargados por el dueño). */
export async function esSolicitudAlta(admin: AdminDb, uid: string): Promise<boolean> {
  const { data } = await admin.auth.admin.getUserById(uid);
  return data?.user?.app_metadata?.solicitud_alta === true;
}

// Un socio pide el alta solo, desde el registro del login. Queda creado pero
// BLOQUEADO (clientes.acceso_habilitado = false): ve "Tu cuenta está pendiente"
// en /mi hasta que el dueño la apruebe desde el panel o registre su primer
// pago (cobro-socio.ts habilita el acceso). Mientras está pendiente no ocupa
// cupo: cupoSocios() solo cuenta acceso_habilitado = true.
export async function solicitarAltaSocio(datos: {
  gimnasio: string;
  nombre: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  clave: string;
}): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const gym = await buscarGimnasioReal(admin, datos.gimnasio);
  if (!gym) {
    return { error: "No encontramos ese gimnasio. Pedile a recepción el nombre o el código exacto." };
  }
  if (gym.estado === "suspendido") {
    return { error: "Ese gimnasio no está recibiendo altas en este momento." };
  }

  const { data: creado, error: authError } = await admin.auth.admin.createUser({
    email: dniAEmail(datos.dni, gym.slug),
    password: datos.clave,
    email_confirm: true,
    // Marca que solo escribe el servidor: distingue esta solicitud de los
    // socios que el dueño cargó sin pago (también con acceso_habilitado=false).
    app_metadata: { solicitud_alta: true },
  });
  if (authError || !creado.user) {
    if (authError?.message?.toLowerCase().includes("already")) {
      return { error: "Ya hay una cuenta con ese DNI en este gimnasio. Entrá con tu DNI o usá «Olvidé mi contraseña»." };
    }
    console.error("[alta-socio] auth", authError);
    return { error: "No se pudo crear la cuenta. Probá de nuevo en un momento." };
  }
  const uid = creado.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: uid,
    gimnasio_id: gym.id,
    rol: "cliente",
    dni: datos.dni,
    nombre: datos.nombre,
    telefono: datos.telefono,
    debe_cambiar_clave: false,
    email_recuperacion: datos.email,
    tyc_aceptado_en: new Date().toISOString(),
  });
  if (profileError) {
    console.error("[alta-socio] profile", profileError);
    await admin.auth.admin.deleteUser(uid);
    return { error: "No se pudo guardar tu perfil. Probá de nuevo en un momento." };
  }

  const { error: clienteError } = await admin.from("clientes").insert({
    gimnasio_id: gym.id,
    profile_id: uid,
    email: datos.email,
    estado_cuota: "vencido",
    acceso_habilitado: false,
    fecha_inicio: null,
    fecha_vencimiento: null,
  });
  if (clienteError) {
    console.error("[alta-socio] cliente", clienteError);
    await admin.from("profiles").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
    return { error: "No se pudo crear tu ficha. Probá de nuevo en un momento." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: dniAEmail(datos.dni, gym.slug),
    password: datos.clave,
  });
  try {
    const cookieStore = await cookies();
    cookieStore.set("gym_ultimo", JSON.stringify({ slug: gym.slug, nombre: gym.nombre }), {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
  } catch {}

  return {};
}
