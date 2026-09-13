import "server-only";

// Guardia contra "mutaciones silenciosas": un UPDATE/DELETE de Supabase que no
// matchea ninguna fila (id inexistente, RLS que lo filtra, carrera de estados)
// devuelve error: null y no avisa a nadie. La UI muestra un falso positivo.
//
// Uso: agregar `.select("id")` a la mutación y pasarla por acá.
//   await aplicarMutacion(
//     db.from("pagos").update({ estado }).eq("id", id).select("id"),
//     "marcar el pago como rechazado",
//   );

export const MSG_CERO_FILAS =
  "Operación rechazada por la base de datos (0 filas afectadas)";

export type ResultadoMutacion = {
  data: unknown[] | null;
  error: { message: string } | null;
};

export type IntentoMutacion =
  | { ok: true; filas: number }
  | { ok: false; msg: string };

/**
 * Ejecuta una mutación que ya trae `.select(...)` y devuelve cuántas filas
 * tocó. Nunca lanza: pensado para handlers que ya tienen su propio contrato
 * de error ({ error } de un useActionState, boolean, etc.).
 */
export async function intentarMutacion(
  q: PromiseLike<ResultadoMutacion>,
  contexto: string,
): Promise<IntentoMutacion> {
  const { data, error } = await q;
  if (error) return { ok: false, msg: `No se pudo ${contexto}: ${error.message}` };
  const filas = data?.length ?? 0;
  if (filas === 0) {
    return { ok: false, msg: `No se pudo ${contexto}. ${MSG_CERO_FILAS}.` };
  }
  return { ok: true, filas };
}

/**
 * Igual que `intentarMutacion`, pero lanza si la base rechazó la operación.
 * Para rutas donde seguir adelante dejaría los datos inconsistentes.
 */
export async function aplicarMutacion(
  q: PromiseLike<ResultadoMutacion>,
  contexto: string,
): Promise<number> {
  const r = await intentarMutacion(q, contexto);
  if (!r.ok) throw new Error(r.msg);
  return r.filas;
}
