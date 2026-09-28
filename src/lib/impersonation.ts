import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { mayRestoreImpersonation, restoreSuperadminWithAuth, type SuperadminStash } from "@/lib/impersonation-guard";
import { SUPERADMIN_STASH_COOKIE, validatedImpersonation } from "@/lib/impersonation-session";

// Impersonación para la consola de soporte: el superadmin abre una sesión REAL
// como un dueño o un socio para probar los flujos end-to-end sin logout ni
// tocar RLS. Se hace con un magiclink de service_role + verifyOtp, así todas
// las policies (auth.uid()) ven al usuario objetivo de verdad.
//
// - STASH: sesión secundaria del superadmin + id del usuario impersonado.
//   Solo sirve como privilegio si Auth valida el access token Y la sesión
//   principal actual corresponde al usuario impersonado. El refresh token
//   se usa únicamente para restaurar la sesión y se verifica antes de volver.
// - FLAG: señal de navegación heredada; no autoriza ni aporta datos al banner.

const FLAG = "imp-activa";

export type ImpFlag = {
  nombre: string;
  rol: "dueno" | "cliente";
  gym: string;
  gymSlug: string;
};

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

// El soporte puede saltar entre perfiles solo con una sesión superadmin
// validada por Auth (actual o secundaria, ligada al perfil impersonado).
export async function puedeImpersonar(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user }, error,
  } = await supabase.auth.getUser();
  const superId = process.env.SUPERADMIN_ID;
  if (!error && user && superId && user.id === superId) return true;
  return !!(await validatedImpersonation());
}

export async function impersonacionActiva(): Promise<ImpFlag | null> {
  // Solo estado de navegación: mantiene visible "Volver a soporte" si el
  // access token secundario expiró. NO usar esto para conceder privilegios.
  const jar = await cookies();
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user?.id === process.env.SUPERADMIN_ID) return null;
  const stash = mayRestoreImpersonation(
    jar.get(SUPERADMIN_STASH_COOKIE)?.value,
    error ? undefined : user?.id,
  );
  if (!stash) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nombre, rol, gimnasio_id")
    .eq("id", stash.impersonatedUserId)
    .maybeSingle();
  if (!profile) return null;
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, slug")
    .eq("id", profile.gimnasio_id)
    .maybeSingle();
  if (!gym) return null;
  return {
    nombre: profile.nombre,
    rol: profile.rol === "dueno" ? "dueno" : "cliente",
    gym: gym.nombre,
    gymSlug: gym.slug,
  };
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
  const { data: { user: currentUser }, error: currentError } = await supabase.auth.getUser();
  const superId = process.env.SUPERADMIN_ID;
  if (currentError || !currentUser || !superId) redirect("/login");
  const previous = currentUser.id === superId ? null : await validatedImpersonation();
  if (currentUser.id !== superId && !previous) redirect("/login");
  const {
    data: { session: superSession },
  } = await supabase.auth.getSession();
  if (!previous && (!superSession?.access_token || !superSession.refresh_token)) {
    redirect("/login");
  }

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

  // La sesión objetivo ya está activa. Guardamos los credenciales originales
  // y ligamos el stash al nuevo perfil; un salto anidado conserva los del
  // superadmin, jamás los del dueño/socio impersonado.
  const stash: SuperadminStash = {
    accessToken: previous?.accessToken ?? superSession!.access_token,
    refreshToken: previous?.refreshToken ?? superSession!.refresh_token,
    impersonatedUserId: perfil.id,
  };
  jar.set(SUPERADMIN_STASH_COOKIE, JSON.stringify(stash), cookieBase);

  const flag: ImpFlag = {
    nombre: perfil.nombre,
    rol: perfil.rol as "dueno" | "cliente",
    gym: gym.nombre,
    gymSlug: gym.slug,
  };
  jar.set(FLAG, JSON.stringify(flag), { ...cookieBase, httpOnly: false });

  // El audit log + aviso push/email al superadmin no tienen que demorar la
  // entrada: se disparan después de que la respuesta (el redirect) ya salió.
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
  const supabase = await createClient();
  const { data: { user: currentUser }, error: currentError } = await supabase.auth.getUser();
  const rawStash = jar.get(SUPERADMIN_STASH_COOKIE)?.value;
  const sesionRecuperada = await restoreSuperadminWithAuth(
    rawStash,
    currentError ? undefined : currentUser?.id,
    process.env.SUPERADMIN_ID,
    async (token) => {
      const { error } = await supabase.auth.refreshSession({ refresh_token: token });
      return !error;
    },
    async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      return error ? undefined : user?.id;
    },
  );

  // Token del superadmin ya vencido/rotado (rotación de refresh tokens de
  // Supabase: si la sesión del superadmin se refrescó en otra pestaña
  // mientras impersonaba, este token queda stale). Antes hacíamos signOut()
  // y redirect("/admin"), pero sin sesión el guard de superadmin te manda a
  // /login sin explicación — parece que falló el login en vez de que
  // expiró la sesión de soporte.
  if (!sesionRecuperada) await supabase.auth.signOut();

  jar.delete(SUPERADMIN_STASH_COOKIE);
  jar.delete(FLAG);

  const superId = process.env.SUPERADMIN_ID;
  if (superId && sesionRecuperada) {
    after(() => registrarAccionAdmin(superId, "salir_impersonacion", null, {}));
  }

  redirect(sesionRecuperada ? "/admin" : "/login?error=sesion_soporte_expirada");
}
