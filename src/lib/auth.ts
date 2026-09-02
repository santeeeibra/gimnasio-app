import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  gimnasio_id: string;
  rol: "dueno" | "cliente";
  dni: string;
  nombre: string;
  telefono: string | null;
  debe_cambiar_clave: boolean;
};

// DNI -> email sintético. El cliente nunca ve esto.
export function dniAEmail(dni: string, gimnasioSlug: string): string {
  return `${dni.trim().toLowerCase()}@${gimnasioSlug}.gym.local`;
}

export function claveInicial(dni: string): string {
  const limpio = dni.replace(/\D/g, "");
  return `gym${limpio.slice(-4)}`;
}

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, gimnasio_id, rol, dni, nombre, telefono, debe_cambiar_clave")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.debe_cambiar_clave) redirect("/cambiar-clave");
  return profile;
}

export async function requireDueno(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.rol !== "dueno") redirect("/mi");
  return profile;
}

// ADMIN de la plataforma (vos), no dueño de un gimnasio. Check aparte:
// el id del perfil tiene que coincidir con SUPERADMIN_ID (env).
// Devuelve 404 (no redirect) para no revelar que la ruta existe a un dueño
// que la esté probando: indistinguible de una ruta inexistente.
export async function requireSuperadmin(): Promise<Profile> {
  const profile = await getSessionProfile();
  const superId = process.env.SUPERADMIN_ID;
  if (!profile || !superId || profile.id !== superId) notFound();
  return profile;
}
