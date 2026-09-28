import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatedImpersonation } from "@/lib/impersonation-session";

export type Profile = {
  id: string;
  gimnasio_id: string;
  rol: "dueno" | "cliente" | "staff";
  dni: string;
  nombre: string;
  telefono: string | null;
  debe_cambiar_clave: boolean;
  activo?: boolean;
  permisos?: Record<string, any>;
};

// DNI -> email sintético. El cliente nunca ve esto.
export function dniAEmail(dni: string, gimnasioSlug: string): string {
  return `${dni.trim().toLowerCase()}@${gimnasioSlug}.gym.local`;
}

export function claveInicial(dni: string): string {
  const limpio = dni.replace(/\D/g, "");
  return `gym${limpio.slice(-4)}`;
}

export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, gimnasio_id, rol, dni, nombre, telefono, debe_cambiar_clave, activo, permisos")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.activo === false) {
    redirect("/login?error=cuenta_desactivada");
  }
  if (profile.debe_cambiar_clave) {
    // A todos se les da a elegir en /bienvenida (cambiar la clave o dejarla).
    redirect("/bienvenida");
  }

  // Gate de gimnasio suspendido: corta el acceso de dueño y socios (el login
  // ya lo bloquea al generar sesión; esto cubre las sesiones ya abiertas).
  // Solo una sesión secundaria validada del superadmin permite depurar
  // gimnasios suspendidos mientras se impersona; una cookie fabricada no.
  if (!(await validatedImpersonation())) {
    const db = createAdminClient();
    const { data: gym } = await db
      .from("gimnasios")
      .select("estado")
      .eq("id", profile.gimnasio_id)
      .maybeSingle();
    if (gym?.estado === "suspendido") redirect("/suspendido");
  }

  return profile;
}

export async function requireDueno(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.rol !== "dueno") {
    redirect(profile.rol === "staff" ? "/panel" : "/mi");
  }
  return profile;
}

export async function requireStaffODueno(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.rol !== "dueno" && profile.rol !== "staff") {
    redirect("/mi");
  }
  return profile;
}

// ADMIN de la plataforma (vos), no dueño de un gimnasio. Check aparte:
// el id del perfil tiene que coincidir con SUPERADMIN_ID (env).
// Devuelve 404 (no redirect) para no revelar que la ruta existe a un dueño
// que la esté probando: indistinguible de una ruta inexistente.
export async function requireSuperadmin(): Promise<Profile> {
  const superId = process.env.SUPERADMIN_ID;
  if (!superId) notFound();

  const profile = await getSessionProfile();
  if (profile && profile.id === superId) {
    return profile;
  }

  // La sesión original se valida en Supabase Auth y se liga al usuario
  // impersonado actual antes de conceder acciones de soporte.
  if (await validatedImpersonation()) {
    const db = createAdminClient();
    const { data: superProfile } = await db
      .from("profiles")
      .select("id, gimnasio_id, rol, dni, nombre, telefono, debe_cambiar_clave")
      .eq("id", superId)
      .single();
    if (superProfile) return superProfile as Profile;
  }

  notFound();
}
