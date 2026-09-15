import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { registrarAccionAdmin } from "@/lib/admin/audit";

// Impersonación para la consola de soporte: el superadmin abre una sesión REAL
// como un dueño o un socio para probar los flujos end-to-end sin logout ni
// tocar RLS. Se hace con un magiclink de service_role + verifyOtp, así todas
// las policies (auth.uid()) ven al usuario objetivo de verdad.
//
// - STASH: refresh_token del superadmin, para volver. httpOnly. Solo lo pone
//   este módulo, después de validar que la sesión es superadmin.
// - FLAG: datos para el banner (nombre / rol / gym). Legible por el server
//   component del banner; no es un token de auth.

const STASH = "sb-super-stash";
const FLAG = "imp-activa";

export type ImpFlag = { nombre: string; rol: "dueno" | "cliente"; gym: string };

// Sin maxAge quedaban como cookies de sesión del navegador: al cerrar la PWA
// del todo se borraban, pero la sesión real de Supabase (persistente) seguía
// como el perfil impersonado. El superadmin volvía a abrir la app "atrapado"
// en modo dueño/cliente, sin el banner ni el botón de volver a soporte.
const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 días, igual de larga que una sesión normal
};

// Puede impersonar si la sesión actual es la del superadmin, o si ya hay una
// impersonación en curso (el STASH solo lo pudo haber puesto el superadmin, así
// que sirve como capacidad para los saltos anidados dueño -> socio).
export async function puedeImpersonar(): Promise<boolean> {
  const jar = await cookies();
  if (jar.get(STASH)?.value) return true;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const superId = process.env.SUPERADMIN_ID;
  return !!user && !!superId && user.id === superId;
}

export async function impersonacionActiva(): Promise<ImpFlag | null> {
  const jar = await cookies();
  const raw = jar.get(FLAG)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpFlag;
  } catch {
    return null;
  }
}

export async function entrarComo(profileId: string): Promise<void> {
  if (!profileId || !(await puedeImpersonar())) redirect("/login");

  const db = createAdminClient();

  const { data: perfil } = await db
    .from("profiles")
    .select("id, dni, rol, nombre, gimnasio_id")
    .eq("id", profileId)
    .single();
  if (!perfil) redirect("/admin/gimnasios");

  const { data: gym } = await db
    .from("gimnasios")
    .select("slug, nombre")
    .eq("id", perfil.gimnasio_id)
    .single();
  if (!gym) redirect("/admin/gimnasios");

  const supabase = await createClient();
  const jar = await cookies();

  const yaImp = !!jar.get(STASH)?.value;
  const {
    data: { session: superSession },
  } = await supabase.auth.getSession();

  const { data: link, error: linkErr } = await db.auth.admin.generateLink({
    type: "magiclink",
    email: dniAEmail(perfil.dni, gym.slug),
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) redirect("/admin/gimnasios");

  const { error: otpErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (otpErr) redirect("/admin/gimnasios");

  // Sesión objetivo ya activa. Recién ahora guardamos la del superadmin (una
  // sola vez: los saltos anidados no la pisan).
  if (!yaImp && superSession?.refresh_token) {
    jar.set(STASH, superSession.refresh_token, cookieBase);
  }

  const flag: ImpFlag = {
    nombre: perfil.nombre,
    rol: perfil.rol as "dueno" | "cliente",
    gym: gym.nombre,
  };
  jar.set(FLAG, JSON.stringify(flag), { ...cookieBase, httpOnly: false });

  // El audit log + aviso push/email al superadmin no tienen que demorar la
  // entrada: se disparan después de que la respuesta (el redirect) ya salió.
  const superId = process.env.SUPERADMIN_ID ?? perfil.id;
  after(() =>
    registrarAccionAdmin(superId, "entrar_como", perfil.gimnasio_id, {
      profile_id: profileId,
      rol: perfil.rol,
    }),
  );

  redirect(perfil.rol === "dueno" ? "/panel" : "/mi");
}

export async function salirImpersonacion(): Promise<void> {
  const jar = await cookies();
  const refresh = jar.get(STASH)?.value;
  const supabase = await createClient();

  if (refresh) {
    const { error } = await supabase.auth.refreshSession({
      refresh_token: refresh,
    });
    // Token del superadmin ya vencido/rotado: cerramos sesión para no dejar
    // al usuario atrapado en la vista impersonada.
    if (error) await supabase.auth.signOut();
  } else {
    await supabase.auth.signOut();
  }

  jar.delete(STASH);
  jar.delete(FLAG);

  const superId = process.env.SUPERADMIN_ID;
  if (superId) {
    after(() => registrarAccionAdmin(superId, "salir_impersonacion", null, {}));
  }

  redirect("/admin");
}
