// Réplica client-safe de sumarDias (la de cobro-socio.ts es "server-only").
// Usada para calcular cubre_hasta localmente cuando no hay conexión.
export function sumarDias(fecha: Date, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
