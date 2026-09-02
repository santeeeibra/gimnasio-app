import crypto from "crypto";

/**
 * Hashea un PIN de 4-6 dígitos con SHA-256.
 * No usamos bcrypt porque los PINs son cortos y bcrypt es lento en el edge.
 * Para mayor seguridad, agregamos un salt fijo (en producción debería estar en .env).
 */
const SALT = process.env.PIN_SALT || "sistema-gym-pin-salt-2026";

export function hashPin(pin: string): string {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("El PIN debe tener entre 4 y 6 dígitos.");
  }
  return crypto
    .createHash("sha256")
    .update(pin + SALT)
    .digest("hex");
}

export function verificarPin(pin: string, hash: string): boolean {
  try {
    return hashPin(pin) === hash;
  } catch {
    return false;
  }
}
