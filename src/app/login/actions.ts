"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { crearEstructuraIndividual, destinoInicio } from "@/lib/plataforma/alta-individual";
import { buscarGimnasioReal } from "@/lib/plataforma/gimnasio-publico";

export type LoginState = { error?: string; slug?: string; nombre?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const gimnasio = String(formData.get("gimnasio") ?? "").trim().toLowerCase();
  const dniRaw = String(formData.get("dni") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!gimnasio || !dniRaw || !clave) {
    return { error: "Completá gimnasio, DNI y contraseña." };
  }

  // Sanitización de DNI: remover puntos, guiones y espacios en blanco
  const dniLimpio = dniRaw.replace(/\D/g, "");
  if (!dniLimpio || dniLimpio.length < 5) {
    return { error: "Ingresá un DNI numérico válido (al menos 5 dígitos)." };
  }

  // Resolver el slug real del gimnasio (acepta nombre o slug). Se excluyen
  // las cuentas individuales creadas por Google Sign-In (tipo_cuenta =
  // "individual"): esas no tienen DNI/contraseña propios, entran solo con
  // Google, y su `nombre` es el nombre real de la persona — sin este filtro
  // aparecían como si fueran un gimnasio real en el login por DNI.
  const admin = createAdminClient();
  const gym = await buscarGimnasioReal(admin, gimnasio);

  if (!gym) return { error: "No encontramos ese gimnasio." };

  // Gimnasio suspendido por soporte: se corta acá, antes de generar sesión.
  if (gym.estado === "suspendido") {
    return {
      error:
        "Este gimnasio está suspendido temporalmente. Escribinos a soporte para reactivarlo.",
    };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: dniAEmail(dniLimpio, gym.slug),
    password: clave,
  });

  if (error || !authData?.user) {
    return { error: "DNI o contraseña incorrectos." };
  }

  // Recordar gimnasio en cookie para que el próximo ingreso sea instantáneo
  try {
    const cookieStore = await cookies();
    cookieStore.set(
      "gym_ultimo",
      JSON.stringify({ slug: gym.slug, nombre: gym.nombre }),
      {
        maxAge: 60 * 60 * 24 * 365, // 1 año
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      },
    );
  } catch {
    // Si la cabecera ya fue enviada o no se puede escribir, no bloquea el login
  }

  // Obtener perfil y redirigir directamente sin pasar por el salto intermedio de "/"
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, debe_cambiar_clave, activo")
    .eq("id", authData.user.id)
    .single();

  if (profile?.activo === false) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta ha sido desactivada. Consultá con la administración del gimnasio." };
  }

  if (profile?.debe_cambiar_clave) {
    // A todos se les da a elegir en /bienvenida (cambiar la clave o dejarla).
    redirect("/bienvenida");
  }

  // Superadmin (vos): entrar directo al panel dev en vez del panel de gym normal.
  if (authData.user.id === process.env.SUPERADMIN_ID) {
    redirect("/admin");
  }

  redirect(profile?.rol === "dueno" || profile?.rol === "staff" ? "/panel" : "/mi");
}

