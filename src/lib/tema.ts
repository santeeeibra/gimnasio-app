/**
 * Tema por gimnasio: cada elemento tiene su color propio (sin tinte automático).
 * Se guarda en `gimnasios.tema` (jsonb). `null` => valores por defecto.
 */

import { hexToRgb, luminanciaRelativa, ratio, sugerirAjuste } from "./contraste";

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

export type EstiloVisual =
  | "clasico"
  | "futurista"
  | "estudio"
  | "concreto"
  | "cancha";

export type ReposoIntensidad = "sutil" | "normal" | "estatico";

/**
 * Pantalla de reposo (screensaver) del modo check-in / kiosko. Se anida en
 * `gimnasios.tema` (jsonb) para no sumar una columna; `parseTema` le pone
 * defaults si falta. El dueño la configura en `/panel/ajustes`.
 */
export type ReposoCheckin = {
  activo: boolean;
  /** Segundos de inactividad antes de entrar en reposo (15–600). */
  segundos: number;
  /** Texto grande en la pantalla de reposo (1–60 caracteres). */
  mensaje: string;
  mostrarReloj: boolean;
  mostrarLogo: boolean;
  /** Movimiento del fondo ambiental. `estatico` = sin animación. */
  intensidad: ReposoIntensidad;
};

export type Tema = {
  paper: string; // fondo de la app        -> --paper
  paper2: string; // tarjetas / barras     -> --paper-2
  ink: string; // texto principal          -> --ink
  inkSoft: string; // texto secundario     -> --ink-soft
  rule: string; // bordes / divisores      -> --rule
  volt: string; // acento (botones/badges) -> --volt
  voltInk: string; // texto sobre acento   -> --volt-ink
  fuente: FuenteKey; // familia tipográfica

  // Estilo visual: cada valor distinto de "clasico" trae su propio
  // tratamiento (paleta base, tipografía sugerida, textura/efecto ambiental,
  // número héroe). Ver REGLAS_UI_EMIL.md §17 y ESTILOS_VISUALES abajo.
  estiloVisual: EstiloVisual;

  // Personalización UI
  escalaFuente: number; // 0.875 | 1 | 1.125 | 1.25
  radiosBordes: "tight" | "normal" | "soft";
  espaciado: "compact" | "normal" | "spacious";
  navegacionMovil: "bottom" | "sidebar" | "top";
  navegacionDesktop: "sidebar" | "top";
  densidad: "compact" | "comfortable" | "spacious";

  // Pantalla de reposo del modo check-in (vive en el mismo jsonb).
  reposoCheckin: ReposoCheckin;
};

export const DEFAULT_REPOSO_CHECKIN: ReposoCheckin = {
  activo: true,
  segundos: 60,
  mensaje: "Tocá para registrar tu ingreso",
  mostrarReloj: true,
  mostrarLogo: true,
  intensidad: "normal",
};

