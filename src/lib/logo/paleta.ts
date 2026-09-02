/**
 * Color dominante del logo -> paletas sugeridas.
 * Reusa el motor de tema existente (`derivarPaleta` / `chequearBloqueos` de
 * `src/lib/contraste.ts`): sólo lo consume, no lo reescribe.
 */

import { chequearBloqueos, derivarPaleta } from "@/lib/contraste";
import { DEFAULT_TEMA, type ColoresTema, type PresetTema } from "@/lib/tema";

// ── Color helpers locales (no tocamos contraste.ts) ─────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255];
  const max = Math.max(rs, gs, bs);
  const min = Math.min(rs, gs, bs);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rs) h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6;
  else if (max === gs) h = ((bs - rs) / d + 2) / 6;
  else h = ((rs - gs) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
}

const HEX = /^#[0-9a-f]{6}$/i;

function normalizarHex(v: string): string | null {
  if (HEX.test(v)) return v.toLowerCase();
  const m = /^#?([0-9a-f]{3})$/i.exec(v);
  if (m) {
    const [a, b, c] = m[1];
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return null;
}

/** Ajusta la luminosidad (HSL) del color, manteniendo tono y saturación. */
function ajustarLuz(hex: string, delta: number): string {
  const h = normalizarHex(hex);
  if (!h) return hex;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const [hh, ss, ll] = rgbToHsl(r, g, b);
  const nl = Math.max(0, Math.min(1, ll + delta));
  return rgbToHex(...hslToRgb(hh, ss, nl));
}

// ── Extracción del color dominante ─────────────────────────────────────────

/**
 * Color más vibrante del logo. Descarta casi blancos / negros / grises
 * (saturación o luminosidad extremas) y transparencias.
 */
export function colorDominante(data: ImageData): string {
  const px = data.data;
  const buckets = new Map<
    string,
    { n: number; r: number; g: number; b: number }
  >();

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue; // transparente
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const [, s, l] = rgbToHsl(r, g, b);
    if (s < 0.18 || l < 0.12 || l > 0.9) continue; // gris / casi blanco o negro
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n++;
    cur.r += r;
    cur.g += g;
    cur.b += b;
    buckets.set(key, cur);
  }

  let mejor: string | null = null;
  let mejorScore = 0;
  for (const c of buckets.values()) {
    const r = c.r / c.n;
    const g = c.g / c.n;
    const b = c.b / c.n;
    const [, s] = rgbToHsl(r, g, b);
    // Peso: frecuencia * (base + saturación) -> gana el más presente y vibrante.
    const score = c.n * (0.35 + s);
    if (score > mejorScore) {
      mejorScore = score;
      mejor = rgbToHex(Math.round(r), Math.round(g), Math.round(b));
    }
  }

  return mejor ?? DEFAULT_TEMA.volt;
}

// ── Paletas sugeridas ─────────────────────────────────────────────────────

// Pares fondo/texto ya validados: garantizan los bloqueos de contraste
// (`ink`/`paper`, `ink`/`paper-2`, separación de superficies). Sólo variamos
// el acento y dejamos que `derivarPaleta()` calcule el resto.
const CLARO = { paper: "#faf9f6", ink: "#16181d" };
const CLARO_2 = { paper: "#fbfaf7", ink: "#1a1c22" };
const OSCURO = { paper: "#14161a", ink: "#f3f4f6" };

function armar(
  key: string,
  label: string,
  hint: string,
  base: { paper: string; ink: string },
  volt: string,
): PresetTema {
  const derivados = derivarPaleta({ paper: base.paper, ink: base.ink, volt });
  const colores: ColoresTema = {
    paper: base.paper,
    ink: base.ink,
    volt,
    ...derivados,
  };
  return { key, label, hint, colores };
}

/**
 * 2-3 variantes derivadas del color dominante del logo. Todas pasan
 * `chequearBloqueos()` (o se descartan). Mismo formato que `PRESETS_TEMA`:
 * un tap y guardar.
 */
export function paletasDesdeColor(acentoRaw: string): PresetTema[] {
  const acento = normalizarHex(acentoRaw) ?? DEFAULT_TEMA.volt;

  const candidatas = [
    armar("logo-claro", "Del logo", "Fondo claro", CLARO, acento),
    armar(
      "logo-suave",
      "Del logo · suave",
      "Acento más luminoso",
      CLARO_2,
      ajustarLuz(acento, 0.14),
    ),
    armar(
      "logo-oscuro",
      "Del logo · oscuro",
      "Fondo oscuro",
      OSCURO,
      ajustarLuz(acento, 0.06),
    ),
  ];

  return candidatas.filter(
    (p) => !chequearBloqueos({ ...DEFAULT_TEMA, ...p.colores }).bloqueado,
  );
}
