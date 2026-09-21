/**
 * Lógica pura del backend del torniquete (dispositivo ESP32/Wokwi).
 *
 * Igual que `src/lib/acceso/decision.ts` para el check-in: nada acá toca
 * Supabase ni hardware. El route handler (`src/app/api/torniquete/comando`)
 * hace las lecturas/escrituras y le pasa los datos ya leídos a estas
 * funciones para decidir. Esto es lo que permite testear token
 * válido/inválido/revocado y las reglas de vencimiento/idempotencia sin una
 * base de datos real.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type Comando = "OPEN_ENTRY" | "DENY";

export function generarTokenDispositivo(): string {
  return randomBytes(32).toString("hex");
}

export function hashearToken(tokenPlano: string): string {
  return createHash("sha256").update(tokenPlano).digest("hex");
}

/** Compara en tiempo constante para no filtrar el hash por timing. */
export function tokenCoincide(tokenPlano: string, hashGuardado: string): boolean {
  const calculado = Buffer.from(hashearToken(tokenPlano), "utf8");
  const guardado = Buffer.from(hashGuardado, "utf8");
  if (calculado.length !== guardado.length) return false;
  return timingSafeEqual(calculado, guardado);
}

export type DispositivoAuth = {
  tokenHash: string;
  revocadoEn: string | null;
};

export type ResultadoAuth =
  | { autenticado: true }
  | { autenticado: false; motivo: "token_invalido" | "dispositivo_revocado" };

/**
 * `dispositivo` es el registro encontrado por token_hash (o null si no hubo
 * match en la DB). La revocación se chequea después de confirmar el token
 * para poder distinguir "token que nunca existió" de "token que existió y
 * fue revocado" — útil para logs/alertas, aunque el ESP32 reciba 401 en
 * ambos casos.
 */
export function verificarAutenticacionDispositivo(
  tokenPlano: string,
  dispositivo: DispositivoAuth | null,
): ResultadoAuth {
  if (!dispositivo || !tokenCoincide(tokenPlano, dispositivo.tokenHash)) {
    return { autenticado: false, motivo: "token_invalido" };
  }
  if (dispositivo.revocadoEn) {
    return { autenticado: false, motivo: "dispositivo_revocado" };
  }
  return { autenticado: true };
}

export type EstadoComando = "pendiente" | "entregado" | "confirmado" | "expirado";

export type ComandoPendiente = {
  id: string;
  estado: EstadoComando;
  creadoEn: string;
  venceEn: string;
};

export function comandoVencido(comando: Pick<ComandoPendiente, "venceEn">, ahora: Date): boolean {
  return new Date(comando.venceEn).getTime() <= ahora.getTime();
}

/**
 * Misma regla que usa `torniquete_entregar_comando` en SQL (el pendiente más
 * viejo, no vencido). La atomicidad real ante dos polls concurrentes la da
 * el UPDATE + FOR UPDATE SKIP LOCKED de Postgres, no esta función — acá sólo
 * se testea que la regla de selección sea la correcta.
 */
export function elegirComandoAEntregar(
  comandos: ComandoPendiente[],
  ahora: Date,
): ComandoPendiente | null {
  const candidatos = comandos
    .filter((c) => c.estado === "pendiente" && !comandoVencido(c, ahora))
    .sort((a, b) => new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime());
  return candidatos[0] ?? null;
}

export type ComandoEntregado = {
  estado: EstadoComando;
  entregadoA: string | null;
};

export type ResultadoConfirmacion =
  | { ok: true }
  | { ok: false; motivo: "no_entregado" | "dispositivo_incorrecto" };

/**
 * Decide si una confirmación es válida. Acepta tanto 'entregado' (primera
 * confirmación) como 'confirmado' (reintento del mismo dispositivo) para que
 * una confirmación repetida sea inofensiva en vez de un error — el ESP32
 * puede reintentar el POST si no vio la respuesta y no debe romper nada.
 */
export function puedeConfirmar(
  comando: ComandoEntregado,
  dispositivoId: string,
): ResultadoConfirmacion {
  if (comando.estado !== "entregado" && comando.estado !== "confirmado") {
    return { ok: false, motivo: "no_entregado" };
  }
  if (comando.entregadoA !== dispositivoId) {
    return { ok: false, motivo: "dispositivo_incorrecto" };
  }
  return { ok: true };
}
