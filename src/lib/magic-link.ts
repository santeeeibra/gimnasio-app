import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Token firmado para "probar mi gym": profileId + expiración, firmado con
// HMAC (reusa SUPABASE_SERVICE_ROLE_KEY como secreto, ya es server-only).
// Sirve para CUALQUIER gimnasio: se firma el profileId puntual del dueño
// (o socio) que se quiere dejar entrar sin login. No es impersonación —
// abre una sesión real de esa persona, como si hubiera puesto su clave.

function secreto(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return s;
}

function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function generarMagicToken(profileId: string, horasValidez = 72): string {
  const exp = Date.now() + horasValidez * 60 * 60 * 1000;
  const payload = `${profileId}.${exp}`;
  const firma = firmar(payload);
  return Buffer.from(`${payload}.${firma}`).toString("base64url");
}

export function verificarMagicToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [profileId, expStr, firma] = decoded.split(".");
    if (!profileId || !expStr || !firma) return null;

    const esperada = firmar(`${profileId}.${expStr}`);
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    if (Date.now() > Number(expStr)) return null;

    return profileId;
  } catch {
    return null;
  }
}
