"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";

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

  // Resolver el slug real del gimnasio (acepta nombre o slug)
  const admin = createAdminClient();
  const { data: gym } = await admin
    .from("gimnasios")
    .select("slug, nombre, estado")
    .or(`slug.eq.${gimnasio},nombre.ilike.${gimnasio}`)
    .limit(1)
    .maybeSingle();

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
    .select("rol, debe_cambiar_clave")
    .eq("id", authData.user.id)
    .single();

  if (profile?.debe_cambiar_clave) {
    // Al dueño se le da a elegir en /bienvenida; al cliente se lo fuerza como antes.
    redirect(profile.rol === "dueno" ? "/bienvenida" : "/cambiar-clave");
  }

  redirect(profile?.rol === "dueno" ? "/panel" : "/mi");
}

export async function loginConEmail(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const clave = String(formData.get("clave") ?? "");

  if (!emailRaw || !clave) {
    return { error: "Completá email y contraseña." };
  }

  const supabase = await createClient();

  // 1. Intentar login directo con email (para cuentas registradas via /registrarse)
  const { data: directAuth, error: directError } = await supabase.auth.signInWithPassword({
    email: emailRaw,
    password: clave,
  });

  let userId = directAuth?.user?.id;

  // 2. Si falla directamente, buscar si es un dueño o cliente con email cargado pero usuario sintético
  if (directError || !userId) {
    const admin = createAdminClient();

    // Buscar en profiles (dueños)
    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id, dni, rol, gimnasio_id, gimnasios:gimnasio_id(slug, nombre, estado)")
      .eq("email_recuperacion", emailRaw)
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
      // Buscar en clientes
      const { data: clienteMatch } = await admin
        .from("clientes")
        .select("gimnasio_id, profile:profile_id(dni), gimnasios:gimnasio_id(slug, nombre, estado)")
        .eq("email", emailRaw)
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

    if (!targetGymSlug || !targetDni) {
      return { error: "Email o contraseña incorrectos." };
    }

    const { data: synthAuth, error: synthErr } = await supabase.auth.signInWithPassword({
      email: dniAEmail(targetDni, targetGymSlug),
      password: clave,
    });

    if (synthErr || !synthAuth?.user) {
      return { error: "Email o contraseña incorrectos." };
    }

    userId = synthAuth.user.id;

    if (targetGymNombre) {
      try {
        const cookieStore = await cookies();
        cookieStore.set(
          "gym_ultimo",
          JSON.stringify({ slug: targetGymSlug, nombre: targetGymNombre }),
          {
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
            sameSite: "lax",
            httpOnly: false,
          },
        );
      } catch {}
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, debe_cambiar_clave")
    .eq("id", userId!)
    .single();

  if (profile?.debe_cambiar_clave) {
    redirect(profile.rol === "dueno" ? "/bienvenida" : "/cambiar-clave");
  }

  redirect(profile?.rol === "dueno" ? "/panel" : "/mi");
}

export async function loginDevAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: "12345678@sante.gym.local",
    password: "admin123",
  });
  if (error) {
    throw new Error(error.message);
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(
      "gym_ultimo",
      JSON.stringify({ slug: "sante", nombre: "Gimnasio Sante" }),
      {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      },
    );
  } catch {
    // Si no se puede escribir, no bloquea
  }

  redirect("/admin");
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
      "id, rol, gimnasio_id, debe_cambiar_clave, gimnasios:gimnasio_id(slug, nombre, estado)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    type GymInfo = { slug?: string; nombre?: string; estado?: string };
    const rawGym = profile.gimnasios as unknown;
    const gym = (Array.isArray(rawGym) ? rawGym[0] : rawGym) as GymInfo | null;

    if (gym?.estado === "suspendido") {
      await supabase.auth.signOut();
      return { error: "Este gimnasio está suspendido temporalmente." };
    }

    if (gym?.slug && gym?.nombre) {
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
      ? profile.rol === "dueno"
        ? "/bienvenida"
        : "/cambiar-clave"
      : profile.rol === "dueno"
        ? "/panel"
        : "/mi";

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
  const slug = `user-${user.id.substring(0, 8)}`;

  const { data: gymData, error: gymErr } = await admin
    .from("gimnasios")
    .insert({
      nombre,
      slug,
      estado: "prueba",
      tipo_cuenta: "individual",
    })
    .select("id")
    .single();

  if (!gymErr && gymData) {
    const dni = `DNI-${user.id.substring(0, 8)}`;

    await admin.from("profiles").insert({
      id: user.id,
      gimnasio_id: gymData.id,
      rol: "dueno",
      dni,
      nombre,
      debe_cambiar_clave: false,
      email_recuperacion: userEmail || null,
    });

    await admin.from("clientes").insert({
      gimnasio_id: gymData.id,
      profile_id: user.id,
      estado_cuota: "al_dia",
      email: userEmail || null,
    });

    try {
      const cookieStore = await cookies();
      cookieStore.set(
        "gym_ultimo",
        JSON.stringify({ slug, nombre }),
        {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
          sameSite: "lax",
          httpOnly: false,
        },
      );
    } catch {}

    return { destino: "/panel" };
  }

  return { destino: "/panel" };
}
