import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionProfile } from "@/lib/auth";
import { LoginForm } from "./login-form";
import type { PerfilRegistro } from "./registro-actions";

const PERFILES: PerfilRegistro[] = ["individual", "dueno", "socio"];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    g?: string;
    error?: string;
    registro?: string;
    ref?: string;
    codigo?: string;
  }>;
}) {
  // 1. Si el usuario ya cuenta con sesión activa, redirigir directo
  const profile = await getSessionProfile();
  if (profile) {
    if (profile.debe_cambiar_clave) redirect("/cambiar-clave");
    redirect(profile.rol === "dueno" || profile.rol === "staff" ? "/panel" : "/mi");
  }

  // 2. Resolver parámetro de URL o cookie persistida
  const params = await searchParams;
  let initialGymSlug = params?.g ?? null;
  let initialGymNombre: string | null = null;
  const initialError = params?.error ?? null;
  const refCode = (params?.ref ?? params?.codigo ?? "").trim();
  // Un enlace de referido de partner es siempre para un gimnasio.
  const initialRegistro: PerfilRegistro | null = PERFILES.includes(params?.registro as PerfilRegistro)
    ? (params?.registro as PerfilRegistro)
    : params?.registro !== undefined || refCode
      ? refCode
        ? "dueno"
        : "individual"
      : null;

  if (!initialGymSlug) {
    try {
      const cookieStore = await cookies();
      const cookieData = cookieStore.get("gym_ultimo")?.value;
      if (cookieData) {
        const parsed = JSON.parse(cookieData);
        initialGymSlug = parsed.slug ?? null;
        initialGymNombre = parsed.nombre ?? null;
      }
    } catch {
      // Ignorar error al leer cookie
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c0d11]" />}>
      <LoginForm
        initialGymSlug={initialGymSlug}
        initialGymNombre={initialGymNombre}
        initialError={initialError}
        initialRegistro={initialRegistro}
        refCode={refCode}
      />
    </Suspense>
  );
}
