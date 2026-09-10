"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Dumbbell,
  HelpCircle,
  IdCard,
  Inbox,
  MessageSquare,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  TrendingDown,
  User,
  X,
} from "lucide-react";
import catalogoEjerciciosJson from "@/data/ejercicios.json";
import { DialVerticalProgreso } from "@/components/progreso/dial-vertical-progreso";
import { RulerWeightPicker } from "@/components/peso/card-peso";
import { StickyProgresoDia } from "@/components/rutinas/sticky-progreso-dia";
import { LogroDiaCompletado } from "@/components/rutinas/logro-dia-completado";
import { TimerDescanso } from "@/components/rutinas/timer-descanso";
import { AnilloProgreso } from "@/components/anillo-progreso";
import { RachaConstancia } from "@/components/mi/racha-constancia";
import { BannerMotivacional } from "@/components/rutinas/banner-motivacional";
import { ejerciciosSimilares, generarPlan } from "@/lib/rutina/motor";
import { CATALOGO_UNIVERSAL_EMERGENCIA } from "@/lib/rutina/fallbacks";
import {
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_LABEL,
  REPS_OPCIONES,
  SERIES_OPCIONES,
  type Nivel,
  type Objetivo,
  type PlanGenerado,
} from "@/lib/rutina/tipos";
import {
  hapticoExito,
  hapticoImpactoMedio,
  hapticoSeleccion,
} from "@/lib/ui/hapticos";
import { useDemoVista } from "./demo-shell";
import { LoginWall } from "./login-wall";

// Fusionar catálogo universal con los ejercicios del JSON para tener nombres, imágenes (GIFs) e info completa
const CATALOGO_MAP = new Map<string, any>();
for (const ej of CATALOGO_UNIVERSAL_EMERGENCIA) {
  CATALOGO_MAP.set(ej.slug, ej);
}
for (const ej of catalogoEjerciciosJson as any[]) {
  const existente = CATALOGO_MAP.get(ej.slug);
  CATALOGO_MAP.set(ej.slug, { ...existente, ...ej });
}
const CATALOGO = Array.from(CATALOGO_MAP.values());
const LIMITE_GENERACIONES = 3;

// Mock de constancia para simular el mini-calendario de visitas reales de /mi
const MOCK_RACHA_DIAS = [
  false, false, true, false, true, false, false, true, true, false, true, false, true, true, false,
];

type ItemEditable = {
  key: string;
  slug: string;
  series: number;
  repeticiones: string;
  nota: string;
};
type DiaEditable = { titulo: string; items: ItemEditable[] };

function ejPorSlug(slug: string) {
  return CATALOGO_MAP.get(slug) ?? CATALOGO.find((e) => e.slug === slug) ?? null;
}

function nombreDe(slug: string) {
  return ejPorSlug(slug)?.nombre ?? slug.replace(/-/g, " ");
}

/** Alterna entre 0.jpg y 1.jpg de free-exercise-db para lograr animación tipo GIF. */
function frameAlterno(url: string): string | null {
  if (/\/0\.jpg$/i.test(url)) return url.replace(/\/0\.jpg$/i, "/1.jpg");
  return null;
}

