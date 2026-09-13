// Planes de plataforma (cupo de socios + precio por gimnasio). Ver
// PLAN_PLANES_PLATAFORMA.md. La consola de soporte los lee con service_role.

/** "12 / 30 socios" o "12 socios · sin límite" si el plan es ilimitado. */
export function cupoTexto(usados: number, max: number | null): string {
  return max == null
    ? `${usados} socios · sin límite`
    : `${usados} / ${max} socios`;
}

/** true si el gimnasio ya llegó (o pasó) el tope de socios de su plan. */
export function cupoExcedido(usados: number, max: number | null): boolean {
  return max != null && usados >= max;
}
