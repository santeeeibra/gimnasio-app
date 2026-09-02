"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hashPin, verificarPin } from "@/lib/pin";

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
    .update({ pin_ingresos: nuevoHash })
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
 */
export async function resetearPinConContrasena(contrasena: string): Promise<boolean> {
  try {
    const dueno = await requireDueno();
    const supabase = await createClient();

    // Verificar la contraseña actual intentando actualizar el usuario
    const { error: authError } = await supabase.auth.updateUser({
      password: contrasena,
    });

    // Si hay error, la contraseña es incorrecta
    if (authError) return false;

    // Contraseña correcta: borrar el PIN para forzar reconfiguración
    const { error: updateError } = await supabase
      .from("gimnasios")
      .update({ pin_ingresos: null })
      .eq("id", dueno.gimnasio_id);

    if (updateError) return false;

    revalidatePath("/panel/ingresos");
    return true;
  } catch {
    return false;
  }
}
