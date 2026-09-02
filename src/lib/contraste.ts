/**
 * Validación de contraste WCAG 2.1 para el editor de tema.
 * Mide la legibilidad de combinaciones texto/fondo, sin modificar colores.
 */

import type { Tema } from "./tema";

type ParContraste = {
  a: keyof Omit<Tema, "fuente">;
  b: keyof Omit<Tema, "fuente">;
  label: string;
  umbral: number;
};

type ResultadoPar = ParContraste & {
  ratio: number;
  ok: boolean;
};

export type ResultadoContraste = {
  pares: ResultadoPar[];
  hayFallos: boolean;
};

/** Pares de colores críticos y sus umbrales mínimos WCAG. */
export const PARES_CONTRASTE: ParContraste[] = [
  { a: "ink", b: "paper", label: "Texto principal sobre fondo", umbral: 4.5 },
  {
    a: "inkSoft",
    b: "paper",
    label: "Texto secundario sobre fondo",
    umbral: 4.5,
  },
  {
    a: "ink",
    b: "paper2",
    label: "Texto principal sobre tarjetas",
    umbral: 4.5,
  },
  {
    a: "inkSoft",
    b: "paper2",
    label: "Texto secundario sobre tarjetas",
    umbral: 4.5,
  },
  { a: "voltInk", b: "volt", label: "Texto sobre acento", umbral: 4.5 },
  { a: "rule", b: "paper", label: "Bordes sobre fondo", umbral: 3.0 },
];

/** Convierte #RRGGBB a [r, g, b] en rango 0-255. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hex);
  if (!match) return null;
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ];
}

/** Convierte RGB a HSL. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255];
  const max = Math.max(rs, gs, bs);
  const min = Math.min(rs, gs, bs);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === rs) h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6;
  else if (max === gs) h = ((bs - rs) / d + 2) / 6;
  else h = ((rs - gs) / d + 4) / 6;

  return [h, s, l];
}

/** Convierte HSL a RGB. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/** Convierte [r, g, b] a #RRGGBB. */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Luminancia relativa sRGB según WCAG 2.1. */
export function luminanciaRelativa(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Ratio de contraste WCAG entre dos hex. Devuelve >= 1. */
export function ratio(hexA: string, hexB: string): number {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  if (!rgbA || !rgbB) return 1;

  const lumA = luminanciaRelativa(...rgbA);
  const lumB = luminanciaRelativa(...rgbB);
  const [l1, l2] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];

  return (l1 + 0.05) / (l2 + 0.05);
}

/** Chequea todos los pares críticos del tema. */
export function chequearContraste(tema: Tema): ResultadoContraste {
  const pares = PARES_CONTRASTE.map((par) => {
    const r = ratio(tema[par.a], tema[par.b]);
    return {
      ...par,
      ratio: r,
      ok: r >= par.umbral,
    };
  });

  return {
    pares,
    hayFallos: pares.some((p) => !p.ok),
  };
}

/**
 * Sugiere un ajuste al color ajustable para alcanzar el umbral de contraste.
 * Modifica solo la luminosidad (L en HSL), manteniendo hue y saturación.
 */
export function sugerirAjuste(
  hexFijo: string,
  hexAjustable: string,
  umbral: number,
): string {
  const rgbAjustable = hexToRgb(hexAjustable);
  if (!rgbAjustable) return hexAjustable;

  const [h, s, l] = rgbToHsl(...rgbAjustable);

  // Determinar si necesitamos aclarar u oscurecer
  const lumFijo =
    luminanciaRelativa(...(hexToRgb(hexFijo) || [0, 0, 0]));
  const lumAjustable = luminanciaRelativa(...rgbAjustable);

  // Si el fijo es más claro, oscurecer el ajustable; si no, aclararlo
  const paso = lumFijo > lumAjustable ? -0.02 : 0.02;
  let nuevoL = l;

  // Iterar hasta alcanzar el umbral o los límites (0 o 1)
  for (let i = 0; i < 50; i++) {
    nuevoL += paso;
    if (nuevoL < 0 || nuevoL > 1) break;

    const nuevoRgb = hslToRgb(h, s, nuevoL);
    const nuevoHex = rgbToHex(...nuevoRgb);

    if (ratio(hexFijo, nuevoHex) >= umbral) {
      return nuevoHex;
    }
  }

  // Si no se alcanzó el umbral, devolver L al límite más cercano
  const limiteL = paso < 0 ? 0 : 1;
  return rgbToHex(...hslToRgb(h, s, limiteL));
}

