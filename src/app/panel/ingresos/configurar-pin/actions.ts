"use server";

import { revalidatePath } from "next/cache";
import { requireDueno, dniAEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hashPin, verificarPin } from "@/lib/pin";

/**
 * Verifica que `contrasena` sea la contraseña actual de la cuenta del dueño,
 * SIN cambiarla. (El bug viejo llamaba a auth.updateUser({ password }), que
 * intenta setear la misma contraseña y Supabase lo rechaza con
 * "New password should be different from the old password".)
 */
async function contrasenaEsCorrecta(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dni: string,
  gimnasioId: string,
  contrasena: string,
): Promise<boolean> {
  if (!contrasena) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let email = user?.email ?? null;
  if (!email) {
    const { data: gym } = await supabase
      .from("gimnasios")
      .select("slug")
      .eq("id", gimnasioId)
      .maybeSingle();
    if (gym?.slug) email = dniAEmail(dni, gym.slug);
  }
  if (!email) return false;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: contrasena,
  });
  return !error;
}

type State = { error?: string; ok?: string };

/**
 * Configura o cambia el PIN de ingresos.
 */
export async function configurarPin(
  _prev: State,
  formData: FormData
): Promise<State> {
  const dueno = await requireDueno();
  const pinActual = String(formData.get("pin_actual") ?? "").trim();
  const pinNuevo = String(formData.get("pin_nuevo") ?? "").trim();
  const pinConfirmar = String(formData.get("pin_confirmar") ?? "").trim();

  if (!/^\d{4,6}$/.test(pinNuevo)) {
    return { error: "El PIN debe tener entre 4 y 6 dígitos." };
  }
  if (pinNuevo !== pinConfirmar) {
    return { error: "Los PINs no coinciden." };
  }

  const supabase = await createClient();
  const { data: gym, error: gymErr } = await supabase
    .from("gimnasios")
    .select("pin_ingresos")
    .eq("id", dueno.gimnasio_id)
    .maybeSingle();

  if (gymErr) {
    console.error("[ingresos] configurarPin — lectura gimnasio:", gymErr);
    return {
      error: `No se pudo leer el gimnasio (${gymErr.message}). ¿Está aplicada la migración 0008_pin_ingresos.sql?`,
    };
  }
  if (!gym) return { error: "No se encontró el gimnasio." };

  // Si ya tiene PIN, validar el actual
  if (gym.pin_ingresos && !verificarPin(pinActual, gym.pin_ingresos)) {
    return { error: "El PIN actual es incorrecto." };
  }

  const nuevoHash = hashPin(pinNuevo);
  const { error } = await supabase
    .from("gimnasios")
    .update({ pin_ingresos: nuevoHash, pin_ingresos_desactivado: false })
    .eq("id", dueno.gimnasio_id);

  if (error) {
    console.error("[ingresos] configurarPin — guardar PIN:", error);
    return { error: `No se pudo guardar el PIN (${error.message}).` };
  }

  revalidatePath("/panel/ingresos");
  return { ok: "PIN configurado correctamente." };
}

/**
 * Verifica el PIN de ingresos.
 * Devuelve true si es correcto, false si no.
 */
export async function verificarPinIngresos(pin: string): Promise<boolean> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("pin_ingresos")
    .eq("id", dueno.gimnasio_id)
    .single();

  if (!gym || !gym.pin_ingresos) return false;

  return verificarPin(pin, gym.pin_ingresos);
}

/**
 * Resetea el PIN verificando la contraseña de la cuenta del dueño.
 * Devuelve true si la contraseña es correcta y se borró el PIN.
 * NO toca la contraseña: solo la usa para chequear identidad.
 */
export async function resetearPinConContrasena(contrasena: string): Promise<boolean> {
  try {
    const dueno = await requireDueno();
    const supabase = await createClient();

    const ok = await contrasenaEsCorrecta(
      supabase,
      dueno.dni,
      dueno.gimnasio_id,
      contrasena,
    );
    if (!ok) return false;

    // Contraseña correcta: borrar el PIN para forzar reconfiguración.
    // Se deja pin_ingresos_desactivado en false para que la sección vuelva a
    // pedir uno nuevo (esto es un "olvidé el PIN", no un "apagalo").
    const { error: updateError } = await supabase
      .from("gimnasios")
      .update({ pin_ingresos: null, pin_ingresos_desactivado: false })
      .eq("id", dueno.gimnasio_id);

    if (updateError) return false;

    revalidatePath("/panel/ingresos");
    return true;
  } catch {
    return false;
  }
}

/**
 * Apaga el PIN de la sección de Ingresos a propósito: la deja accesible sin
 * pedir nada. Si hay un PIN configurado, exige el PIN actual o la contraseña
 * de la cuenta (mismo mecanismo que "olvidé mi PIN"). Devuelve true si quedó
 * desactivado.
 */
export async function desactivarPinIngresos(credencial: string): Promise<boolean> {
  try {
    const dueno = await requireDueno();
    const supabase = await createClient();

    const { data: gym } = await supabase
      .from("gimnasios")
      .select("pin_ingresos")
      .eq("id", dueno.gimnasio_id)
      .maybeSingle();

    if (gym?.pin_ingresos) {
      const cred = (credencial ?? "").trim();
      const okPin = verificarPin(cred, gym.pin_ingresos);
      const okPass =
        okPin ||
        (await contrasenaEsCorrecta(
          supabase,
          dueno.dni,
          dueno.gimnasio_id,
          cred,
        ));
      if (!okPin && !okPass) return false;
    }

    const { error: updateError } = await supabase
      .from("gimnasios")
      .update({ pin_ingresos: null, pin_ingresos_desactivado: true })
      .eq("id", dueno.gimnasio_id);
    if (updateError) return false;

    revalidatePath("/panel/ingresos");
    return true;
  } catch {
    return false;
  }
}
