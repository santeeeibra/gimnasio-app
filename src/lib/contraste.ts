/**
 * Validación de contraste WCAG 2.1 para el editor de tema.
 * Mide la legibilidad de combinaciones texto/fondo, sin modificar colores.
 */

import type { ColorKey, Tema } from "./tema";

type ParContraste = {
  a: ColorKey;
  b: ColorKey;
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

/**
 * Pares texto/fondo que NO se pueden saltear ni con el checkbox: si el texto
 * principal no se lee sobre el fondo o sobre las tarjetas, la app es inusable.
 */
export const PARES_BLOQUEANTES: ParContraste[] = [
  { a: "ink", b: "paper", label: "Texto principal sobre el fondo", umbral: 4.5 },
  { a: "ink", b: "paper2", label: "Texto principal sobre las tarjetas", umbral: 4.5 },
];

/**
 * Separación mínima (ratio WCAG) entre el fondo y el fondo de tarjetas. No es un
 * par texto/fondo: asegura que tarjetas e inputs no desaparezcan sobre el fondo.
 * El default deriva ~1.09; 1.05 deja margen y sólo frena el caso patológico.
 */
export const SEPARACION_SUPERFICIES_MIN = 1.05;

export type ResultadoBloqueo = { bloqueado: boolean; motivos: string[] };

/**
 * Chequeos que impiden guardar el tema (sin excepción por checkbox):
 * legibilidad básica del texto principal + separación fondo/tarjetas.
 */
export function chequearBloqueos(tema: Tema): ResultadoBloqueo {
  const motivos: string[] = [];

  for (const par of PARES_BLOQUEANTES) {
    const r = ratio(tema[par.a], tema[par.b]);
    if (r < par.umbral) {
      motivos.push(
        `${par.label}: contraste ${r.toFixed(1)}:1 (mínimo ${par.umbral}:1).`,
      );
    }
  }

  if (ratio(tema.paper, tema.paper2) < SEPARACION_SUPERFICIES_MIN) {
    motivos.push(
      "El fondo y el fondo de tarjetas son casi idénticos: las tarjetas e inputs no se distinguen.",
    );
  }

  return { bloqueado: motivos.length > 0, motivos };
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

/** Mezcla dos hex en HSL. t=0 => hexA, t=1 => hexB (hue por el camino corto). */
function mezclarHsl(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA;
  const [ha, sa, la] = rgbToHsl(...a);
  const [hb, sb, lb] = rgbToHsl(...b);
  let dh = hb - ha;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  const h = (ha + dh * t + 1) % 1;
  return rgbToHex(...hslToRgb(h, sa + (sb - sa) * t, la + (lb - la) * t));
}

/**
 * A partir de los tres colores que elige el usuario (fondo, texto y acento),
 * deriva el resto de la paleta para que la UI quede coherente y legible:
 * tarjetas apenas separadas del fondo, texto secundario atenuado pero con
 * contraste >= 4.5, borde hairline y texto sobre el acento con contraste >= 4.5.
 */
export function derivarPaleta(
  base: Pick<Tema, "paper" | "ink" | "volt">,
): Pick<Tema, "paper2" | "inkSoft" | "rule" | "voltInk"> {
  const { paper, ink, volt } = base;

  // Superficie de tarjeta: un paso mínimo del fondo hacia el texto, empujando
  // hasta garantizar que se distinga del fondo (SEPARACION_SUPERFICIES_MIN).
  let paper2 = mezclarHsl(paper, ink, 0.06);
  for (let mix = 0.1; mix <= 0.6 && ratio(paper, paper2) < SEPARACION_SUPERFICIES_MIN; mix += 0.04) {
    paper2 = mezclarHsl(paper, ink, mix);
  }
  if (ratio(paper, paper2) < SEPARACION_SUPERFICIES_MIN) {
    // El texto está demasiado cerca del fondo: separar hacia el extremo opuesto.
    const paperClaro = luminanciaRelativa(...(hexToRgb(paper) ?? [0, 0, 0])) > 0.5;
    const extremo = paperClaro ? "#000000" : "#ffffff";
    for (let t = 0.03; t <= 0.4 && ratio(paper, paper2) < SEPARACION_SUPERFICIES_MIN; t += 0.03) {
      paper2 = mezclarHsl(paper, extremo, t);
    }
  }

  // Borde hairline: un paso algo más marcado (estético, no forzamos WCAG).
  const rule = mezclarHsl(paper, ink, 0.14);

  // Texto secundario: el texto principal atenuado hacia el fondo.
  let inkSoft = mezclarHsl(ink, paper, 0.32);
  // Debe leerse sobre el fondo y sobre las tarjetas: ajustar contra el peor caso.
  const peorFondo =
    ratio(inkSoft, paper) < ratio(inkSoft, paper2) ? paper : paper2;
  if (ratio(inkSoft, peorFondo) < 4.5) {
    inkSoft = sugerirAjuste(peorFondo, inkSoft, 4.5);
  }

  // Texto sobre el acento: claro u oscuro según el acento, teñido con su hue.
  const vRgb = hexToRgb(volt) ?? [0, 0, 0];
  const [vH, vS] = rgbToHsl(...vRgb);
  const acentoClaro = luminanciaRelativa(...vRgb) > 0.4;
  let voltInk = rgbToHex(
    ...hslToRgb(vH, Math.min(vS, 0.4), acentoClaro ? 0.12 : 0.96),
  );
  if (ratio(voltInk, volt) < 4.5) {
    voltInk = sugerirAjuste(volt, voltInk, 4.5);
  }

  return { paper2, inkSoft, rule, voltInk };
}

