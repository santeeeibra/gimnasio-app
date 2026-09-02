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
