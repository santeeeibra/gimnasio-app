import { createAdminClient } from "@/lib/supabase/admin";
import type { Comando } from "@/lib/torniquete/decision";

/**
 * Deja un comando OPEN_ENTRY/DENY para que lo levante el ESP32. Best-effort
 * a propósito: el check-in (checkin/actions.ts) ya resolvió y guardó la
 * decisión antes de llamar esto, así que un molinete desconectado, sin
 * dispositivo dado de alta, o un fallo de esta tabla nunca debe tirar abajo
 * el check-in normal — sólo se pierde la apertura remota, no el registro de
 * asistencia.
 */
export async function emitirComandoTorniquete(
  gimnasioId: string,
  comando: Comando,
  motivo: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("comandos_torniquete").insert({ gimnasio_id: gimnasioId, comando, motivo });
  } catch {
    // Silencioso a propósito — ver comentario arriba.
  }
}
