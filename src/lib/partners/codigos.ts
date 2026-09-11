import "server-only";

/** Regex del constraint SQL `partners.referral_code`: 5-40 chars, minusculas/numeros/guiones. */
const RE_REFERRAL_CODE = /^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$/;

// Rango Unicode de marcas diacriticas combinantes (U+0300-U+036F), lo que
// queda de una vocal acentuada tras normalize("NFD"). Se arma con \uXXXX
// para evitar problemas de encoding entre editores/terminales.
const RE_DIACRITICOS = /[\u0300-\u036f]/g;

export function normalizarReferralCode(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(RE_DIACRITICOS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function esReferralCodeValido(code: string): boolean {
  return RE_REFERRAL_CODE.test(code);
}

/** Sugiere un codigo a partir del nombre del partner, ej. "Matias Gomez" -> "matias-gomez". */
export function sugerirReferralCode(nombre: string): string {
  const base = normalizarReferralCode(nombre).slice(0, 30) || "partner";
  return base.length >= 4 ? base : `${base}-partner`;
}
