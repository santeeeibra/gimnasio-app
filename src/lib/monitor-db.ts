// SPEC_MONITOR_SUPABASE.md — límite del plan Supabase y cálculo de umbrales.
// Cambiar LIMITE_BYTES si se sube de plan.

// Free tier: 500 MB de base de datos.
export const LIMITE_BYTES = 500 * 1024 * 1024;

// Umbrales de aviso, de mayor a menor.
export const UMBRALES = [90, 70] as const;

export function pctUso(bytes: number): number {
  return (bytes / LIMITE_BYTES) * 100;
}

// Umbral más alto que ya cruzó el uso actual (0 si está por debajo de todos).
export function umbralCruzado(pct: number): number {
  for (const u of UMBRALES) {
    if (pct >= u) return u;
  }
  return 0;
}

export function mb(bytes: number): number {
  return bytes / 1024 / 1024;
}
