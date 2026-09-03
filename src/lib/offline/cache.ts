/**
 * Cache read-through mínimo para lecturas críticas (estado de cuota).
 *
 * La idea: cuando una pantalla carga OK, guarda su copia acá. Si más tarde
 * Supabase no responde y el Server Component tira error, el `error.tsx`
 * correspondiente lee esta copia y la muestra con un aviso de antigüedad, en
 * vez de dejar la pantalla en blanco.
 */

const PREFIJO = "gym.cache.v1.";

type Envuelto<T> = { data: T; timestamp: number };

function hayStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function guardarCache<T>(clave: string, data: T): void {
  if (!hayStorage()) return;
  try {
    const env: Envuelto<T> = { data, timestamp: Date.now() };
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(env));
  } catch {
    /* sin espacio / modo privado */
  }
}

export function leerCache<T>(clave: string): Envuelto<T> | null {
  if (!hayStorage()) return null;
  try {
    const crudo = window.localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;
    const env = JSON.parse(crudo) as Envuelto<T>;
    if (typeof env?.timestamp !== "number") return null;
    return env;
  } catch {
    return null;
  }
}

/** "hace 2 min", "hace 3 h", "hace 5 días". */
export function haceCuanto(timestamp: number): string {
  const s = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (s < 60) return "hace instantes";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} día${d === 1 ? "" : "s"}`;
}
