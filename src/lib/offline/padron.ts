/**
 * Padrón local de socios: copia cacheada en localStorage del listado
 * "dni -> estado" del gimnasio, para poder decidir un check-in AL INSTANTE
 * sin depender de la red (el gym puede no tener internet nunca, no sólo
 * cortes puntuales).
 *
 * Se refresca solo cuando hay conexión (ver OfflineProvider). Las escrituras
 * (check-in, pago) se aplican también acá de forma optimista, para que un
 * segundo movimiento del mismo socio en la misma PC, antes de sincronizar,
 * ya vea el estado correcto.
 */

import { sumarDias } from "./fecha";
import { pendientes } from "./cola";

export type SocioPadron = {
  cliente_id: string;
  profile_id: string;
  dni: string;
  nombre: string;
  estado_cuota: "al_dia" | "por_vencer" | "vencido";
  fecha_vencimiento: string | null;
  en_prueba: boolean;
  prueba_iniciada_en: string | null;
  plan_id: string | null;
  plan_duracion_dias: number | null;
};

type Padron = {
  actualizadoEn: number;
  socios: SocioPadron[];
};

const CLAVE = "gym.padron.v1";

function hayStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function leerPadron(): Padron | null {
  if (!hayStorage()) return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    return JSON.parse(crudo) as Padron;
  } catch {
    return null;
  }
}

function escribirPadron(p: Padron): void {
  if (!hayStorage()) return;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin espacio o modo privado: no rompemos la UI */
  }
}

/**
 * Clientes con una escritura optimista local (pago o check-in) que todavía
 * no confirmó el server. Mientras estén en la cola, el refresh no puede
 * pisar ese estado local con el "viejo" del server o se perdería la
 * actualización hasta que la cola sincronice (ventana en la que, por
 * ejemplo, un socio que ya pagó offline volvería a figurar como vencido).
 */
function clientesProtegidos(padronActual: Padron | null): Set<string> {
  const protegidos = new Set<string>();
  for (const item of pendientes()) {
    if (item.tipo === "pago_cuota") {
      const p = item.payload as { cliente_id?: string };
      if (p.cliente_id) protegidos.add(p.cliente_id);
    } else if (item.tipo === "checkin" && padronActual) {
      const p = item.payload as { dni?: string };
      const socio = padronActual.socios.find((s) => s.dni === p.dni);
      if (socio) protegidos.add(socio.cliente_id);
    }
  }
  return protegidos;
}

/** Trae el padrón fresco del server y lo cachea. Sólo tiene sentido con red. */
export async function refrescarPadron(): Promise<boolean> {
  try {
    const res = await fetch("/api/panel/checkin-padron", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    if (!Array.isArray(data.socios)) return false;

    const actual = leerPadron();
    const protegidos = clientesProtegidos(actual);
    const socios: SocioPadron[] = protegidos.size
      ? data.socios.map((fresco: SocioPadron) => {
          const local = actual?.socios.find((s) => s.cliente_id === fresco.cliente_id);
          return protegidos.has(fresco.cliente_id) && local ? local : fresco;
        })
      : data.socios;

    escribirPadron({ actualizadoEn: Date.now(), socios });
    return true;
  } catch {
    return false;
  }
}

export function buscarPorDni(dni: string): SocioPadron | null {
  const p = leerPadron();
  if (!p) return null;
  return p.socios.find((s) => s.dni === dni) ?? null;
}

export type DecisionCheckinLocal = {
  estado: "ok" | "prueba_vencida" | "cuota_vencida" | "no_encontrado";
  nombre?: string;
};

/**
 * Misma lógica de negocio que `marcarIngresoInterno` en el server, pero
 * corrida contra el padrón cacheado. No es 100% idéntica (no sabe si es
 * "el primer ingreso" con precisión de registros_entrada), usa
 * `prueba_iniciada_en` como proxy — igual que ya hace el server para decidir
 * si arranca la prueba.
 */
export function decidirCheckinLocal(dni: string): DecisionCheckinLocal {
  const socio = buscarPorDni(dni);
  if (!socio) return { estado: "no_encontrado" };

  if (socio.en_prueba) {
    if (!socio.prueba_iniciada_en) {
      // Primer ingreso en prueba: la marcamos localmente para que el
      // próximo escaneo en esta PC (antes de sincronizar) ya la vea vencida.
      actualizarSocioLocal(socio.cliente_id, {
        prueba_iniciada_en: new Date().toISOString().slice(0, 10),
      });
      return { estado: "ok", nombre: socio.nombre };
    }
    return { estado: "prueba_vencida", nombre: socio.nombre };
  }

  if (socio.estado_cuota === "vencido") {
    return { estado: "cuota_vencida", nombre: socio.nombre };
  }

  return { estado: "ok", nombre: socio.nombre };
}

/** Aplica una actualización parcial sobre un socio del padrón cacheado. */
export function actualizarSocioLocal(
  clienteId: string,
  cambios: Partial<SocioPadron>,
): void {
  const p = leerPadron();
  if (!p) return;
  const socios = p.socios.map((s) =>
    s.cliente_id === clienteId ? { ...s, ...cambios } : s,
  );
  escribirPadron({ ...p, socios });
}

/**
 * Aplica localmente el efecto de un pago (misma regla que el server: si
 * todavía tiene días, se suma sobre el vencimiento; si ya venció, arranca
 * hoy) para que el padrón quede al día antes de sincronizar.
 */
export function aplicarPagoLocal(
  clienteId: string,
  duracionDias: number,
  fechaVencimientoManual: string | null,
): string {
  const p = leerPadron();
  const socio = p?.socios.find((s) => s.cliente_id === clienteId);
  const base =
    !fechaVencimientoManual && socio?.fecha_vencimiento && new Date(socio.fecha_vencimiento) > new Date()
      ? new Date(socio.fecha_vencimiento)
      : new Date();
  const cubreHasta = fechaVencimientoManual || sumarDias(base, duracionDias);
  actualizarSocioLocal(clienteId, {
    estado_cuota: "al_dia",
    fecha_vencimiento: cubreHasta,
  });
  return cubreHasta;
}
