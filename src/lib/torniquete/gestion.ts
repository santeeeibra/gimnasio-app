import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { generarTokenDispositivo, hashearToken } from "@/lib/torniquete/decision";

/**
 * Da de alta un dispositivo (molinete) para un gimnasio. El token plano se
 * devuelve una única vez para mostrárselo al dueño (como una API key); en DB
 * sólo queda `token_hash`, nunca el valor en claro.
 */
export async function crearDispositivoTorniquete(gimnasioId: string, nombre: string) {
  const admin = createAdminClient();
  const tokenPlano = generarTokenDispositivo();

  const { data, error } = await admin
    .from("dispositivos_torniquete")
    .insert({ gimnasio_id: gimnasioId, nombre, token_hash: hashearToken(tokenPlano) })
    .select("id, nombre, creado_en")
    .single();

  if (error) throw error;

  return { dispositivo: data, tokenPlano };
}

/**
 * Revoca un dispositivo: deja de autenticar en el endpoint del torniquete
 * de inmediato (verificarAutenticacionDispositivo corta apenas ve
 * revocado_en), sin borrar el historial de comandos_torniquete.
 *
 * Exige gimnasioId y lo suma al `.eq()` para que un dueño/staff nunca pueda
 * revocar el dispositivo de otro gimnasio pasando un id ajeno — el llamador
 * (una futura acción de panel) ya conoce el gimnasio de su propia sesión.
 */
export async function revocarDispositivoTorniquete(gimnasioId: string, dispositivoId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dispositivos_torniquete")
    .update({ revocado_en: new Date().toISOString() })
    .eq("id", dispositivoId)
    .eq("gimnasio_id", gimnasioId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Dispositivo no encontrado para este gimnasio.");
  }
}
