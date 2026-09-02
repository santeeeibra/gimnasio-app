// Interfaz de pasarela de pago. Un adapter por proveedor; se elige por env
// PASARELA_PAGO (ver ./index.ts). El resto de la app no conoce al proveedor.

export type SolicitudPago = {
  /** id interno único del pago (uuid de pagos_plataforma). */
  referencia: string;
  /** texto para el pagador: "Plan Pro · Mi Gym · 30 días". */
  concepto: string;
  montoARS: number;
  emailPagador: string | null;
  /** a dónde vuelve el navegador después de pagar. */
  urlRetorno: string;
};

export type LinkPago = {
  /** URL a la que se manda al dueño. Con el adapter `manual` es urlRetorno. */
  url: string;
  /** id del pago en la pasarela, si ya se conoce al crearlo. */
  proveedorRef: string | null;
};

export type EstadoPago = "aprobado" | "pendiente" | "rechazado";

export type EventoPago = {
  referencia: string;
  estado: EstadoPago;
  proveedorRef: string | null;
  montoARS: number | null;
};

export interface PasarelaPago {
  /** identificador corto, se guarda en pagos_plataforma.proveedor. */
  readonly nombre: string;
  /** true si el pago se confirma solo (webhook); false = lo confirma soporte. */
  readonly automatica: boolean;
  crearLink(s: SolicitudPago): Promise<LinkPago>;
  /** parsea el webhook del proveedor. null si el request no es un evento válido. */
  leerWebhook(req: Request): Promise<EventoPago | null>;
}
