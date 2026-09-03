import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** De dónde salió el error. Mismo criterio que la columna `origen`. */
export type OrigenError =
  | "alta_cliente"
  | "checkin"
  | "rutina"
  | "pago"
  | "push";

/** Texto legible por origen, para mostrar en /admin/errores sin jerga. */
export const ORIGEN_LABEL: Record<OrigenError, string> = {
  alta_cliente: "Alta de socio",
  checkin: "Check-in",
  rutina: "Rutina",
  pago: "Pago",
  push: "Notificación",
};

/** Semáforo por gimnasio según la cantidad de errores en las últimas 24 h. */
export type SemaforoNivel = "verde" | "amarillo" | "rojo";

export function semaforo(cantidad: number): SemaforoNivel {
  if (cantidad >= 3) return "rojo";
  if (cantidad >= 1) return "amarillo";
  return "verde";
}

export const SEMAFORO_COLOR: Record<SemaforoNivel, string> = {
  verde: "bg-ok",
  amarillo: "bg-warn",
  rojo: "bg-danger",
};

export const SEMAFORO_TITULO: Record<SemaforoNivel, string> = {
  verde: "Sin errores en las últimas 24 h",
  amarillo: "1 o 2 errores en las últimas 24 h",
  rojo: "3 o más errores en las últimas 24 h",
};

/** Texto tipo "hace 5 min" / "hace 2 h" / "hace 3 días", sin jerga. */
export function haceCuanto(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return "recién";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

function aTexto(mensaje: unknown): string {
  if (mensaje instanceof Error) {
    return `${mensaje.name}: ${mensaje.message}`;
  }
  if (typeof mensaje === "string") return mensaje;
  try {
    return JSON.stringify(mensaje);
  } catch {
    return String(mensaje);
  }
}

/**
 * Registra un error en `errores_app` para el semáforo de /admin.
 * NUNCA lanza: si el insert falla, sólo lo loguea. El flujo que la llama
 * no debe cambiar su comportamiento por esto.
 */
export async function registrarError(
  gimnasioId: string | null | undefined,
  origen: OrigenError,
  mensaje: unknown,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("errores_app").insert({
      gimnasio_id: gimnasioId ?? null,
      origen,
      mensaje: aTexto(mensaje).slice(0, 2000),
    });
  } catch (err) {
    console.error("[admin/errores]", err);
  }
}
