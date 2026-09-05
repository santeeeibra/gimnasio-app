import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionProfile } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  // 1. Si el usuario ya cuenta con sesión activa, redirigir directo
  const profile = await getSessionProfile();
  if (profile) {
    if (profile.debe_cambiar_clave) redirect("/cambiar-clave");
    redirect(profile.rol === "dueno" ? "/panel" : "/mi");
  }

  // 2. Resolver parámetro de URL o cookie persistida
  const params = await searchParams;
  let initialGymSlug = params?.g ?? null;
  let initialGymNombre: string | null = null;

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
      />
    </Suspense>
  );
}
