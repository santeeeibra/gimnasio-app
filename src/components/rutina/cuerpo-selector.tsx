"use client";

// Modelo de cuerpo tocable (frente + espalda). Estilo "placas" geométricas
// acorde a la identidad Futurista. Cada PorcionId de clasificacion-muscular.ts
// tiene su propia placa (cabezas del bíceps, del tríceps, deltoides, etc.).
// Solo se anima opacity (compositor-only).
//
// - modo "explorar": en el cuerpo entero se toca un GRUPO; <DetalleGrupo>
//   muestra ese grupo ampliado con cada porción/cabeza tocable por separado.
// - modo "dolor": los músculos quedan neutros y se tocan las articulaciones
//   (Molestia de tipos.ts). Selección múltiple, en rojo.

import {
  METADATOS_PORCIONES,
  type PorcionId,
} from "@/lib/rutina/clasificacion-muscular";
import { MOLESTIA_LABEL, type Molestia } from "@/lib/rutina/tipos";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

type Vista = "frente" | "espalda";

type Placa = {
  porcion: PorcionId;
  vista: Vista;
  /** Lado izquierdo del dibujo; se espeja sobre x=100. */
  d: string;
};

// Coordenadas en un lienzo de 200 × 400 con el eje del cuerpo en x=100.
const PLACAS: Placa[] = [
  // ── Frente ──
  { porcion: "deltoides_lateral", vista: "frente", d: "M61 67 C53 69 48 76 47 86 C46 94 49 100 53 102 C55 90 57 78 61 67 Z" },
  { porcion: "deltoides_anterior", vista: "frente", d: "M74 70 L63 67 C60 77 58 88 56 99 C62 91 67 86 75 82 Z" },
  { porcion: "pecho_superior", vista: "frente", d: "M98 72 L77 75 C74 79 73 84 75 89 L98 89 Z" },
  { porcion: "pecho_medio", vista: "frente", d: "M98 91 L75 91 C74 99 76 105 81 109 L98 109 Z" },
  { porcion: "pecho_inferior", vista: "frente", d: "M98 111 L83 111 C87 117 93 120 98 120 Z" },
  { porcion: "biceps_cabeza_larga", vista: "frente", d: "M52 107 C48 117 46 129 48 140 L53 140 C53 128 54 117 55 105 Z" },
  { porcion: "biceps_cabeza_corta", vista: "frente", d: "M56.5 104 C56 116 55 128 54.5 140 L60 140 C62 128 62 116 60 104 Z" },
  { porcion: "biceps_braquial", vista: "frente", d: "M48 144 L60 144 C60 160 59 174 57 186 L50 186 C48 172 47 158 48 144 Z" },
  { porcion: "core_recto_superior", vista: "frente", d: "M98 124 L86 124 L86 151 L98 151 Z" },
  { porcion: "core_recto_inferior", vista: "frente", d: "M98 154 L86 154 L86 174 L98 174 Z" },
  { porcion: "core_transverso", vista: "frente", d: "M98 177 L86 177 L87 186 C91 190 95 192 98 192 Z" },
  { porcion: "core_oblicuos", vista: "frente", d: "M83 122 L77 118 C73 140 73 164 79 186 L84 186 Z" },
  { porcion: "piernas_cuadriceps", vista: "frente", d: "M90 212 L78 205 C72 230 72 262 78 290 L94 290 C96 270 95 244 90 212 Z" },
  { porcion: "piernas_aductores", vista: "frente", d: "M98 214 L93 214 C97 236 98 252 97 262 C98 250 99 232 98 214 Z" },
  // ── Espalda ──
  { porcion: "deltoides_posterior", vista: "espalda", d: "M73 70 C60 65 49 72 47 86 C46 94 49 100 53 103 C58 94 64 86 75 82 Z" },
  { porcion: "espalda_media_alta", vista: "espalda", d: "M98 62 L78 72 L82 98 L98 110 Z" },
  { porcion: "espalda_dorsal", vista: "espalda", d: "M79 101 C72 122 77 146 93 164 L98 160 L98 113 L83 101 Z" },
  { porcion: "espalda_lumbar", vista: "espalda", d: "M98 166 L91 168 L89 193 L98 195 Z" },
  { porcion: "triceps_cabeza_lateral", vista: "espalda", d: "M52 107 C48 116 46.5 124 47.5 130 L53 130 C53 122 54 114 55 105 Z" },
  { porcion: "triceps_cabeza_larga", vista: "espalda", d: "M56.5 104 C56 112 55.5 121 55 130 L61.5 130 C62 122 62 113 60 104 Z" },
  { porcion: "triceps_cabeza_medial", vista: "espalda", d: "M47.8 132.5 L61.3 132.5 C61 135.5 60.5 138.5 60 141 L48.2 141 C47.7 138 47.6 135 47.8 132.5 Z" },
  { porcion: "piernas_gluteos", vista: "espalda", d: "M98 198 L81 196 C73 206 73 226 80 236 C88 241 95 239 98 234 Z" },
  { porcion: "piernas_isquiotibiales", vista: "espalda", d: "M98 240 L79 240 C75 260 76 280 80 292 L94 292 C98 274 99 256 98 240 Z" },
  { porcion: "piernas_gemelos", vista: "espalda", d: "M80 308 C74 324 76 344 84 355 L94 355 C98 340 97 320 94 308 Z" },
  { porcion: "piernas_soleo", vista: "espalda", d: "M85 358 L94 358 L92 380 L87 380 Z" },
];