export const DEFAULT_TEMA: Tema = {
  // Mismos valores que TEMA_OBSIDIAN: es el diseño por defecto para
  // gimnasios que no personalizaron nada. Obsidian sigue además como
  // opción elegible en PRESETS_TEMA.
  paper: "#090d14",
  paper2: "#121722",
  ink: "#f8fafc",
  inkSoft: "#94a3b8",
  rule: "#242e42",
  volt: "#10e7a0",
  voltInk: "#042417",
  fuente: "amigable",
  estiloVisual: "futurista",

  // Defaults UI
  escalaFuente: 1,
  radiosBordes: "normal",
  espaciado: "normal",
  navegacionMovil: "bottom",
  navegacionDesktop: "sidebar",
  densidad: "comfortable",
  reposoCheckin: DEFAULT_REPOSO_CHECKIN,
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

/** Claves de color del tema (excluye tipografía y opciones de layout). */
export type ColorKey =
  | "paper"
  | "paper2"
  | "ink"
  | "inkSoft"
  | "rule"
  | "volt"
  | "voltInk";

export const CAMPOS_COLOR: {
  key: ColorKey;
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

/** Solo las 7 claves de color de un tema. */
export type ColoresTema = Pick<Tema, ColorKey>;

export const TEMA_OBSIDIAN: Tema = {
  paper: "#090d14",
  paper2: "#121722",
  ink: "#f8fafc",
  inkSoft: "#94a3b8",
  rule: "#242e42",
  volt: "#10e7a0",
  voltInk: "#042417",
  fuente: "amigable",
  estiloVisual: "futurista",
  escalaFuente: 1,
  radiosBordes: "normal",
  espaciado: "normal",
  navegacionMovil: "bottom",
  navegacionDesktop: "sidebar",
  densidad: "comfortable",
  reposoCheckin: DEFAULT_REPOSO_CHECKIN,
};

export const TEMA_TITANIUM: Tema = {
  paper: "#f1f5f9",
  paper2: "#ffffff",
  ink: "#0f172a",
  inkSoft: "#475569",
  rule: "#cbd5e1",
  volt: "#047857",
  voltInk: "#ffffff",
  fuente: "amigable",
  estiloVisual: "clasico",
  escalaFuente: 1,
  radiosBordes: "normal",
  espaciado: "normal",
  navegacionMovil: "bottom",
  navegacionDesktop: "sidebar",
  densidad: "comfortable",
  reposoCheckin: DEFAULT_REPOSO_CHECKIN,
};

export const TEMA_CRIMSON: Tema = {
  paper: "#141214",
  paper2: "#1f1b20",
  ink: "#fcf8f6",
  inkSoft: "#a89da3",
  rule: "#383038",
  volt: "#ff4438",
  voltInk: "#1a0402",
  fuente: "condensado",
  estiloVisual: "concreto",
  escalaFuente: 1,
  radiosBordes: "tight",
  espaciado: "compact",
  navegacionMovil: "bottom",
  navegacionDesktop: "sidebar",
  densidad: "compact",
  reposoCheckin: DEFAULT_REPOSO_CHECKIN,
};

export type PresetTema = {
  key: string;
  label: string;
  hint: string;
  colores: ColoresTema;
  temaCompleto?: Tema;
};

/**
 * Paletas prearmadas y validadas (pasan los bloqueos de contraste). Un tap y
 * listo: el dueño no necesita entender de color. Mantienen tipografía y layout.
 */
export const PRESETS_TEMA: PresetTema[] = [
  {
    key: "obsidian",
    label: "Obsidian",
    hint: "Oscuro · Alto Rendimiento",
    colores: {
      paper: TEMA_OBSIDIAN.paper,
      paper2: TEMA_OBSIDIAN.paper2,
      ink: TEMA_OBSIDIAN.ink,
      inkSoft: TEMA_OBSIDIAN.inkSoft,
      rule: TEMA_OBSIDIAN.rule,
      volt: TEMA_OBSIDIAN.volt,
      voltInk: TEMA_OBSIDIAN.voltInk,
    },
    temaCompleto: TEMA_OBSIDIAN,
  },
  {
    key: "titanium",
    label: "Titanium",
    hint: "Claro · Luminoso Deportivo",
    colores: {
      paper: TEMA_TITANIUM.paper,
      paper2: TEMA_TITANIUM.paper2,
      ink: TEMA_TITANIUM.ink,
      inkSoft: TEMA_TITANIUM.inkSoft,
      rule: TEMA_TITANIUM.rule,
      volt: TEMA_TITANIUM.volt,
      voltInk: TEMA_TITANIUM.voltInk,
    },
    temaCompleto: TEMA_TITANIUM,
  },
  {
    key: "crimson",
    label: "Crimson",
    hint: "Brutalismo · Magma y Fuerza",
    colores: {
      paper: TEMA_CRIMSON.paper,
      paper2: TEMA_CRIMSON.paper2,
      ink: TEMA_CRIMSON.ink,
      inkSoft: TEMA_CRIMSON.inkSoft,
      rule: TEMA_CRIMSON.rule,
      volt: TEMA_CRIMSON.volt,
      voltInk: TEMA_CRIMSON.voltInk,
    },
    temaCompleto: TEMA_CRIMSON,
  },
  {
    key: "papel",
    label: "Papel",
    hint: "Claro y cálido",
    colores: {
      paper: "#faf9f6",
      paper2: "#f2efe7",
      ink: "#16181d",
      inkSoft: "#5b5f68",
      rule: "#d8d1bf",
      volt: "#cde94a",
      voltInk: "#1c2205",
    },
  },
  {
    key: "arena",
    label: "Arena",
    hint: "Terracota suave",
    colores: {
      paper: "#fbf7f2",
      paper2: "#f1e8dc",
      ink: "#2a201a",
      inkSoft: "#67564a",
      rule: "#ddcfba",
      volt: "#a94e1e",
      voltInk: "#ffffff",
    },
  },
  {
    key: "oceano",
    label: "Océano",
    hint: "Azul frío",
    colores: {
      paper: "#f3f6fa",
      paper2: "#e4ebf3",
      ink: "#122232",
      inkSoft: "#45596b",
      rule: "#b9c7d6",
      volt: "#1f74d0",
      voltInk: "#ffffff",
    },
  },
  {
    key: "bosque",
    label: "Bosque",
    hint: "Verde natural",
    colores: {
      paper: "#f5f7f2",
      paper2: "#e7ede0",
      ink: "#1a241a",
      inkSoft: "#495741",
      rule: "#c6d1b7",
      volt: "#2f7d4f",
      voltInk: "#ffffff",
    },
  },
  {
    key: "noche",
    label: "Noche",
    hint: "Oscuro",
    colores: {
      paper: "#14161a",
      paper2: "#1e2128",
      ink: "#f3f4f6",
      inkSoft: "#9aa1ad",
      rule: "#3a4048",
      volt: "#cde94a",
      voltInk: "#1c2205",
    },
  },
  {
    key: "carbon",
    label: "Carbón",
    hint: "Oscuro neutro",
    colores: {
      paper: "#181818",
      paper2: "#232323",
      ink: "#ededed",
      inkSoft: "#9c9c9c",
      rule: "#3d3d3d",
      volt: "#ff5c39",
      voltInk: "#1a1a1a",
    },
  },
];

const STACK_SERIF = "Georgia, 'Times New Roman', serif";

/**
 * Metadata de cada estilo visual prearmado. Elegir un estilo en
 * `/panel/ajustes` aplica su paleta base (y su tipografía sugerida, si define
 * una); el dueño puede retocar todo después. Cada estilo además pisa
 * `--font-hero` (números héroe de indicadores) para no romper su identidad.
 *
 * Paletas validadas contra `chequearBloqueos()` y `chequearContraste()`
 * (ver `scripts`/tests de contraste): todas pasan sin excepción manual.
 */
export const ESTILOS_VISUALES: Record<
  EstiloVisual,
  {
    label: string;
    hint: string;
    /** Paleta base que se aplica al elegir el estilo. */
    colores: ColoresTema;
    /** Tipografía sugerida (se aplica al elegir; el dueño puede cambiarla). */
    fuente?: FuenteKey;
    /** Familia para números héroe (`--font-hero`). */
    fontHero: string;
    /** Atributo `data-estilo-visual` => tratamiento ambiental propio en CSS. */
    ambiental: boolean;
  }
> = {
  clasico: {
    label: "Clásico",
    hint: "Limpio, sin efectos",
    fontHero: `var(--font-orbitron), ${STACK}`,
    ambiental: false,
    colores: {
      paper: "#faf9f6",
      paper2: "#f2efe7",
      ink: "#16181d",
      inkSoft: "#5b5f68",
      rule: "#d8d1bf",
      volt: "#cde94a",
      voltInk: "#1c2205",
    },
  },
  futurista: {
    label: "Futurista",
    hint: "Oscuro, grilla y glow ambiental",
    fontHero: `var(--font-orbitron), ${STACK}`,
    ambiental: true,
    colores: {
      paper: "#14161a",
      paper2: "#1e2128",
      ink: "#f3f4f6",
      inkSoft: "#9aa1ad",
      rule: "#3a4048",
      volt: "#cde94a",
      voltInk: "#1c2205",
    },
  },
  estudio: {
    label: "Estudio",
    hint: "Cálido, papel claro, serif editorial",
    fuente: "editorial",
    fontHero: `var(--font-fraunces), ${STACK_SERIF}`,
    ambiental: true,
    colores: {
      paper: "#f6f3ec",
      paper2: "#ede6da",
      ink: "#23201b",
      inkSoft: "#6a6155",
      rule: "#d6cab3",
      volt: "#9c5f36",
      voltInk: "#fdfaf4",
    },
  },
  concreto: {
    label: "Concreto",
    hint: "Industrial, gris oscuro, tipografía condensada",
    fuente: "condensado",
    fontHero: `var(--font-archivo), ${STACK}`,
    ambiental: true,
    colores: {
      paper: "#17181a",
      paper2: "#212327",
      ink: "#eef0f2",
      inkSoft: "#9aa0a8",
      rule: "#3a3d42",
      volt: "#ff5c39",
      voltInk: "#1a1a1a",
    },
  },
  cancha: {
    label: "Cancha",
    hint: "Enérgico, acento vivo, acentos diagonales",
    fuente: "contemporaneo",
    fontHero: `var(--font-sora), ${STACK}`,
    ambiental: true,
    colores: {
      paper: "#f2f5f7",
      paper2: "#e3e9ee",
      ink: "#122031",
      inkSoft: "#47586b",
      rule: "#bcccd9",
      volt: "#1466d6",
      voltInk: "#ffffff",
    },
  },
};

export const ESTILOS_VISUALES_KEYS = Object.keys(
  ESTILOS_VISUALES,
) as EstiloVisual[];

/** Paleta base por estilo (compat: derivado de `ESTILOS_VISUALES`). */
export const COLORES_POR_ESTILO = Object.fromEntries(
  ESTILOS_VISUALES_KEYS.map((k) => [k, ESTILOS_VISUALES[k].colores]),
) as Record<EstiloVisual, ColoresTema>;

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

  const estiloVisual = ESTILOS_VISUALES_KEYS.includes(
    t.estiloVisual as EstiloVisual,
  )
    ? (t.estiloVisual as EstiloVisual)
    : DEFAULT_TEMA.estiloVisual;

  // Parsear campos UI con defaults
  const escalaFuente = typeof t.escalaFuente === "number" && [0.875, 1, 1.125, 1.25].includes(t.escalaFuente)
    ? t.escalaFuente
    : DEFAULT_TEMA.escalaFuente;
  
  const radiosBordes = ["tight", "normal", "soft"].includes(t.radiosBordes as string)
    ? (t.radiosBordes as Tema["radiosBordes"])
    : DEFAULT_TEMA.radiosBordes;
  
  const espaciado = ["compact", "normal", "spacious"].includes(t.espaciado as string)
    ? (t.espaciado as Tema["espaciado"])
    : DEFAULT_TEMA.espaciado;
  
  const navegacionMovil = ["bottom", "sidebar", "top"].includes(t.navegacionMovil as string)
    ? (t.navegacionMovil as Tema["navegacionMovil"])
    : DEFAULT_TEMA.navegacionMovil;
  
  const navegacionDesktop = ["sidebar", "top"].includes(t.navegacionDesktop as string)
    ? (t.navegacionDesktop as Tema["navegacionDesktop"])
    : DEFAULT_TEMA.navegacionDesktop;
  
  const densidad = ["compact", "comfortable", "spacious"].includes(t.densidad as string)
    ? (t.densidad as Tema["densidad"])
    : DEFAULT_TEMA.densidad;

  const rc = (t.reposoCheckin ?? {}) as Record<string, unknown>;
  const reposoCheckin: ReposoCheckin = {
    activo:
      typeof rc.activo === "boolean" ? rc.activo : DEFAULT_REPOSO_CHECKIN.activo,
    segundos:
      typeof rc.segundos === "number" && rc.segundos >= 15 && rc.segundos <= 600
        ? Math.round(rc.segundos)
        : DEFAULT_REPOSO_CHECKIN.segundos,
    mensaje:
      typeof rc.mensaje === "string" && rc.mensaje.trim()
        ? rc.mensaje.trim().slice(0, 60)
        : DEFAULT_REPOSO_CHECKIN.mensaje,
    mostrarReloj:
      typeof rc.mostrarReloj === "boolean"
        ? rc.mostrarReloj
        : DEFAULT_REPOSO_CHECKIN.mostrarReloj,
    mostrarLogo:
      typeof rc.mostrarLogo === "boolean"
        ? rc.mostrarLogo
        : DEFAULT_REPOSO_CHECKIN.mostrarLogo,
    intensidad: ["sutil", "normal", "estatico"].includes(rc.intensidad as string)
      ? (rc.intensidad as ReposoIntensidad)
      : DEFAULT_REPOSO_CHECKIN.intensidad,
  };

  return {
    paper: hex(t.paper, DEFAULT_TEMA.paper),
    paper2: hex(t.paper2, DEFAULT_TEMA.paper2),
    ink: hex(t.ink, DEFAULT_TEMA.ink),
    inkSoft: hex(t.inkSoft, DEFAULT_TEMA.inkSoft),
    rule: hex(t.rule, DEFAULT_TEMA.rule),
    volt: hex(t.volt, DEFAULT_TEMA.volt),
    voltInk: hex(t.voltInk, DEFAULT_TEMA.voltInk),
    fuente,
    estiloVisual,
    escalaFuente,
    radiosBordes,
    espaciado,
    navegacionMovil,
    navegacionDesktop,
    densidad,
    reposoCheckin,
  };
}

/* ============================================================
   Capa ambiental (Opción A del análisis). Tokens DERIVADOS que todo tema
   garantiza, tenga o no `estiloVisual`. Se consumen sólo vía var(--…) desde
   globals.css / pantallas; nunca se recalculan por pantalla.
   Ver REGLAS_UI_EMIL.md §17 + §20 (checklist).
   ============================================================ */

export type MotionNivel = "full" | "reduced" | "still";

/**
 * Nivel de motion que PIDE el tema. El navegador sólo puede bajarlo más
 * (prefers-reduced-motion, gestionado en CSS). `clasico` conserva la capa
 * universal (textura sutil + elevación + entradas) pero sin loops ambientales.
 */
export function resolverMotion(t: Tema): MotionNivel {
  if (t.estiloVisual === "clasico") return "reduced";
  return "full";
}

/** Polaridad del tema según la luminancia del fondo. Decide superficies,
 *  sombras y scrim en `globals.css` (`[data-theme-polarity="dark"]`). */
export function polaridadTema(t: Tema): "light" | "dark" {
  const rgb = hexToRgb(t.paper) ?? [255, 255, 255];
  return luminanciaRelativa(...rgb) > 0.4 ? "light" : "dark";
}

/** Umbral de contraste mínimo de los colores semánticos contra el fondo.
 *  4.0: no toca casi nada en temas claros, sube el rojo/ámbar/verde fijo en
 *  temas oscuros (donde hoy quedan ilegibles). */
const UMBRAL_SEMANTICO = 4.0;
const SEMANTICOS_BASE = {
  danger: "#c1362f",
  warn: "#b9791a",
  ok: "#2f7d4f",
} as const;

function forzarContraste(color: string, fondo: string): string {
  return ratio(color, fondo) < UMBRAL_SEMANTICO
    ? sugerirAjuste(fondo, color, UMBRAL_SEMANTICO)
    : color;
}

/**
 * Tokens ambientales derivados. Sólo lo que CSS `color-mix()` NO puede hacer
 * solo: decidir polaridad, re-derivar semánticos con piso de contraste, y
 * elegir el color del glow (acento sólo si "emite luz" sobre el fondo).
 * El resto (`--paper-3`, `--scrim`, escalera de acento, sombras, *-weak/-strong`)
 * se deriva con `color-mix()` en `globals.css`.
 */
export function derivarAmbiente(t: Tema): Record<string, string> {
  const pol = polaridadTema(t);
  const motion = resolverMotion(t);

  const danger = forzarContraste(SEMANTICOS_BASE.danger, t.paper);
  const warn = forzarContraste(SEMANTICOS_BASE.warn, t.paper);
  const ok = forzarContraste(SEMANTICOS_BASE.ok, t.paper);

  // Glow: el acento sólo lee como "luz emitida" si es más claro que el fondo
  // o el tema es oscuro. Si no, un halo de --ink hace de elevación (nunca un
  // amarillo/verde apagado invisible sobre papel claro).
  const voltRgb = hexToRgb(t.volt) ?? [0, 0, 0];
  const inkRgb = hexToRgb(t.ink) ?? [0, 0, 0];
  const paperRgb = hexToRgb(t.paper) ?? [255, 255, 255];
  const [gr, gg, gb] =
    pol === "dark" ||
    luminanciaRelativa(...voltRgb) > luminanciaRelativa(...paperRgb)
      ? voltRgb
      : inkRgb;

  const aStrong = motion === "still" ? 0 : motion === "reduced" ? 0.26 : 0.5;
  const aSoft = motion === "still" ? 0 : motion === "reduced" ? 0.1 : 0.2;
  const strength = motion === "still" ? "0" : motion === "reduced" ? "0.55" : "1";

  return {
    "--accent": t.volt,
    "--accent-contrast": t.voltInk,

    "--danger": danger,
    "--warn": warn,
    "--ok": ok,

    "--glow-strong": `rgba(${gr}, ${gg}, ${gb}, ${aStrong})`,
    "--glow-soft": `rgba(${gr}, ${gg}, ${gb}, ${aSoft})`,
    "--glow-strength": strength,
    "--texture-alpha": motion === "still" ? "0" : "1",
  };
}

/** CSS custom properties para inyectar en el `style` de un contenedor. */
export function temaToVars(t: Tema): React.CSSProperties {
  const f = FUENTES[t.fuente];
  
  // Mapeo de radios según preset
  const radios = {
    tight: { sm: "3px", md: "4px", lg: "6px" },
    normal: { sm: "5px", md: "6px", lg: "8px" },
    soft: { sm: "6px", md: "8px", lg: "10px" },
  }[t.radiosBordes];
  
  // Multiplicador de espaciado
  const espaciadoMult = {
    compact: 0.875,
    normal: 1,
    spacious: 1.25,
  }[t.espaciado];
  
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
    "--font-hero": ESTILOS_VISUALES[t.estiloVisual].fontHero,
    
    // Variables UI personalizadas
    "--font-scale": t.escalaFuente.toString(),
    "--radius-sm": radios.sm,
    "--radius-md": radios.md,
    "--radius-lg": radios.lg,
    "--spacing-scale": espaciadoMult.toString(),
    "--nav-mobile": t.navegacionMovil,
    "--nav-desktop": t.navegacionDesktop,
    "--density": t.densidad,

    // Capa ambiental derivada (ver derivarAmbiente / REGLAS_UI_EMIL.md §17).
    ...derivarAmbiente(t),
  } as React.CSSProperties;
}
