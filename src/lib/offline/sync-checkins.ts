/**
 * Sincroniza el `checkins_queue` de IndexedDB contra el server en un solo
 * viaje de red (`marcarIngresosLote`). Cada ítem se borra de la cola sólo si
 * el server lo resolvió sin error — el `id` local viaja como `clientRef` y
 * es la clave de dedup real (índice único en `registros_entrada`), así que
 * reintentar un ítem que en realidad ya se sincronizó es inofensivo.
 */

import { obtenerCheckinsPendientes, eliminarCheckinEncolado } from "./indexeddb";
import { marcarIngresosLote } from "@/app/checkin/actions";

export async function sincronizarCheckinsOffline(): Promise<{ quedanPendientes: boolean }> {
  const pendientes = await obtenerCheckinsPendientes();
  if (pendientes.length === 0) return { quedanPendientes: false };

  try {
    const resultados = await marcarIngresosLote(
      pendientes.map((c) => ({ clientRef: c.id, dni: c.dni })),
    );
    await Promise.all(
      resultados.filter((r) => !r.error).map((r) => eliminarCheckinEncolado(r.clientRef)),
    );
  } catch {
    // Sin red o el server no contestó: se reintenta en el próximo ciclo.
    return { quedanPendientes: true };
  }

  const restantes = await obtenerCheckinsPendientes();
  return { quedanPendientes: restantes.length > 0 };
}