function ImagenAnimada({
  url,
  activo,
  className,
  onError,
  alt: altText = "",
}: {
  url: string;
  activo: boolean;
  className: string;
  onError?: () => void;
  alt?: string;
}) {
  const alt = frameAlterno(url);
  const [mostrarAlt, setMostrarAlt] = useState(false);

  useEffect(() => {
    if (!activo || !alt) return;
    const id = setInterval(() => setMostrarAlt((v) => !v), 850);
    return () => clearInterval(id);
  }, [activo, alt]);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={altText}
        loading="lazy"
        decoding="async"
        onError={onError}
        className={`${className} absolute inset-0 m-auto max-h-full max-w-full object-contain object-center transition-opacity duration-200 [transition-timing-function:var(--ease-out)] ${mostrarAlt ? "opacity-0" : "opacity-100"}`}
      />
      {alt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${className} absolute inset-0 m-auto max-h-full max-w-full object-contain object-center transition-opacity duration-200 [transition-timing-function:var(--ease-out)] ${mostrarAlt ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

function ExThumb({
  ej,
  onOpen,
}: {
  ej: any;
  onOpen: () => void;
}) {
  const [err, setErr] = useState(false);
  const url = ej?.imagen_url ?? null;

  if (!url || err) {
    return (
      <div
        className="grid size-[68px] shrink-0 place-items-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft shadow-xs"
        aria-hidden
      >
        <Dumbbell className="size-6 text-ink-soft/40" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver ${ej?.nombre ?? "ejercicio"} animado`}
      className="group relative size-[68px] shrink-0 overflow-hidden rounded-[10px] border border-rule bg-white shadow-xs transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ImagenAnimada
        url={url}
        activo={!err}
        onError={() => setErr(true)}
        className="h-full w-full object-contain object-center p-1"
      />
    </button>
  );
}

function VisorEjercicio({
  ej,
  onClose,
}: {
  ej: any;
  onClose: () => void;
}) {
  const [err, setErr] = useState(false);
  const url = ej?.imagen_url ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!ej) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ej.nombre}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[20px] border border-rule bg-paper p-5 shadow-2xl animate-scale-in"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-tight text-ink">{ej.nombre}</h3>
            {ej.grupo_muscular ? (
              <span className="mt-0.5 inline-block text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
                {String(ej.grupo_muscular).replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 active:scale-90 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative mt-4 grid aspect-square w-full place-items-center overflow-hidden rounded-[14px] border border-rule bg-white shadow-xs">
          {url && !err ? (
            <ImagenAnimada
              url={url}
              activo={!err}
              onError={() => setErr(true)}
              alt={ej.nombre}
              className="h-full w-full object-contain object-center p-3"
            />
          ) : (
            <Dumbbell className="size-12 text-ink-soft/40" />
          )}
        </div>

        {ej.descripcion ? (
          <p className="mt-4 text-[13px] leading-snug text-ink-soft">
            {ej.descripcion}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            hapticoSeleccion();
            onClose();
          }}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-[12px] bg-paper-2 border border-rule px-4 text-xs font-semibold text-ink shadow-xs active:scale-95 transition-transform"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function deducirTipoEquipo(base: any): "corporal" | "barra" | "mancuerna" | "polea" | "maquina" | "otro" {
  const eq = (base?.equipo || "").toLowerCase();
  const nom = (base?.nombre || "").toLowerCase();
  if (
    eq === "peso_corporal" ||
    eq === "corporal" ||
    nom.includes("corporal") ||
    nom.includes("fondos") ||
    nom.includes("flexiones") ||
    nom.includes("dominadas") ||
    nom.includes("plancha")
  ) {
    return "corporal";
  } else if (eq === "barra" || nom.includes("barra")) {
    return "barra";
  } else if (eq === "mancuerna" || eq === "mancuernas" || nom.includes("mancuerna")) {
    return "mancuerna";
  } else if (eq === "polea" || nom.includes("polea")) {
    return "polea";
  } else if (
    eq === "maquina" ||
    nom.includes("maquina") ||
    nom.includes("máquina") ||
    nom.includes("prensa")
  ) {
    return "maquina";
  }
  return "otro";
}

function extraerSegundosDescanso(nota?: string): number {
  if (!nota) return 60;
  if (nota.includes("35s")) return 35;
  if (nota.includes("45-60") || nota.includes("45–60")) return 60;
  if (nota.includes("60-90") || nota.includes("60–90")) return 60;
  if (nota.includes("90-120") || nota.includes("90–120")) return 90;
  if (nota.includes("2-3 min") || nota.includes("2–3 min")) return 120;
  return 60;
}

function BadgeEquipo({
  equipo,
  nombre,
}: {
  equipo?: string | null;
  nombre?: string;
}) {
  const eq = (equipo || "").toLowerCase();
  const nom = (nombre || "").toLowerCase();

  const esBarra = eq === "barra" || nom.includes("barra");
  const esMancuerna =
    eq === "mancuerna" || eq === "mancuernas" || nom.includes("mancuerna");
  const esMaquina =
    eq === "maquina" ||
    nom.includes("maquina") ||
    nom.includes("máquina") ||
    nom.includes("prensa");
  const esPolea = eq === "polea" || nom.includes("polea");
  const esCorporal =
    eq === "peso_corporal" ||
    eq === "corporal" ||
    nom.includes("corporal") ||
    nom.includes("flexiones") ||
    nom.includes("dominadas") ||
    nom.includes("plancha");

  if (esBarra) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent tracking-normal">
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M2 12h20M6 7v10M18 7v10M4 9v6M20 9v6" />
        </svg>
        Con barra
      </span>
    );
  }

  if (esMancuerna) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft tracking-normal">
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 8v8M18 8v8M4 10v4M20 10v4M6 12h12" />
        </svg>
        Mancuernas
      </span>
    );
  }

  if (esMaquina) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft tracking-normal">
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
        Máquina
      </span>
    );
  }

  if (esPolea) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft tracking-normal">
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11v10M8 21h8" />
        </svg>
        Polea
      </span>
    );
  }

  if (esCorporal) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft tracking-normal">
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="7" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
        Corporal
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft capitalize tracking-normal">
      {equipo ? equipo.replace(/_/g, " ") : "Libre"}
    </span>
  );
}

function aEditable(plan: PlanGenerado): DiaEditable[] {
  return plan.dias.map((dia, di) => ({
    titulo: dia.titulo || `Día ${di + 1}`,
    items: dia.items.map((it, ii) => ({
      key: `${di}-${ii}-${it.ejercicio_slug}`,
      slug: it.ejercicio_slug,
      series: it.series,
      repeticiones: it.repeticiones,
      nota: it.nota,
    })),
  }));
}

export default function DemoPage() {
  const { vista } = useDemoVista();
  return (
    <main className="w-full px-5 pt-6 pb-4 md:pt-8">
      {vista === "inicio" && <DemoInicio />}
      {vista === "rutina" && <DemoRutina />}
      {vista === "peso" && <DemoPeso />}
    </main>
  );
}

/* ───────────────────────── Inicio (home del alumno, mock) ───────────────── */

function DemoInicio() {
  const { ir } = useDemoVista();
  const [wall, setWall] = useState<{ titulo: string; detalle: string } | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-ink-soft">Hola 👋</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Gimnasio Sante
          </h1>
        </div>
        <span className="rounded-full border border-volt/30 bg-volt/10 px-3 py-1 text-xs font-semibold text-volt">
          Modo Demo
        </span>
      </div>

      {/* Tarjeta de Cuota con Anillo de Progreso SVG (igual a /mi) */}
      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 border-l-2 border-l-ok shadow-sm">
        <p className="text-xs text-ink-soft mb-4">Tu cuota</p>
        <div className="flex items-center gap-6">
          <AnilloProgreso valor={25} max={30} label="días" tono="ok" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-semibold leading-tight text-[color:var(--ok)]">
              Al día
            </p>
            <p className="text-sm text-ink-soft mt-1">
              Pase Libre · vence en 25 días
            </p>
          </div>
        </div>
      </div>

      {/* Widget de Racha / Constancia de asistencia (igual a /mi) */}
      <RachaConstancia dias={MOCK_RACHA_DIAS} total={7} />

      {/* Lista completa de módulos de la vista de cliente */}
      <ul className="stagger-in card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule shadow-sm">
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              ir("peso");
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <User
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mi perfil y peso corporal
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall({
                titulo: "Mensajes con tu gimnasio",
                detalle:
                  "Creá tu cuenta gratis para escribirte con los profes y recibir avisos de tu cuota y tu rutina.",
              });
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <MessageSquare
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mensajes del gimnasio
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              ir("rutina");
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Dumbbell
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Tu rutina
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall({
                titulo: "Tus pagos y cuotas",
                detalle:
                  "Con tu cuenta podés ver tus comprobantes, pagar por transferencia o Mercado Pago y seguir tu historial.",
              });
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <CreditCard
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mis pagos
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall({
                titulo: "Personalizar tema",
                detalle:
                  "Elegí entre tema claro, oscuro o modo OLED, y adaptá los colores a tu estilo.",
              });
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Palette
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Personalizar tema
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall({
                titulo: "Buzón anónimo",
                detalle:
                  "Enviá sugerencias o comentarios 100% anónimos directamente a los dueños del gimnasio.",
              });
            }}
            className="group flex w-full items-center gap-3 px-4 py-4 min-h-14 text-left transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Inbox
              aria-hidden
              strokeWidth={2}
              className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Buzón anónimo
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </button>
        </li>
      </ul>

      {/* Banner PWA para instalar la app (igual a /mi) */}
      <div className="card-cut flex items-center justify-between gap-4 border border-rule bg-paper-2 p-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-rule bg-paper text-volt shadow-xs">
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate text-ink">
                Instalar en tu celular
              </span>
              <span className="rounded-[4px] bg-volt/20 px-1.5 py-0.5 text-[10px] font-bold text-volt">
                #APP
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5 truncate">
              Instalá la aplicación en tu inicio con 1 toque
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticoImpactoMedio();
            setWall({
              titulo: "Instalar aplicación",
              detalle:
                "Creá tu cuenta gratis para instalar la app en tu celular y acceder directo desde tu pantalla de inicio.",
            });
          }}
          className="shrink-0 inline-flex min-h-9 items-center justify-center rounded-[8px] bg-ink px-3 text-xs font-semibold text-paper shadow-sm active:scale-95 transition-transform"
        >
          Agregar a inicio →
        </button>
      </div>

      <p className="px-2 text-center text-[13px] text-ink-soft leading-snug">
        Estás viendo una demo. Tocá{" "}
        <span className="font-semibold text-ink">Rutina</span> o{" "}
        <span className="font-semibold text-ink">Peso</span> abajo para interactuar
        con el sistema.
      </p>

      {wall ? (
        <LoginWall
          titulo={wall.titulo}
          detalle={wall.detalle}
          onClose={() => setWall(null)}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────── Rutina (generador + editor) ─────────────────── */

function SelectorChips<T extends string | number>({
  label,
  opciones,
  valor,
  onChange,
  render,
  gridCols = "grid-cols-2",
  fullLast = false,
  isMono = false,
}: {
  label: string;
  opciones: readonly T[];
  valor: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
  gridCols?: string;
  fullLast?: boolean;
  isMono?: boolean;
}) {
  return (
    <div>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
        {label}
      </span>
      <div className={`grid ${gridCols} gap-2`}>
        {opciones.map((op, idx) => {
          const activo = op === valor;
          const isLastAndOdd =
            fullLast && idx === opciones.length - 1 && opciones.length % 2 !== 0;
          return (
            <button
              key={String(op)}
              type="button"
              onClick={() => {
                hapticoSeleccion();
                onChange(op);
              }}
              className={`flex min-h-11 w-full items-center justify-center rounded-[12px] border px-3 py-2 text-center text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] ${
                isLastAndOdd ? "col-span-2" : ""
              } ${isMono ? "tabular-nums font-mono" : ""} ${
                activo
                  ? "border-accent bg-accent/10 font-semibold text-accent shadow-xs"
                  : "border-rule bg-paper text-ink-soft hover:border-ink/20 hover:text-ink"
              }`}
            >
              <span className="truncate">{render(op)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DemoRutina() {
  const { ir } = useDemoVista();
  const [objetivo, setObjetivo] = useState<Objetivo>("hipertrofia");
  const [nivel, setNivel] = useState<Nivel>("avanzado");
  const [dias, setDias] = useState(3);
  const [plan, setPlan] = useState<DiaEditable[]>(() =>
    aEditable(
      generarPlan(
        {
          objetivo: "hipertrofia",
          nivel: "avanzado",
          dias: 3,
          preferencia: "gimnasio",
          sexo: "sin_especificar",
          enfasis: [],
          seed: 12345,
        },
        CATALOGO,
      ),
    ),
  );
  const [diaActivoIdx, setDiaActivoIdx] = useState(0);
  const [setsCompletados, setSetsCompletados] = useState<Record<string, number[]>>({});
  const [usadas, setUsadas] = useState(0);
  const [wall, setWall] = useState<
    null | "limite" | "guardar" | "pdf" | "manual" | "avanzado" | "ayuda"
  >(null);
  const [modalExplicacion, setModalExplicacion] = useState(false);
  const [swapKey, setSwapKey] = useState<string | null>(null);
  const [feedbackActualizar, setFeedbackActualizar] = useState(false);
  const [ejercicioModal, setEjercicioModal] = useState<any | null>(null);
  const [logroAbierto, setLogroAbierto] = useState(false);
  const logroMostradoRef = useRef<Record<number, boolean>>({});
  const [pesosEjercicios, setPesosEjercicios] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem("sysgym_demo_pesos_ejercicios");
      return raw
        ? JSON.parse(raw)
        : {
            "press-banca-barra": 60,
            "press-inclinado-mancuernas": 22,
            "sentadillas-barra": 80,
            "prensa-piernas": 120,
            "jalon-pecho": 55,
            "remo-barra": 50,
            "curl-biceps-barra": 25,
            "extensiones-triceps-polea": 30,
          };
    } catch {
      return {};
    }
  });

  function guardarPesoEjercicio(slug: string, peso: number) {
    setPesosEjercicios((prev) => {
      const next = { ...prev, [slug]: peso };
      try {
        sessionStorage.setItem("sysgym_demo_pesos_ejercicios", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  useEffect(() => {
    try {
      setUsadas(Number(sessionStorage.getItem("demo.generaciones") ?? "0"));
    } catch {
      /* sessionStorage no disponible: se queda en 0 */
    }
  }, []);

  const generar = useCallback(() => {
    if (usadas >= LIMITE_GENERACIONES) {
      hapticoImpactoMedio();
      setWall("limite");
      return;
    }
    hapticoImpactoMedio();
    const generado = generarPlan(
      {
        objetivo,
        nivel,
        dias,
        preferencia: "gimnasio",
        sexo: "sin_especificar",
        enfasis: [],
        seed: Date.now(),
      },
      CATALOGO,
    );
    setPlan(aEditable(generado));
    setDiaActivoIdx(0);
    setSetsCompletados({});
    setSwapKey(null);
    const n = usadas + 1;
    setUsadas(n);
    try {
      sessionStorage.setItem("demo.generaciones", String(n));
    } catch {
      /* noop */
    }
    hapticoExito();
  }, [objetivo, nivel, dias, usadas]);

  function toggleSet(itemKey: string, setIndex: number, nota?: string) {
    hapticoSeleccion();
    setSetsCompletados((prev) => {
      const actuales = prev[itemKey] ?? [];
      const hecho = actuales.includes(setIndex);
      const nuevo = hecho
        ? actuales.filter((s) => s !== setIndex)
        : [...actuales, setIndex];

      if (!hecho) {
        const segs = extraerSegundosDescanso(nota);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("timer:iniciar", {
              detail: { segundos: segs },
            }),
          );
        }
      }

      return { ...prev, [itemKey]: nuevo };
    });
  }

  function editar(
    diaIdx: number,
    key: string,
    campo: "series" | "repeticiones",
    valor: string,
  ) {
    hapticoSeleccion();
    setPlan((prev) =>
      prev.map((d, i) =>
        i !== diaIdx
          ? d
          : {
              ...d,
              items: d.items.map((it) =>
                it.key !== key
                  ? it
                  : {
                      ...it,
                      [campo]: campo === "series" ? Number(valor) : valor,
                    },
              ),
            },
      ),
    );
  }

  function cambiarEjercicio(diaIdx: number, key: string, nuevoSlug: string) {
    hapticoExito();
    setPlan((prev) =>
      prev.map((d, i) =>
        i !== diaIdx
          ? d
          : {
              ...d,
              items: d.items.map((it) =>
                it.key !== key ? it : { ...it, slug: nuevoSlug },
              ),
            },
      ),
    );
    setSwapKey(null);
  }

  const diaActivo = plan[diaActivoIdx] ?? plan[0] ?? { titulo: "Día 1", items: [] };
  const totalSeries = diaActivo.items.reduce((acc, it) => acc + it.series, 0);
  const seriesHechas = diaActivo.items.reduce((acc, it) => {
    const completadas = (setsCompletados[it.key] ?? []).filter((s) => s < it.series);
    return acc + completadas.length;
  }, 0);
  const pct = totalSeries > 0 ? Math.round((seriesHechas / totalSeries) * 100) : 0;
  const tiempoMin = Math.round(totalSeries * 2.2);
  const volumenKilos = totalSeries * 140;

  useEffect(() => {
    if (totalSeries > 0 && seriesHechas === totalSeries) {
      if (!logroMostradoRef.current[diaActivoIdx]) {
        logroMostradoRef.current[diaActivoIdx] = true;
        setLogroAbierto(true);
      }
    }
  }, [seriesHechas, totalSeries, diaActivoIdx]);

  function musculosDelDia(items: ItemEditable[]): string {
    const grupos = new Set<string>();
    for (const it of items) {
      const ej = ejPorSlug(it.slug);
      if (ej?.grupo_muscular) {
        grupos.add(ej.grupo_muscular);
      }
    }
    return Array.from(grupos).slice(0, 3).join(" · ") || "cuerpo completo";
  }

  const restantes = Math.max(LIMITE_GENERACIONES - usadas, 0);

  return (
    <div className="space-y-6 pb-64">
      {/* Header idéntico a /mi/rutina */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              ir("inicio");
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-3.5 text-xs font-semibold text-ink transition-transform duration-150 active:scale-95 shadow-xs"
          >
            <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
            Volver
          </button>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setFeedbackActualizar(true);
              setTimeout(() => setFeedbackActualizar(false), 2000);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-3.5 text-xs font-semibold text-ink transition-transform duration-150 active:scale-95 shadow-xs"
          >
            <RefreshCw
              aria-hidden
              strokeWidth={2}
              className={`size-3.5 ${feedbackActualizar ? "animate-spin text-accent" : ""}`}
            />
            {feedbackActualizar ? "Al día ✓" : "Actualizar"}
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Tu rutina
            </h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {OBJETIVO_LABEL[objetivo]} · {NIVEL_LABEL[nivel]} · {plan.length} días
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall("pdf");
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-3.5 text-xs font-semibold text-ink transition-transform duration-150 active:scale-95 shrink-0 shadow-xs"
          >
            <Download aria-hidden strokeWidth={2} className="size-3.5 text-ink-soft" />
            Descargar rutina
          </button>
        </div>
      </div>

      {/* Banner Motivacional oficial */}
      <BannerMotivacional />

      {/* Tarjetas de acción y personalización (igual a /mi/rutina) */}
      <div className="space-y-2.5">
        {/* Acordeón para regenerar rutina con el generador científico */}
        <details className="group rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between text-sm font-medium text-ink transition-transform duration-150 active:scale-[0.99] [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
                <RotateCcw aria-hidden className="size-4" />
              </span>
              <span className="truncate group-open:hidden">Regenerar rutina</span>
              <span className="hidden truncate group-open:inline font-semibold">
                Cerrar generador
              </span>
            </div>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 group-open:rotate-90"
            />
          </summary>

          <div className="mt-3.5 space-y-4 border-t border-rule pt-3.5 animate-fade-in">
            <p className="text-xs leading-snug text-ink-soft">
              Cambiá lo que haga falta y armamos un plan nuevo con evidencia científica.
            </p>
            <SelectorChips
              label="Objetivo"
              opciones={OBJETIVOS}
              valor={objetivo}
              onChange={setObjetivo}
              render={(o) => OBJETIVO_LABEL[o]}
              gridCols="grid-cols-2"
              fullLast={true}
            />
            <SelectorChips
              label="Nivel"
              opciones={NIVELES}
              valor={nivel}
              onChange={setNivel}
              render={(n) => NIVEL_LABEL[n]}
              gridCols="grid-cols-3"
            />
            <SelectorChips
              label={`Días por semana: ${dias}`}
              opciones={[2, 3, 4, 5, 6] as const}
              valor={dias}
              onChange={setDias}
              render={(d) => String(d)}
              gridCols="grid-cols-5"
              isMono={true}
            />

            <button
              type="button"
              onClick={generar}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-volt px-4 text-sm font-semibold text-volt-ink shadow-sm transition-[transform,filter] duration-150 hover:brightness-95 active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              Regenerar rutina con evidencia científica
            </button>

            <p className="text-center text-[11px] text-ink-soft">
              {restantes > 0
                ? `Te quedan ${restantes} ${
                    restantes === 1 ? "generación" : "generaciones"
                  } de prueba`
                : "Llegaste al límite de la prueba"}
            </p>
          </div>
        </details>

        {/* Tarjeta de Armado Manual */}
        <button
          type="button"
          onClick={() => {
            hapticoImpactoMedio();
            setWall("manual");
          }}
          className="flex w-full cursor-pointer select-none items-center justify-between rounded-[12px] border border-rule bg-paper-2 p-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-paper-3 active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
              <Plus aria-hidden className="size-4" />
            </span>
            <span className="truncate">¿Ya entrenás y querés armar tu rutina a mano?</span>
          </div>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft" />
        </button>

        {/* Tarjeta de Modo Avanzado */}
        <button
          type="button"
          onClick={() => {
            hapticoImpactoMedio();
            setWall("avanzado");
          }}
          className="flex w-full cursor-pointer select-none items-center justify-between rounded-[12px] border border-rule bg-paper-2 p-3 text-sm font-medium text-ink transition-all duration-150 hover:bg-paper-3 active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
              <SlidersHorizontal aria-hidden className="size-4" />
            </span>
            <span className="truncate">Modo avanzado — afinar el plan</span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-accent">Abrir</span>
        </button>

        {/* Tarjeta de Fundamentación Científica */}
        <button
          type="button"
          onClick={() => {
            hapticoSeleccion();
            setModalExplicacion(true);
          }}
          className="flex w-full cursor-pointer select-none items-center justify-between rounded-[12px] border border-accent/40 bg-accent/10 p-3 text-sm font-medium text-accent transition-all duration-150 hover:bg-accent/15 active:scale-[0.99] shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-accent/30 bg-accent/15 text-accent">
              <Sparkles aria-hidden className="size-4" />
            </span>
            <span className="truncate">¿Por qué está armada así tu rutina?</span>
          </div>
          <span className="shrink-0 text-xs font-semibold text-accent flex items-center gap-1">
            Ver explicación <ChevronRight className="size-3.5" />
          </span>
        </button>
      </div>

      {/* Selector de Días (Día 1, Día 2, Día 3...) */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {plan.map((d, idx) => {
          const activo = idx === diaActivoIdx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setDiaActivoIdx(idx);
                setSwapKey(null);
              }}
              className={`min-h-11 flex-1 min-w-[80px] rounded-[10px] px-3 py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                activo
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "border border-rule bg-paper-2 text-ink-soft hover:text-ink"
              }`}
            >
              Día {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Hero Card de Sesión Activa */}
      <div className="relative overflow-hidden rounded-[16px] border border-rule bg-paper-2 p-4.5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded-[5px] bg-accent/15 border border-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                Sesión Activa
              </span>
              <span className="text-[11px] font-mono tabular-nums text-ink-soft">
                {diaActivo.items.length} ejercicios
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-lg font-bold tracking-tight text-ink">
              Día {diaActivoIdx + 1} · {diaActivo.titulo}
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft capitalize">
              {musculosDelDia(diaActivo.items)}
            </p>
          </div>

          {/* Anillo de progreso circular SVG */}
          <div className="relative size-[54px] shrink-0">
            <svg viewBox="0 0 54 54" className="size-full -rotate-90">
              <circle
                cx="27"
                cy="27"
                r="23"
                fill="none"
                stroke="currentColor"
                strokeWidth="4.5"
                className="text-rule"
              />
              <circle
                cx="27"
                cy="27"
                r="23"
                fill="none"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={144.5}
                strokeDashoffset={144.5 - (144.5 * pct) / 100}
                className="text-accent transition-[stroke-dashoffset] duration-500 [transition-timing-function:var(--ease-out)]"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono tabular-nums text-ink">
              {pct}%
            </span>
          </div>
        </div>

        {/* Grilla de Métricas Técnicas */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-rule pt-3">
          <div>
            <div className="text-[15px] font-bold leading-tight font-mono tabular-nums text-ink">
              {seriesHechas}/{totalSeries}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Series
            </div>
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight font-mono tabular-nums text-ink">
              ~{tiempoMin}m
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Duración
            </div>
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight font-mono tabular-nums text-ink">
              ~{volumenKilos.toLocaleString("es-AR")} kg
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Volumen Est.
            </div>
          </div>
        </div>

        {/* Barra horizontal de progreso de sesión */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-ink-soft">
            <span>Progreso de entrenamiento</span>
            <span className="font-bold font-mono tabular-nums text-ink">
              {seriesHechas} de {totalSeries} series
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full border border-rule bg-paper">
            <div
              className="h-full bg-accent transition-[width] duration-300 [transition-timing-function:var(--ease-out)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de Ejercicios del Día */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            Ejercicios del día
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Tildá cada serie al terminar
          </span>
        </div>

        <ul className="stagger-in divide-y divide-rule overflow-hidden rounded-[16px] border border-rule bg-paper-2 shadow-sm">
          {diaActivo.items.map((it, idx) => {
            const base = ejPorSlug(it.slug);
            const alts = base ? ejerciciosSimilares(base, CATALOGO, 6) : [];
            const completadas = setsCompletados[it.key] ?? [];

            return (
              <li key={it.key} className="p-4 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Columna Izquierda: GIF animado + Dial vertical de guardado de peso */}
                  <div className="flex flex-col items-center gap-2 shrink-0 w-[68px]">
                    <ExThumb ej={base} onOpen={() => setEjercicioModal(base)} />
                    <DialVerticalProgreso
                      ejercicioId={it.slug}
                      tipoEquipo={deducirTipoEquipo(base)}
                      ejercicioNombre={base?.nombre ?? nombreDe(it.slug)}
                      action={async (_prev, fd) => {
                        const p = Number(fd.get("peso") || 0);
                        guardarPesoEjercicio(it.slug, p);
                        return { ok: "Guardado" };
                      }}
                      fetchUltimoPeso={async (eid) => {
                        const p = pesosEjercicios[eid];
                        return p !== undefined
                          ? { peso: p, reps: null }
                          : { peso: deducirTipoEquipo(base) === "corporal" ? 0 : 20, reps: null };
                      }}
                    />
                  </div>

                  {/* Columna Derecha: Detalle, cambio, series y checks */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="shrink-0 text-[11px] font-[700] leading-none text-accent"
                            style={{ fontFamily: "var(--font-hero)" }}
                            aria-hidden
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="min-w-0 font-display text-[15px] font-bold leading-tight text-ink">
                            {nombreDe(it.slug)}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                            {base?.grupo_muscular ? base.grupo_muscular.replace(/_/g, " ") : "Cuerpo completo"}
                            {base?.nivel ? ` · ${base.nivel}` : ""}
                          </span>
                          <BadgeEquipo equipo={base?.equipo} nombre={base?.nombre} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 -mr-1 -mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            hapticoImpactoMedio();
                            setWall("ayuda");
                          }}
                          aria-label="Pedir ayuda a un profe"
                          className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all"
                        >
                          <HelpCircle className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            hapticoSeleccion();
                            setSwapKey(swapKey === it.key ? null : it.key);
                          }}
                          aria-expanded={swapKey === it.key}
                          aria-label={swapKey === it.key ? "Cerrar alternativas" : "Cambiar ejercicio"}
                          className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-transform duration-150 active:scale-90 active:bg-paper hover:text-ink"
                        >
                          {swapKey === it.key ? (
                            <X className="size-4" />
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M8 3 4 7l4 4" />
                              <path d="M4 7h16" />
                              <path d="m16 21 4-4-4-4" />
                              <path d="M20 17H4" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Prescripción de series y reps idéntica a /mi/rutina */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft">
                        <b
                          className="font-[700] text-ink"
                          style={{ fontFamily: "var(--font-hero)" }}
                        >
                          {it.series}
                        </b>
                        series
                      </span>
                      <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft">
                        <b
                          className="font-[700] text-ink"
                          style={{ fontFamily: "var(--font-hero)" }}
                        >
                          {it.repeticiones}
                        </b>
                        reps
                      </span>
                    </div>

                    {it.nota ? (
                      <div className="mt-2 flex items-center gap-1.5 rounded-[8px] border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] text-ink-soft">
                        <span className="font-semibold text-accent shrink-0">💡 Guía:</span>
                        <span className="truncate">{it.nota}</span>
                      </div>
                    ) : null}

                    {/* Tracker táctil de series de hoy (mínimo 44x44px con disparo de timer automático) */}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-rule bg-paper p-2">
                      <span className="text-[11px] font-semibold text-ink-soft">
                        Series de hoy:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {Array.from({ length: it.series }).map((_, sIdx) => {
                          const hecho = completadas.includes(sIdx);
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => toggleSet(it.key, sIdx, it.nota)}
                              aria-label={`Serie ${sIdx + 1} de ${it.series} ${hecho ? "completada" : "pendiente"}`}
                              className={`grid size-11 min-w-[44px] place-items-center rounded-[10px] border text-xs font-bold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                                hecho
                                  ? "border-accent bg-accent text-accent-ink shadow-sm"
                                  : "border-rule bg-paper-2 text-ink-soft hover:border-ink/40 hover:text-ink"
                              }`}
                              style={{ fontFamily: "var(--font-hero)" }}
                            >
                              {hecho ? "✓" : sIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {base?.descripcion ? (
                      <p className="mt-2 text-xs leading-snug text-ink-soft line-clamp-2">
                        {base.descripcion}
                      </p>
                    ) : null}

                    {/* Ajustar plan collapsible */}
                    <details className="group mt-2">
                      <summary className="inline-flex w-fit cursor-pointer select-none list-none items-center gap-1 rounded-[8px] border border-rule px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-all duration-150 active:scale-95 active:bg-paper [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="size-3 transition-transform duration-150 group-open:rotate-90" />
                        <span className="group-open:hidden">Ajustar plan</span>
                        <span className="hidden group-open:inline">Listo</span>
                      </summary>
                      <div className="mt-3 flex flex-wrap items-end gap-3 p-3 rounded-[10px] border border-rule bg-paper">
                        <label className="block">
                          <span className="block text-[11px] text-ink-soft mb-1">Series</span>
                          <select
                            value={it.series}
                            onChange={(e) =>
                              editar(diaActivoIdx, it.key, "series", e.target.value)
                            }
                            className="h-9 w-16 px-2 text-center rounded-[8px] border border-rule bg-paper-2 text-xs font-mono text-ink outline-none"
                          >
                            {SERIES_OPCIONES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span className="pb-2 text-ink-soft">×</span>
                        <label className="block">
                          <span className="block text-[11px] text-ink-soft mb-1">Reps</span>
                          <select
                            value={it.repeticiones}
                            onChange={(e) =>
                              editar(diaActivoIdx, it.key, "repeticiones", e.target.value)
                            }
                            className="h-9 w-24 px-2 rounded-[8px] border border-rule bg-paper-2 text-xs font-mono text-ink outline-none"
                          >
                            {(REPS_OPCIONES.includes(it.repeticiones as any)
                              ? REPS_OPCIONES
                              : [it.repeticiones, ...REPS_OPCIONES]
                            ).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </details>

                    {/* Desplegable de cambio de ejercicio */}
                    {swapKey === it.key ? (
                      <div className="mt-3 space-y-1.5 border-t border-rule pt-3">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                          Alternativas del mismo grupo:
                        </span>
                        {alts.length ? (
                          alts.map((alt) => (
                            <button
                              key={alt.id}
                              type="button"
                              onClick={() =>
                                alt.slug &&
                                cambiarEjercicio(diaActivoIdx, it.key, alt.slug)
                              }
                              className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-left text-[13px] transition-colors active:bg-paper-3"
                            >
                              <span className="capitalize font-medium text-ink">
                                {alt.nombre}
                              </span>
                              <ChevronRight className="size-4 shrink-0 text-ink-soft" />
                            </button>
                          ))
                        ) : (
                          <span className="block text-[13px] text-ink-soft py-1">
                            Sin alternativas para este grupo.
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Botón Guardar rutina al pie */}
      <button
        type="button"
        onClick={() => {
          hapticoImpactoMedio();
          setWall("guardar");
        }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-ink text-sm font-semibold text-paper shadow-sm transition-transform duration-150 active:scale-[0.98]"
      >
        <RotateCcw className="size-4" />
        Guardar rutina
      </button>

      {/* Muros de login contextuales */}
      {wall === "pdf" ? (
        <LoginWall
          titulo="Descargá tu rutina en PDF"
          detalle="Creá tu cuenta gratis para descargar e imprimir tu rutina completa con series, repeticiones y registro de cargas."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "manual" ? (
        <LoginWall
          titulo="Armado de rutina manual"
          detalle="Con una cuenta podés armar tu rutina desde cero, eligiendo del catálogo completo con técnicas de intensidad personalizadas."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "avanzado" ? (
        <LoginWall
          titulo="Modo avanzado — afinar el plan"
          detalle="Definí preferencias por molestias articulares, descansos específicos por grupo muscular y equipamiento disponible."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "guardar" ? (
        <LoginWall
          titulo="Guardá tu rutina"
          detalle="Necesitás una cuenta para guardar esta rutina y volver a verla cuando quieras, con tu registro de pesos."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "limite" ? (
        <LoginWall
          titulo="Probaste el generador 3 veces"
          detalle="Creá tu cuenta gratis para generar rutinas ilimitadas, guardarlas y seguir tu progreso semana a semana."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "ayuda" ? (
        <LoginWall
          titulo="Pedí ayuda a un profe"
          detalle="Con una cuenta activa podés solicitar asistencia en vivo para corregir la técnica o pedir que te adapten la carga de este ejercicio."
          onClose={() => setWall(null)}
        />
      ) : null}

      {/* Modal de Explicación Científica */}
      {modalExplicacion ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/65 backdrop-blur-md animate-fade-in sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-[24px] border border-rule bg-paper p-6 shadow-[0_24px_50px_rgba(0,0,0,0.45)] animate-slide-up sm:rounded-[24px]">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                Fundamento científico
              </h2>
              <button
                type="button"
                onClick={() => setModalExplicacion(false)}
                className="flex size-8 items-center justify-center rounded-full text-ink-soft hover:bg-paper-2"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-ink-soft leading-snug">
              <p>
                <strong className="text-ink font-semibold">1. Frecuencia 2x:</strong> Estimulación de cada grupo muscular cada 48 a 72 horas para optimizar la síntesis de proteína muscular (Schoenfeld, 2016).
              </p>
              <p>
                <strong className="text-ink font-semibold">2. Volumen óptimo:</strong> 12 a 18 series efectivas semanales por grupo, evitando el volumen basura que retrasa la recuperación (Israetel / RP).
              </p>
              <p>
                <strong className="text-ink font-semibold">3. Proximidad al fallo (RIR 1-3):</strong> Máximo reclutamiento de unidades motoras sin fatiga neural excesiva.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setModalExplicacion(false);
              }}
              className="mt-6 flex min-h-11 w-full items-center justify-center rounded-[12px] bg-volt px-4 text-xs font-semibold text-volt-ink shadow-sm active:scale-95 transition-transform"
            >
              Entendido
            </button>
          </div>
        </div>
      ) : null}

      {/* Modal de Visor de Ejercicio animado */}
      {ejercicioModal ? (
        <VisorEjercicio
          ej={ejercicioModal}
          onClose={() => setEjercicioModal(null)}
        />
      ) : null}

      {/* Barra de progreso Sticky fija que acompaña el scroll */}
      <StickyProgresoDia
        titulo={diaActivo.titulo}
        seriesHechas={seriesHechas}
        totalSeries={totalSeries}
        pct={pct}
        targetRefId="hero-resumen-dia"
      />

      {/* Modal / Ceremonia de logro al completar el 100% de la sesión */}
      <LogroDiaCompletado
        abierto={logroAbierto}
        diaTitulo={diaActivo.titulo}
        totalSeries={totalSeries}
        volumenKilos={volumenKilos}
        tiempoMin={tiempoMin}
        onClose={() => setLogroAbierto(false)}
      />

      {/* Timer de descanso flotante interactivo (idéntico a la app logeada) */}
      <TimerDescanso />
    </div>
  );
}

/* ───────────────────────── Peso / Perfil (mock réplica /mi/perfil) ─────── */

function DemoPeso() {
  const { ir } = useDemoVista();
  const [pesoActual, setPesoActual] = useState(68.4);
  const [registros, setRegistros] = useState([
    { id: "1", fecha: "Hoy", peso: 68.4 },
    { id: "2", fecha: "04 Sep", peso: 69.1 },
    { id: "3", fecha: "28 Ago", peso: 69.8 },
  ]);
  const [guardadoFeedback, setGuardadoFeedback] = useState(false);
  const [wall, setWall] = useState<null | "tema" | "clave">(null);

  function handleGuardarPeso() {
    hapticoImpactoMedio();
    setGuardadoFeedback(true);
    setRegistros((prev) => [
      { id: String(Date.now()), fecha: "Hoy", peso: pesoActual },
      ...prev.filter((r) => r.fecha !== "Hoy"),
    ]);
    setTimeout(() => {
      hapticoExito();
      setGuardadoFeedback(false);
    }, 1800);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Volver */}
      <button
        type="button"
        onClick={() => {
          hapticoSeleccion();
          ir("inicio");
        }}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-accent hover:underline active:scale-95 transition-transform"
      >
        ← Volver al inicio
      </button>

      {/* Cabecera del perfil */}
      <div className="rounded-[18px] border border-rule bg-paper-2 p-5 flex items-center gap-4 shadow-sm">
        <div className="relative size-16 shrink-0 rounded-full border-2 border-rule bg-paper-3 overflow-hidden grid place-items-center text-xl font-bold text-ink-soft">
          <span>LS</span>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-ink truncate leading-tight">
            Lucas Socio
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            DNI 20000000 · Gimnasio Sante
          </p>
          <p className="text-[11px] text-ink-soft/70 mt-1 flex items-center gap-1">
            <Calendar className="size-3" /> Socio desde septiembre de 2026
          </p>
        </div>
      </div>

      {/* ── SECCIÓN 1: Peso corporal (Dial horizontal de regla + historial) ── */}
      <div className="rounded-[18px] border border-rule bg-paper-2 overflow-hidden shadow-sm">
        <div className="p-5 space-y-4">
          {/* Encabezado */}
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Peso corporal
            </h2>
            <span className="text-[11px] text-ink-soft">
              Hoy:{" "}
              <b
                className="text-[#ff9f0a] font-semibold"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {pesoActual.toFixed(1)} kg
              </b>
            </span>
          </div>

          {/* Dial de regla horizontal estilo iOS Timer */}
          <div className="pt-1">
            <RulerWeightPicker
              defaultValue={pesoActual}
              onChange={(nuevoPeso) => setPesoActual(nuevoPeso)}
            />
          </div>

          {/* Fila inferior: Botón estilo pill iOS a la izquierda + Display digital a la derecha */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-rule/50">
            {/* Botón pill estilo 'Start Timer' */}
            <button
              type="button"
              onClick={handleGuardarPeso}
              className={`h-11 px-5 rounded-full text-xs font-bold tracking-wide transition-all duration-150 active:scale-95 flex items-center gap-2 ${
                guardadoFeedback
                  ? "bg-ok text-ok-ink border border-ok shadow-[0_0_15px_rgba(16,231,160,0.2)]"
                  : "bg-[#ff9f0a]/15 border border-[#ff9f0a]/35 text-[#ff9f0a] hover:bg-[#ff9f0a]/25 shadow-[0_0_15px_rgba(255,159,10,0.1)]"
              }`}
            >
              <CheckCircle2 className="size-4" />
              <span>{guardadoFeedback ? "¡Peso guardado!" : "Guardar peso"}</span>
            </button>

            {/* Display digital grande con brillo ámbar */}
            <div className="flex items-baseline gap-1 text-right select-none">
              <span
                className="text-[34px] font-bold tracking-tight text-[#ff9f0a] tabular-nums"
                style={{
                  fontFamily: "var(--font-hero, system-ui)",
                  textShadow: "0 0 20px rgba(255, 159, 10, 0.4)",
                }}
              >
                {pesoActual.toFixed(1)}
              </span>
              <span className="text-[14px] font-semibold text-[#ff9f0a]/75">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Historial colapsado con registros */}
        <details className="group border-t border-rule">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between px-5 py-3 text-[12px] font-medium text-ink-soft hover:text-ink transition-colors [&::-webkit-details-marker]:hidden">
            <span>
              Historial · {registros.length}{" "}
              {registros.length === 1 ? "registro" : "registros"}
            </span>
            <ChevronRight className="size-4 transition-transform duration-150 group-open:rotate-90" />
          </summary>
          <div className="divide-y divide-rule border-t border-rule px-5 py-2">
            {registros.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <span className="text-ink-soft font-mono">{r.fecha}</span>
                <span className="font-semibold text-ink tabular-nums">
                  {r.peso.toFixed(1)} kg
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* ── SECCIÓN 2: Datos de Contacto y Cuenta ── */}
      <div className="rounded-[18px] border border-rule bg-paper-2 p-5 space-y-3 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
          Datos de la cuenta
        </h2>

        <ul className="divide-y divide-rule text-xs">
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <IdCard className="size-3.5 text-ink-soft" /> DNI
            </span>
            <span className="font-mono text-ink">20000000</span>
          </li>

          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <Phone className="size-3.5 text-ink-soft" /> Teléfono
            </span>
            <span className="text-ink">1123456789</span>
          </li>

          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <User className="size-3.5 text-ink-soft" /> Sexo
            </span>
            <span className="capitalize text-ink">Hombre</span>
          </li>

          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <Dumbbell className="size-3.5 text-ink-soft" /> Plan actual
            </span>
            <span className="font-semibold text-ink">Pase Libre</span>
          </li>
        </ul>
      </div>

      {/* ── SECCIÓN 3: Preferencias y Seguridad ── */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            hapticoImpactoMedio();
            setWall("tema");
          }}
          className="rounded-[14px] border border-rule bg-paper-2 p-4 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper active:scale-[0.99] transition-all shadow-xs"
        >
          <span>Personalizar tema visual de la app</span>
          <span className="text-ink-soft">→</span>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticoImpactoMedio();
            setWall("clave");
          }}
          className="rounded-[14px] border border-rule bg-paper-2 p-4 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper active:scale-[0.99] transition-all shadow-xs"
        >
          <span>Cambiar contraseña</span>
          <span className="text-ink-soft">→</span>
        </button>
      </div>

      {wall === "tema" ? (
        <LoginWall
          titulo="Personalizá tu tema visual"
          detalle="Creá tu cuenta para elegir entre tema oscuro, claro, acentos de color personalizados y contraste alto."
          onClose={() => setWall(null)}
        />
      ) : null}
      {wall === "clave" ? (
        <LoginWall
          titulo="Seguridad de la cuenta"
          detalle="El cambio de contraseña y autenticación en dos pasos requiere tener tu usuario activo en el gimnasio."
          onClose={() => setWall(null)}
        />
      ) : null}
    </div>
  );
}
