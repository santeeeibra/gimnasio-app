"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("pin_ingresos")
    .eq("id", dueno.gimnasio_id)
    .single();

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

  if (error) return { error: "No se pudo guardar el PIN." };

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
