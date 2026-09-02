import "server-only";

import type { PasarelaPago } from "./tipos";

// STUB — Fase 2. Adapter para Ualá Bis (o el proveedor que se elija).
// Implementar contra la API real:
//   crearLink(): POST de una "orden"/"preferencia" con monto + concepto +
//     external_reference = s.referencia + back_url = s.urlRetorno. Devolver la
//     URL hosteada del checkout y el id del proveedor.
//   leerWebhook(): verificar la firma (header + secret de env), traer el
//     estado del pago por su id y mapear a EventoPago. Usar
//     external_reference como `referencia`.
// Keys en env: UALABIS_API_KEY, UALABIS_WEBHOOK_SECRET (no hardcodear nada).
export function pasarelaUalaBis(): PasarelaPago {
  return {
    nombre: "ualabis",
    automatica: true,
    async crearLink() {
      throw new Error("pasarelaUalaBis.crearLink: sin implementar (fase 2).");
    },
    async leerWebhook() {
      throw new Error("pasarelaUalaBis.leerWebhook: sin implementar (fase 2).");
    },
  };
}