export type GrupoCuerpo = {
  id: string;
  label: string;
  vista: Vista;
  porciones: PorcionId[];
  /** Recorte del lienzo para la vista ampliada (x y ancho alto). */
  zoom: string;
};

export const GRUPOS_CUERPO: GrupoCuerpo[] = [
  { id: "hombros", label: "Hombros", vista: "frente", porciones: ["deltoides_anterior", "deltoides_lateral"], zoom: "42 60 40 48" },
  { id: "pecho", label: "Pecho", vista: "frente", porciones: ["pecho_superior", "pecho_medio", "pecho_inferior"], zoom: "70 66 60 58" },
  { id: "biceps", label: "Bíceps y braquial", vista: "frente", porciones: ["biceps_cabeza_larga", "biceps_cabeza_corta", "biceps_braquial"], zoom: "30 100 48 90" },
  { id: "core", label: "Abdomen", vista: "frente", porciones: ["core_recto_superior", "core_recto_inferior", "core_oblicuos", "core_transverso"], zoom: "70 116 60 80" },
  { id: "muslo_frontal", label: "Muslo frontal", vista: "frente", porciones: ["piernas_cuadriceps", "piernas_aductores"], zoom: "62 200 46 96" },
  { id: "hombro_posterior", label: "Hombro posterior", vista: "espalda", porciones: ["deltoides_posterior"], zoom: "42 60 40 48" },
  { id: "espalda", label: "Espalda", vista: "espalda", porciones: ["espalda_media_alta", "espalda_dorsal", "espalda_lumbar"], zoom: "66 58 68 140" },
  { id: "triceps", label: "Tríceps", vista: "espalda", porciones: ["triceps_cabeza_larga", "triceps_cabeza_lateral", "triceps_cabeza_medial"], zoom: "36 100 36 45" },
  { id: "gluteos", label: "Glúteos", vista: "espalda", porciones: ["piernas_gluteos"], zoom: "68 190 64 52" },
  { id: "isquios", label: "Isquiotibiales", vista: "espalda", porciones: ["piernas_isquiotibiales"], zoom: "68 236 40 60" },
  { id: "pantorrilla", label: "Pantorrilla", vista: "espalda", porciones: ["piernas_gemelos", "piernas_soleo"], zoom: "66 302 40 82" },
];

const GRUPO_DE: Record<PorcionId, GrupoCuerpo> = Object.fromEntries(
  GRUPOS_CUERPO.flatMap((g) => g.porciones.map((p) => [p, g])),
) as Record<PorcionId, GrupoCuerpo>;

// Piezas no tocables que completan la silueta.
const NEUTRAS: Record<Vista, string[]> = {
  frente: [
    "M48 188 L58 188 L57 204 L49 204 Z", // mano
    "M98 194 L84 188 L80 204 L98 212 Z", // pelvis
    "M79 293 L94 293 L93 306 L80 306 Z", // rodilla
    "M80 308 L94 308 L92 380 L85 380 Z", // tibia
    "M84 382 L93 382 L94 392 L78 392 Z", // pie
  ],
  espalda: [
    "M48 144 L60 144 C60 160 59 174 57 186 L50 186 C48 172 47 158 48 144 Z", // antebrazo
    "M48 188 L58 188 L57 204 L49 204 Z",
    "M79 293 L94 293 L93 306 L80 306 Z",
    "M84 382 L93 382 L94 392 L78 392 Z",
  ],
};

// Articulaciones para el modo dolor (se espejan salvo lumbar).
const ARTICULACIONES: {
  id: Molestia;
  vista: Vista;
  cx: number;
  cy: number;
  espejo: boolean;
}[] = [
  { id: "hombro", vista: "frente", cx: 62, cy: 80, espejo: true },
  { id: "codo", vista: "frente", cx: 54, cy: 142, espejo: true },
  { id: "muñeca", vista: "frente", cx: 53, cy: 187, espejo: true },
  { id: "rodilla", vista: "frente", cx: 87, cy: 299, espejo: true },
  { id: "hombro", vista: "espalda", cx: 62, cy: 80, espejo: true },
  { id: "codo", vista: "espalda", cx: 54, cy: 142, espejo: true },
  { id: "lumbar", vista: "espalda", cx: 100, cy: 180, espejo: false },
  { id: "rodilla", vista: "espalda", cx: 87, cy: 299, espejo: true },
];

