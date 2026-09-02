import "server-only";

import type { PasarelaPago } from "./tipos";

// Adapter sin proveedor: no hay checkout hosteado. El dueño transfiere por
// fuera (alias en PAGO_ALIAS / PAGO_TITULAR) y soporte confirma el pago a mano
// desde /admin/gimnasios/[id]. Sirve para arrancar sin integrar nada.
export function pasarelaManual(): PasarelaPago {
  return {
    nombre: "manual",
    automatica: false,
    async crearLink(s) {
      // "Link" = volver a /panel/plan con la referencia; ahí se muestran los
      // datos de transferencia y el estado pendiente.
      const u = new URL(s.urlRetorno);
      u.searchParams.set("ref", s.referencia);
      return { url: u.toString(), proveedorRef: null };
    },
    async leerWebhook() {
      return null; // no hay webhook en el flujo manual
    },
  };
}

export const DATOS_TRANSFERENCIA = {
  alias: process.env.PAGO_ALIAS ?? null,
  titular: process.env.PAGO_TITULAR ?? null,
};
