/**
 * Handlers por `tipo` de la cola offline.
 *
 * No hablan con Supabase directo: reinvocan la MISMA Server Action que el flujo
 * online (que corre con service_role del lado del server). Así no se toca RLS
 * ni se expone ninguna key, y el conflicto de DNI se detecta con el error que
 * `altaCliente` ya devuelve.
 */

import { marcarIngreso } from "@/app/checkin/actions";
import { altaCliente } from "@/app/panel/clientes/actions";
import {
  guardarProgresoCliente,
  guardarProgresoSocio,
} from "@/lib/progreso/actions";
import type { Handler, ResultadoHandler } from "./cola";

const TIMEOUT_MS = 8_000;

/** Corre la promesa con techo de tiempo; si se pasa, pide reintento. */
async function conTimeout<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; valor: T } | { ok: false }> {
  return Promise.race([
    fn().then((valor) => ({ ok: true as const, valor })),
    new Promise<{ ok: false }>((resolve) =>
      setTimeout(() => resolve({ ok: false }), TIMEOUT_MS),
    ),
  ]);
}

export type PayloadCheckin = { dni: string };

export type PayloadAlta = {
  nombre: string;
  dni: string;
  telefono?: string | null;
  email?: string | null;
  sexo?: string | null;
  plan_id?: string | null;
  foto_url?: string | null;
  modo: "completa" | "prueba";
};

const checkin: Handler<PayloadCheckin> = async (p) => {
  const fd = new FormData();
  fd.set("dni", p.dni);
  const r = await conTimeout(() => marcarIngreso({}, fd));
  if (!r.ok) return { reintentar: true };
  const st = r.valor;
  if (st.error) return { reintentar: true };
  // "no_encontrado" también cuenta como resuelto: reintentar no lo va a
  // arreglar y el kiosko ya avisó al encargado en su momento.
  if (st.estado) return { ok: true };
  return { reintentar: true };
};

const alta_cliente: Handler<PayloadAlta> = async (p) => {
  const fd = new FormData();
  fd.set("nombre", p.nombre);
  fd.set("dni", p.dni);
  if (p.telefono) fd.set("telefono", p.telefono);
  if (p.email) fd.set("email", p.email);
  if (p.sexo) fd.set("sexo", p.sexo);
  if (p.plan_id) fd.set("plan_id", p.plan_id);
  if (p.foto_url) fd.set("foto_url", p.foto_url);
  fd.set("modo", p.modo);

  const r = await conTimeout(() => altaCliente({}, fd));
  if (!r.ok) return { reintentar: true };
  const st = r.valor;
  if (st.alta || st.ok) return { ok: true };
  if (st.error) {
    if (/ya existe un cliente con ese dni/i.test(st.error)) {
      return {
        conflicto: true,
        detalle: `Ya hay un socio con DNI ${p.dni}. Puede que lo hayas cargado desde otro dispositivo — revisalo y descartá esta alta si corresponde.`,
      } satisfies ResultadoHandler;
    }
    return { reintentar: true };
  }
  return { reintentar: true };
};

export type PayloadProgreso = {
  ejercicio_id: string;
  peso: number;
  reps: number | null;
  cliente_id?: string;
};

const progreso_ejercicio: Handler<PayloadProgreso> = async (p) => {
  const fd = new FormData();
  fd.set("ejercicio_id", p.ejercicio_id);
  fd.set("peso", String(p.peso));
  if (p.reps !== null && p.reps !== undefined) fd.set("reps", String(p.reps));

  const r = await conTimeout(() =>
    p.cliente_id
      ? guardarProgresoSocio(p.cliente_id, {}, fd)
      : guardarProgresoCliente({}, fd),
  );
  if (!r.ok) return { reintentar: true };
  const st = r.valor;
  if (st.ok) return { ok: true };
  if (st.error) return { reintentar: true };
  return { reintentar: true };
};

export const HANDLERS: Record<string, Handler> = {
  checkin: checkin as Handler,
  alta_cliente: alta_cliente as Handler,
  progreso_ejercicio: progreso_ejercicio as Handler,
};