const ESPEJO = "translate(200 0) scale(-1 1)";
// Silueta neutra (cabeza, manos, articulaciones) vs. placas musculares, que
// llevan más tinta para que se lea qué es tocable.
const BASE = { fill: "var(--paper-3)", stroke: "var(--rule)", strokeWidth: 0.8 };
const MUSCULO = {
  fill: "color-mix(in srgb, var(--ink) 13%, var(--paper-2))",
  stroke: "color-mix(in srgb, var(--ink) 30%, transparent)",
  strokeWidth: 0.7,
};

function activarConTeclado(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

/** Silueta (cabeza, tronco y piezas neutras) de una vista. */
function Silueta({ vista }: { vista: Vista }) {
  return (
    <>
      <circle cx="100" cy="34" r="18" {...BASE} />
      <path d="M92 52 L108 52 L110 64 L90 64 Z" fill="var(--paper-3)" />
      <path d="M76 68 L124 68 L128 110 L122 190 L78 190 L72 110 Z" fill="var(--paper-2)" />
      {NEUTRAS[vista].map((d, i) => (
        <g key={i} {...BASE}>
          <path d={d} />
          <path d={d} transform={ESPEJO} />
        </g>
      ))}
    </>
  );
}

/** Placa con su copia espejada y capa de acento animada por opacity. */
function PlacaSvg({
  d,
  acento,
  color = "var(--accent)",
  borde = false,
}: {
  d: string;
  acento: number;
  color?: string;
  borde?: boolean;
}) {
  return (
    <>
      <g {...MUSCULO} stroke={borde ? color : MUSCULO.stroke}>
        <path d={d} />
        <path d={d} transform={ESPEJO} />
      </g>
      <g
        fill={color}
        className="transition-opacity duration-200 [transition-timing-function:var(--ease-out)]"
        style={{ opacity: acento }}
      >
        <path d={d} />
        <path d={d} transform={ESPEJO} />
      </g>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuerpo entero
// ─────────────────────────────────────────────────────────────────────────────

type PropsExplorar = {
  modo: "explorar";
  grupo: string | null;
  onGrupo: (g: GrupoCuerpo) => void;
};

type PropsDolor = {
  modo: "dolor";
  seleccion: Molestia[];
  onToggle: (m: Molestia) => void;
};

export function CuerpoSelector(props: PropsExplorar | PropsDolor) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["frente", "espalda"] as const).map((vista) => (
        <figure key={vista} className="flex flex-col items-center">
          <FiguraCuerpo vista={vista} {...props} />
          <figcaption className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            {vista === "frente" ? "Frente" : "Espalda"}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function FiguraCuerpo(props: (PropsExplorar | PropsDolor) & { vista: Vista }) {
  const { vista } = props;
  const explorar = props.modo === "explorar";
  const grupos = GRUPOS_CUERPO.filter((g) => g.vista === vista);

  return (
    <svg
      viewBox="30 4 140 394"
      className="h-auto w-full max-w-[180px] select-none touch-manipulation"
      role="group"
      aria-label={vista === "frente" ? "Cuerpo de frente" : "Cuerpo de espalda"}
    >
      <Silueta vista={vista} />

      {grupos.map((g) => {
        const on = explorar && props.grupo === g.id;
        const elegir = () => {
          if (!explorar) return;
          hapticoSeleccion();
          props.onGrupo(g);
        };
        return (
          <g
            key={g.id}
            role={explorar ? "button" : undefined}
            tabIndex={explorar ? 0 : -1}
            aria-label={explorar ? g.label : undefined}
            aria-pressed={explorar ? on : undefined}
            onClick={explorar ? elegir : undefined}
            onKeyDown={explorar ? activarConTeclado(elegir) : undefined}
            className={explorar ? "cursor-pointer outline-none" : "pointer-events-none"}
          >
            {PLACAS.filter((p) => GRUPO_DE[p.porcion]?.id === g.id).map((p) => (
              <PlacaSvg key={p.porcion} d={p.d} acento={on ? 1 : 0} />
            ))}
          </g>
        );
      })}

      {!explorar &&
        ARTICULACIONES.filter((a) => a.vista === vista).map((a) => {
          const on = props.seleccion.includes(a.id);
          const puntos = a.espejo ? [a.cx, 200 - a.cx] : [a.cx];
          const toggle = () => {
            hapticoSeleccion();
            props.onToggle(a.id);
          };
          return (
            <g
              key={`${a.id}-${a.cx}`}
              role="button"
              tabIndex={0}
              aria-label={`Dolor en ${MOLESTIA_LABEL[a.id].toLowerCase()}`}
              aria-pressed={on}
              onClick={toggle}
              onKeyDown={activarConTeclado(toggle)}
              className="cursor-pointer outline-none"
            >
              {puntos.map((cx) => (
                <g key={cx}>
                  {/* Área de toque generosa (invisible) */}
                  <circle cx={cx} cy={a.cy} r="13" fill="transparent" />
                  {/* Halo de seleccionado: solo opacity */}
                  <circle
                    cx={cx}
                    cy={a.cy}
                    r="10"
                    fill="var(--warn)"
                    className="transition-opacity duration-200 [transition-timing-function:var(--ease-out)]"
                    style={{ opacity: on ? 0.28 : 0 }}
                  />
                  <circle
                    cx={cx}
                    cy={a.cy}
                    r="5.5"
                    strokeWidth={on ? 1.8 : 1.4}
                    stroke={on ? "var(--warn)" : "var(--ink-soft)"}
                    fill={on ? "var(--warn)" : "var(--paper)"}
                    strokeDasharray={on ? undefined : "2 1.4"}
                  />
                  {on ? (
                    <path
                      d={`M${cx - 2.4} ${a.cy} l1.7 1.8 l3.2 -3.6`}
                      fill="none"
                      stroke="var(--paper)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </g>
              ))}
              {/* Etiqueta con el nombre de la zona activa (una por vista) */}
              {on ? (
                <text
                  x={a.cx}
                  y={a.cy - 11}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="700"
                  fill="var(--ink)"
                  stroke="var(--paper)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  className="pointer-events-none"
                >
                  {MOLESTIA_LABEL[a.id]}
                </text>
              ) : null}
            </g>
          );
        })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista ampliada de un grupo: cada cabeza / porción tocable por separado
// ─────────────────────────────────────────────────────────────────────────────

export function DetalleGrupo({
  grupo,
  porcion,
  onPorcion,
}: {
  grupo: GrupoCuerpo;
  /** null = todo el grupo. */
  porcion: PorcionId | null;
  onPorcion: (p: PorcionId | null) => void;
}) {
  const placas = PLACAS.filter((p) => p.vista === grupo.vista);
  const elegir = (p: PorcionId | null) => {
    hapticoSeleccion();
    onPorcion(p);
  };

  return (
    <div className="animate-scale-in">
      <svg
        viewBox={grupo.zoom}
        className="mx-auto block h-44 w-full select-none touch-manipulation"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={`${grupo.label} ampliado`}
      >
        <Silueta vista={grupo.vista} />
        {placas.map((p) => {
          const delGrupo = grupo.porciones.includes(p.porcion);
          if (!delGrupo) {
            return (
              <g key={p.porcion} opacity={0.45} className="pointer-events-none">
                <PlacaSvg d={p.d} acento={0} />
              </g>
            );
          }
          const on = porcion === null || porcion === p.porcion;
          return (
            <g
              key={p.porcion}
              role="button"
              tabIndex={0}
              aria-label={METADATOS_PORCIONES[p.porcion].label}
              aria-pressed={porcion === p.porcion}
              onClick={() => elegir(porcion === p.porcion ? null : p.porcion)}
              onKeyDown={activarConTeclado(() =>
                elegir(porcion === p.porcion ? null : p.porcion),
              )}
              className="cursor-pointer outline-none"
            >
              <PlacaSvg d={p.d} acento={on ? (porcion ? 1 : 0.45) : 0} borde />
            </g>
          );
        })}
      </svg>

      {grupo.porciones.length > 1 ? (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <ChipPorcion activo={porcion === null} onClick={() => elegir(null)}>
            Todo
          </ChipPorcion>
          {grupo.porciones.map((p) => (
            <ChipPorcion
              key={p}
              activo={porcion === p}
              onClick={() => elegir(porcion === p ? null : p)}
            >
              {METADATOS_PORCIONES[p].label}
            </ChipPorcion>
          ))}
        </div>
      ) : null}

      <p className="mt-2 min-h-[2.5em] text-center text-xs leading-snug text-ink-soft">
        {porcion
          ? METADATOS_PORCIONES[porcion].detalle
          : "Tocá una cabeza o porción para ver solo sus ejercicios."}
      </p>
    </div>
  );
}

function ChipPorcion({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold transition-[transform,background-color,border-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.96] ${
        activo
          ? "border-accent bg-accent text-accent-contrast"
          : "border-rule bg-paper text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
