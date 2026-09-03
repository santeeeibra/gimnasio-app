"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";

export type LoginState = { error?: string; slug?: string; nombre?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const gimnasio = String(formData.get("gimnasio") ?? "").trim().toLowerCase();
  const dni = String(formData.get("dni") ?? "").trim();
  const clave = String(formData.get("clave") ?? "");

  if (!gimnasio || !dni || !clave) {
    return { error: "Completá gimnasio, DNI y contraseña." };
  }

  // Resolver el slug real del gimnasio (acepta nombre o slug).
  const admin = createAdminClient();
  const { data: gym } = await admin
    .from("gimnasios")
    .select("slug, nombre")
    .or(`slug.eq.${gimnasio},nombre.ilike.${gimnasio}`)
    .limit(1)
    .maybeSingle();

  if (!gym) return { error: "No encontramos ese gimnasio." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: dniAEmail(dni, gym.slug),
    password: clave,
  });

  if (error) return { error: "DNI o contraseña incorrectos." };

  redirect("/");
}