// Login "directo" sin gimnasio: pensado para cuentas individuales (atletas
// independientes / partners, tipo_cuenta = "individual") que entran con
// nombre, email o teléfono + contraseña propia — nunca con gimnasio+DNI.
// También mantiene, por compatibilidad, el camino de un dueño/socio de un
// gimnasio REAL que cargó su email de recuperación: si el identificador
// matchea ahí, resuelve igual sin mostrarle el campo "Gimnasio".
export async function loginIndividual(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identificadorRaw = String(formData.get("identificador") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!identificadorRaw || !clave) {
    return { error: "Completá tu usuario, email o teléfono, y la contraseña." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const esEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identificadorRaw);
  const identificador = esEmail
    ? identificadorRaw.toLowerCase()
    : identificadorRaw;

  let userId: string | undefined;
  let gymCookie: { slug: string; nombre: string } | null = null;

  // 1. Si parece un email, intentar login directo (cuentas de /registrarse
  // y cuentas individuales de Google que ya se pusieron una contraseña).
  if (esEmail) {
    const { data: directAuth } = await supabase.auth.signInWithPassword({
      email: identificador,
      password: clave,
    });
    userId = directAuth?.user?.id;
  }

  // 2. Cuenta individual por teléfono o nombre: solo entre gimnasios
  // tipo_cuenta = "individual" (nunca gimnasios reales, para no repetir el
  // bug de "Gimnasio: nombre de una persona" en el login por DNI).
  if (!userId) {
    // El teléfono se guarda solo con dígitos y "+" (ver ajustes/actions.ts):
    // se normaliza igual para que "11 2345-6789" encuentre "1123456789".
    // Los valores van entre comillas dobles para que una coma o un paréntesis
    // en el nombre no rompa el filtro .or(); en el nombre se escapan los
    // comodines de ilike para que "%" no matchee a cualquiera.
    const telefono = identificador.replace(/[^\d+]/g, "");
    const comillas = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const nombreLiteral = identificador.replace(/[\\%_]/g, (m) => `\\${m}`);
    const filtros = [`nombre.ilike.${comillas(nombreLiteral)}`];
    if (telefono.replace("+", "").length >= 6) {
      filtros.unshift(`telefono.eq.${comillas(telefono)}`);
    }
    const { data: coincidencias } = await admin
      .from("profiles")
      .select(
        "id, nombre, telefono, email_recuperacion, gimnasios:gimnasio_id!inner(tipo_cuenta)",
      )
      .eq("gimnasios.tipo_cuenta", "individual")
      .or(filtros.join(","))
      .limit(2);
    // Con dos personas del mismo nombre no se adivina: que entren por email.
    const individualMatch = coincidencias?.length === 1 ? coincidencias[0] : null;
    if (coincidencias && coincidencias.length > 1) {
      return { error: "Hay más de una cuenta con ese nombre. Entrá con tu email o teléfono." };
    }

    if (individualMatch?.email_recuperacion) {
      const { data: authIndividual } = await supabase.auth.signInWithPassword({
        email: individualMatch.email_recuperacion,
        password: clave,
      });
      userId = authIndividual?.user?.id;
    }
  }

  // 3. Fallback existente: dueño o socio de un gimnasio REAL con email de
  // recuperación cargado (login directo sin repetir gimnasio+DNI).
  if (!userId && esEmail) {
    const { data: profileMatch } = await admin
      .from("profiles")
      .select(
        "id, dni, rol, gimnasio_id, gimnasios:gimnasio_id!inner(slug, nombre, estado, tipo_cuenta)",
      )
      .eq("gimnasios.tipo_cuenta", "gym")
      .eq("email_recuperacion", identificador)
      .maybeSingle();

    let targetGymSlug: string | null = null;
    let targetDni: string | null = null;
    let targetGymNombre: string | null = null;

    if (profileMatch && profileMatch.gimnasios) {
      const g = Array.isArray(profileMatch.gimnasios) ? profileMatch.gimnasios[0] : profileMatch.gimnasios;
      if (g.estado === "suspendido") {
        return { error: "Este gimnasio está suspendido temporalmente." };
      }
      targetGymSlug = g.slug;
      targetGymNombre = g.nombre;
      targetDni = profileMatch.dni;
    } else {
      const { data: clienteMatch } = await admin
        .from("clientes")
        .select(
          "gimnasio_id, profile:profile_id(dni), gimnasios:gimnasio_id!inner(slug, nombre, estado, tipo_cuenta)",
        )
        .eq("gimnasios.tipo_cuenta", "gym")
        .eq("email", identificador)
        .maybeSingle();

      if (clienteMatch && clienteMatch.gimnasios && clienteMatch.profile) {
        const g = Array.isArray(clienteMatch.gimnasios) ? clienteMatch.gimnasios[0] : clienteMatch.gimnasios;
        const prof = Array.isArray(clienteMatch.profile) ? clienteMatch.profile[0] : clienteMatch.profile;
        if (g.estado === "suspendido") {
          return { error: "Este gimnasio está suspendido temporalmente." };
        }
        targetGymSlug = g.slug;
        targetGymNombre = g.nombre;
        targetDni = prof.dni;
      }
    }

    if (targetGymSlug && targetDni) {
      const { data: synthAuth } = await supabase.auth.signInWithPassword({
        email: dniAEmail(targetDni, targetGymSlug),
        password: clave,
      });
      if (synthAuth?.user) {
        userId = synthAuth.user.id;
        if (targetGymNombre) gymCookie = { slug: targetGymSlug, nombre: targetGymNombre };
      }
    }
  }

  if (!userId) {
    return { error: "Usuario, email, teléfono o contraseña incorrectos." };
  }

  if (gymCookie) {
    try {
      const cookieStore = await cookies();
      cookieStore.set("gym_ultimo", JSON.stringify(gymCookie), {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      });
    } catch {}
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, debe_cambiar_clave, activo, gimnasios:gimnasio_id(tipo_cuenta)")
    .eq("id", userId)
    .single();

  if (profile?.activo === false) {
    await supabase.auth.signOut();
    redirect("/login?error=cuenta_desactivada");
  }

  if (profile?.debe_cambiar_clave) {
    redirect("/bienvenida");
  }

  const gymPerfil = profile?.gimnasios as unknown;
  const tipoCuentaPerfil = (Array.isArray(gymPerfil) ? gymPerfil[0] : gymPerfil) as
    | { tipo_cuenta?: string }
    | null;
  redirect(destinoInicio(profile?.rol, tipoCuentaPerfil?.tipo_cuenta));
}


export async function asegurarPerfilGoogleAction(): Promise<{
  error?: string;
  destino?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, rol, gimnasio_id, debe_cambiar_clave, gimnasios:gimnasio_id(slug, nombre, estado, tipo_cuenta)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    type GymInfo = {
      slug?: string;
      nombre?: string;
      estado?: string;
      tipo_cuenta?: string;
    };
    const rawGym = profile.gimnasios as unknown;
    const gym = (Array.isArray(rawGym) ? rawGym[0] : rawGym) as GymInfo | null;

    if (gym?.estado === "suspendido") {
      await supabase.auth.signOut();
      return { error: "Este gimnasio está suspendido temporalmente." };
    }

    const esGymReal = !gym?.tipo_cuenta || gym.tipo_cuenta === "gym";
    if (esGymReal && gym?.slug && gym?.nombre) {
      try {
        const cookieStore = await cookies();
        cookieStore.set(
          "gym_ultimo",
          JSON.stringify({ slug: gym.slug, nombre: gym.nombre }),
          {
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
            sameSite: "lax",
            httpOnly: false,
          },
        );
      } catch {}
    }

    const destino = profile.debe_cambiar_clave
      ? "/bienvenida"
      : destinoInicio(profile.rol, gym?.tipo_cuenta);

    return { destino };
  }

  // Si no tiene perfil aún, registrar automáticamente cuenta individual
  const userEmail = user.email?.toLowerCase() || "";
  const rawNombre =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0] ||
    "Mi Cuenta";
  const nombre = String(rawNombre).trim();

  const alta = await crearEstructuraIndividual(admin, {
    uid: user.id,
    nombre,
    email: userEmail || null,
    tipo: "individual",
  });
  if (alta.error) {
    await supabase.auth.signOut();
    return { error: alta.error };
  }

  // Cuenta individual: NO se escribe la cookie gym_ultimo (ver auth/callback).
  return { destino: "/panel" };
}
