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
    .select("slug, nombre")
    .or(`slug.eq.${gimnasio},nombre.ilike.${gimnasio}`)
    .limit(1)
    .maybeSingle();

  if (!gym) return { error: "No encontramos ese gimnasio." };

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
