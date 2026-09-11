"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import {
  clonarPlantillaParaCliente,
  normalizarCodigo,
  type PlantillaRow,
} from "@/lib/rutina/plantillas";

export type OnboardingState = { error?: string };

// Cupo blando: no se bloquea el link hasta este número de alumnos por coach.
// Recién ahí se le ofrece subir de plan.
const LIMITE_BLANDO_ALUMNOS = 50;

const VENTANA_MS = 60_000;
const ultimas = new Map<string, number>();

async function pasoRateLimit(): Promise<boolean> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "desconocida";
  const ahora = Date.now();
  const previa = ultimas.get(ip);
  if (previa && ahora - previa < VENTANA_MS) return false;
  ultimas.set(ip, ahora);
  if (ultimas.size > 500) {
    for (const [k, t] of ultimas) if (ahora - t > VENTANA_MS) ultimas.delete(k);
  }
  return true;
}

async function traerPlantilla(codigo: string): Promise<PlantillaRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("rutina_plantillas")
    .select(
      "id, gimnasio_id, nombre, codigo, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, items, activa, veces_cargada",
    )
    .eq("codigo", normalizarCodigo(codigo))
    .eq("activa", true)
    .maybeSingle();
  return (data as PlantillaRow | null) ?? null;
}

async function sumarCarga(id: string, actual: number) {
  const admin = createAdminClient();
  await admin
    .from("rutina_plantillas")
    .update({ veces_cargada: actual + 1 })
    .eq("id", id);
}

/** Alumno nuevo: nombre + email + clave en un paso, queda como socio del coach. */
export async function onboardingConPlantilla(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const codigo = String(formData.get("codigo") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const trampa = String(formData.get("empresa") ?? "").trim();

  if (trampa) return { error: "No se pudo completar el registro." };
  if (!nombre || !email || !password) return { error: "Completá nombre, email y contraseña." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (!(await pasoRateLimit())) {
    return { error: "Esperá un minuto antes de volver a intentar." };
  }

  const plantilla = await traerPlantilla(codigo);
  if (!plantilla) return { error: "Ese código no existe o el entrenador lo pausó." };

  const admin = createAdminClient();

  const { count } = await admin
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", plantilla.gimnasio_id);
  if ((count ?? 0) >= LIMITE_BLANDO_ALUMNOS) {
    return {
      error:
        "El entrenador llegó al máximo de alumnos por ahora. Escribile para que amplíe su cuenta.",
    };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return {
        error:
          "Ese email ya tiene cuenta. Iniciá sesión y cargá el código desde “Tu rutina”.",
      };
    }
    return { error: authError?.message || "No se pudo crear la cuenta." };
  }

  const uid = authData.user.id;
  const dni = `DNI-${uid.substring(0, 8)}`;

  const { error: profileError } = await admin.from("profiles").insert({
    id: uid,
    gimnasio_id: plantilla.gimnasio_id,
    rol: "cliente",
    dni,
    nombre,
    debe_cambiar_clave: false,
    email_recuperacion: email,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(uid);
    return { error: "No se pudo guardar el perfil." };
  }

  const { data: clienteData, error: clienteError } = await admin
    .from("clientes")
    .insert({
      gimnasio_id: plantilla.gimnasio_id,
      profile_id: uid,
      estado_cuota: "al_dia",
      email,
      origen_plantilla: plantilla.id,
    })
    .select("id")
    .single();
  if (clienteError || !clienteData) {
    await admin.auth.admin.deleteUser(uid);
    return { error: "No se pudo crear tu ficha." };
  }

  const clon = await clonarPlantillaParaCliente(admin, {
    plantilla,
    clienteId: clienteData.id as string,
    gimnasioId: plantilla.gimnasio_id,
  });
  if (clon.error) {
    await admin.auth.admin.deleteUser(uid);
    return { error: clon.error };
  }

  await sumarCarga(plantilla.id, plantilla.veces_cargada);

  const db = await createClient();
  const { error: loginError } = await db.auth.signInWithPassword({ email, password });
  if (loginError) redirect("/login");
  redirect("/mi/rutina");
}

/** Alumno ya logueado: clona la plantilla en su rutina actual. */
export async function cargarPlantillaLogueado(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const codigo = String(formData.get("codigo") ?? "");
  const profile = await getSessionProfile();
  if (!profile) redirect(`/login?next=/r/${normalizarCodigo(codigo)}`);
  if (profile.rol !== "cliente") {
    return { error: "Entrá con tu cuenta de alumno para cargar una rutina." };
  }

  const plantilla = await traerPlantilla(codigo);
  if (!plantilla) return { error: "Ese código no existe o el entrenador lo pausó." };

  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!cliente) return { error: "No encontramos tu ficha de alumno." };

  const clon = await clonarPlantillaParaCliente(supabase, {
    plantilla,
    clienteId: cliente.id as string,
    gimnasioId: cliente.gimnasio_id as string,
  });
  if (clon.error) return { error: clon.error };

  await sumarCarga(plantilla.id, plantilla.veces_cargada);
  redirect("/mi/rutina");
}
