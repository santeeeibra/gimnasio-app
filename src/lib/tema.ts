/**
 * Tema por gimnasio: cada elemento tiene su color propio (sin tinte automático).
 * Se guarda en `gimnasios.tema` (jsonb). `null` => valores por defecto.
 */

export type FuenteKey =
  | "moderno"
  | "tecnico"
  | "neutro"
  | "editorial"
  | "humanista"
  | "redondeado"
  | "condensado"
  | "contemporaneo"
  | "amigable";

export type Tema = {
  paper: string; // fondo de la app        -> --paper
  paper2: string; // tarjetas / barras     -> --paper-2
  ink: string; // texto principal          -> --ink
  inkSoft: string; // texto secundario     -> --ink-soft
  rule: string; // bordes / divisores      -> --rule
  volt: string; // acento (botones/badges) -> --volt
  voltInk: string; // texto sobre acento   -> --volt-ink
  fuente: FuenteKey; // familia tipográfica
};

export const DEFAULT_TEMA: Tema = {
  paper: "#faf9f6",
  paper2: "#f2efe7",
  ink: "#16181d",
  inkSoft: "#5b5f68",
  rule: "#e3ddcf",
  volt: "#cde94a",
  voltInk: "#1c2205",
  fuente: "moderno",
};

const STACK = "ui-sans-serif, system-ui, sans-serif";

export const FUENTES: Record<
  FuenteKey,
  { label: string; hint: string; display: string; sans: string }
> = {
  moderno: {
    label: "Moderno",
    hint: "Bricolage Grotesque + Inter",
    display: `var(--font-bricolage), ${STACK}`,
    sans: `var(--font-inter), ${STACK}`,
  },
  tecnico: {
    label: "Técnico",
    hint: "Space Grotesk + Inter",
    display: `var(--font-space), ${STACK}`,
    sans: `var(--font-inter), ${STACK}`,
  },
  neutro: {
    label: "Neutro",
    hint: "Geist — minimalista sistema",
    display: `var(--font-geist), ${STACK}`,
    sans: `var(--font-geist), ${STACK}`,
  },
  editorial: {
    label: "Editorial",
    hint: "Fraunces + Inter — serif clásica",
    display: `var(--font-fraunces), Georgia, serif`,
    sans: `var(--font-inter), ${STACK}`,
  },
  humanista: {
    label: "Humanista",
    hint: "DM Sans — suave y profesional",
    display: `var(--font-dm-sans), ${STACK}`,
    sans: `var(--font-dm-sans), ${STACK}`,
  },
  redondeado: {
    label: "Redondeado",
    hint: "Manrope — geométrica amable",
    display: `var(--font-manrope), ${STACK}`,
    sans: `var(--font-manrope), ${STACK}`,
  },
  condensado: {
    label: "Condensado",
    hint: "Archivo — alta densidad",
    display: `var(--font-archivo), ${STACK}`,
    sans: `var(--font-inter), ${STACK}`,
  },
  contemporaneo: {
    label: "Contemporáneo",
    hint: "Sora — display moderno",
    display: `var(--font-sora), ${STACK}`,
    sans: `var(--font-sora), ${STACK}`,
  },
  amigable: {
    label: "Amigable",
    hint: "Plus Jakarta Sans — cálida",
    display: `var(--font-plus-jakarta), ${STACK}`,
    sans: `var(--font-plus-jakarta), ${STACK}`,
  },
};

export const CAMPOS_COLOR: {
  key: keyof Omit<Tema, "fuente">;
  label: string;
  hint: string;
}[] = [
  { key: "paper", label: "Fondo de la app", hint: "Fondo general" },
  { key: "paper2", label: "Fondo de tarjetas", hint: "Tarjetas, barras, zonas destacadas" },
  { key: "ink", label: "Texto principal", hint: "Títulos y texto fuerte" },
  { key: "inkSoft", label: "Texto secundario", hint: "Subtítulos y ayudas" },
  { key: "rule", label: "Bordes", hint: "Líneas divisorias y bordes" },
  { key: "volt", label: "Acento", hint: "Botones, badges, destacados" },
  { key: "voltInk", label: "Texto sobre acento", hint: "Texto encima del color de acento" },
];

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

export function parseTema(raw: unknown): Tema {
  const t = (raw ?? {}) as Record<string, unknown>;
  const hex = (v: unknown, d: string) => (isHex(v) ? v : d);
  const fuente = (
    typeof t.fuente === "string" && t.fuente in FUENTES
      ? t.fuente
      : DEFAULT_TEMA.fuente
  ) as FuenteKey;
  return {
    paper: hex(t.paper, DEFAULT_TEMA.paper),
    paper2: hex(t.paper2, DEFAULT_TEMA.paper2),
    ink: hex(t.ink, DEFAULT_TEMA.ink),
    inkSoft: hex(t.inkSoft, DEFAULT_TEMA.inkSoft),
    rule: hex(t.rule, DEFAULT_TEMA.rule),
    volt: hex(t.volt, DEFAULT_TEMA.volt),
    voltInk: hex(t.voltInk, DEFAULT_TEMA.voltInk),
    fuente,
  };
}

/** CSS custom properties para inyectar en el `style` de un contenedor. */
export function temaToVars(t: Tema): React.CSSProperties {
  const f = FUENTES[t.fuente];
  return {
    "--paper": t.paper,
    "--paper-2": t.paper2,
    "--ink": t.ink,
    "--ink-soft": t.inkSoft,
    "--rule": t.rule,
    "--volt": t.volt,
    "--volt-ink": t.voltInk,
    "--app-font-display": f.display,
    "--app-font-sans": f.sans,
  } as React.CSSProperties;
}
