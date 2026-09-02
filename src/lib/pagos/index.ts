import "server-only";

import type { PasarelaPago } from "./tipos";
import { pasarelaManual } from "./manual";
import { pasarelaMercadoPago } from "./mercadopago";
// Fase 2 (pendiente): import { pasarelaUalaBis } from "./ualabis";

// Elige el adapter por env. Cambiar de proveedor = agregar un case y setear
// PASARELA_PAGO; el resto de la app no se toca.
export function pasarela(): PasarelaPago {
  switch (process.env.PASARELA_PAGO) {
    case "mercadopago":
      return pasarelaMercadoPago();
    // case "ualabis":
    //   return pasarelaUalaBis();
    case "manual":
    default:
      return pasarelaManual();
  }
}

export * from "./tipos";
