/**
 * Cola de acciones pendientes, genérica y reutilizable.
 *
 * Cuando Supabase no responde, las escrituras críticas (check-in, alta de
 * cliente) se guardan acá en `localStorage` y se reintentan solas al
 * reconectar. Prioridad: NO perder ítems. Un ítem sólo sale de la cola cuando
 * su handler confirma `ok`; cualquier otro resultado lo deja donde estaba.
 *
 * No depende de React: la consume tanto el provider como cualquier form.
 */

export type EstadoItem = "pendiente" | "conflicto";

export type ItemCola<P = unknown> = {
  id: string;
  /** Discrimina qué handler lo procesa (ej. "checkin", "alta_cliente"). */
  tipo: string;
  payload: P;
  /** Epoch ms de cuando se encoló. */
  timestamp: number;
  intentos: number;
  estado: EstadoItem;
  /** Texto para mostrarle al dueño cuando quedó en conflicto. */
  detalle?: string;
};

export type ResultadoHandler =
  | { ok: true }
  | { conflicto: true; detalle: string }
  | { reintentar: true };

export type Handler<P = any> = (payload: P) => Promise<ResultadoHandler>;

const CLAVE = "gym.cola.v1";
const MAX_BACKOFF = 300_000;
const BASE_BACKOFF = 30_000;
// Techo de reintentos: sin esto, un ítem que falla siempre (ej. server
// actions desincronizadas con un redeploy mientras el dispositivo tenía JS
// viejo cacheado) reintenta en silencio para siempre y la cola crece sin
// que nadie se entere hasta que ya son decenas de pendientes.
const MAX_INTENTOS = 8;

type Listener = (items: ItemCola[]) => void;
const listeners = new Set<Listener>();

function hayStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function leerRaw(): ItemCola[] {
  if (!hayStorage()) return [];
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return [];
    const parsed = JSON.parse(crudo);
    return Array.isArray(parsed) ? (parsed as ItemCola[]) : [];
  } catch {
    return [];
  }
}

function escribir(items: ItemCola[]): void {
  if (!hayStorage()) return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // Sin espacio o modo privado: no rompemos la UI.
  }
  emitir(items);
}

function emitir(items: ItemCola[]): void {
  for (const l of listeners) {
    try {
      l(items);
    } catch {
      /* un listener roto no frena a los demás */
    }
  }
}

export function pendientes(): ItemCola[] {
  return leerRaw().filter((i) => i.estado === "pendiente");
}

export function conflictos(): ItemCola[] {
  return leerRaw().filter((i) => i.estado === "conflicto");
}

/** Agrega un ítem al final de la cola. Devuelve el id generado. */
export function encolar<P>(tipo: string, payload: P): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const item: ItemCola<P> = {
    id,
    tipo,
    payload,
    timestamp: Date.now(),
    intentos: 0,
    estado: "pendiente",
  };
  escribir([...leerRaw(), item as ItemCola]);
  return id;
}

export function quitar(id: string): void {
  escribir(leerRaw().filter((i) => i.id !== id));
}

/** Alias semántico: el dueño descarta a mano un ítem en conflicto. */
export const descartar = quitar;

/** El dueño pide reintentar a mano un ítem en conflicto (ej. tras actualizar la app). */
export function reintentarItem(id: string): void {
  escribir(
    leerRaw().map((i) =>
      i.id === id ? { ...i, estado: "pendiente" as const, intentos: 0, detalle: undefined } : i,
    ),
  );
}

export function marcarConflicto(id: string, detalle: string): void {
  escribir(
    leerRaw().map((i) =>
      i.id === id ? { ...i, estado: "conflicto" as const, detalle } : i,
    ),
  );
}

function bumpIntentos(id: string): void {
  escribir(
    leerRaw().map((i) =>
      i.id === id ? { ...i, intentos: i.intentos + 1 } : i,
    ),
  );
}

/**
 * Suscribe a cambios de la cola. Devuelve la función para desuscribir.
 * También escucha el evento `storage` para reflejar cambios de otras pestañas.
 */
export function suscribir(cb: Listener): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CLAVE) cb(leerRaw());
  };
  if (hayStorage()) window.addEventListener("storage", onStorage);
  // Primer disparo con el estado actual.
  cb(leerRaw());
  return () => {
    listeners.delete(cb);
    if (hayStorage()) window.removeEventListener("storage", onStorage);
  };
}

/** ¿Cuánto hay que esperar antes de reintentar el ítem, según sus intentos? */
export function backoffMs(intentos: number): number {
  return Math.min(BASE_BACKOFF * 2 ** intentos, MAX_BACKOFF);
}

// Cuántos ítems se procesan en paralelo. Cada handler ya tiene su propio
// timeout (8s); en serie, una cola de 77 ítems tarda hasta ~10 minutos en
// vaciarse aunque todo funcione — con esto son ~10 minutos / CONCURRENCIA.
const CONCURRENCIA = 6;

async function procesarUno(
  item: ItemCola,
  handlers: Record<string, Handler>,
): Promise<void> {
  const handler = handlers[item.tipo];
  if (!handler) return; // tipo desconocido: lo dejamos, no lo perdemos
  let res: ResultadoHandler;
  try {
    res = await handler(item.payload);
  } catch {
    res = { reintentar: true };
  }
  if ("ok" in res) {
    quitar(item.id);
    return;
  }
  if ("conflicto" in res) {
    marcarConflicto(item.id, res.detalle);
    return;
  }
  // reintentar
  if (item.intentos + 1 >= MAX_INTENTOS) {
    marcarConflicto(
      item.id,
      "No se pudo sincronizar después de varios intentos. Probá actualizar la app (puede haber una versión nueva) y volvé a intentar desde acá.",
    );
    return;
  }
  bumpIntentos(item.id);
}

/**
 * Recorre la cola en orden FIFO y procesa los pendientes con `handlers`, en
 * tandas de `CONCURRENCIA` en paralelo (cada ítem es independiente: el
 * dedup de check-in y la idempotency_key de pagos ya evitan que procesar
 * fuera de orden duplique algo).
 * - `ok`        → sale de la cola.
 * - `conflicto` → queda visible para revisión manual, no se reintenta.
 * - `reintentar`→ suma un intento (o pasa a conflicto si ya reintentó
 *   demasiadas veces); un ítem trabado no bloquea a los demás.
 *
 * Devuelve si quedaron pendientes (para que el provider reprograme).
 */
export async function procesarCola(
  handlers: Record<string, Handler>,
): Promise<{ quedanPendientes: boolean }> {
  const cola = leerRaw().filter((i) => i.estado === "pendiente");
  for (let i = 0; i < cola.length; i += CONCURRENCIA) {
    const tanda = cola.slice(i, i + CONCURRENCIA);
    await Promise.all(tanda.map((item) => procesarUno(item, handlers)));
  }
  return { quedanPendientes: pendientes().length > 0 };
}
