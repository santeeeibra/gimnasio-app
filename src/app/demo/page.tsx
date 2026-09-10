"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Dumbbell,
  Inbox,
  MessageSquare,
  Palette,
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

const CATALOGO = [...CATALOGO_UNIVERSAL_EMERGENCIA];
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
  return CATALOGO.find((e) => e.slug === slug) ?? null;
}

function nombreDe(slug: string) {
  return ejPorSlug(slug)?.nombre ?? slug.replace(/-/g, " ");
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
    null | "limite" | "guardar" | "pdf" | "manual" | "avanzado"
  >(null);
  const [modalExplicacion, setModalExplicacion] = useState(false);
  const [swapKey, setSwapKey] = useState<string | null>(null);
  const [feedbackActualizar, setFeedbackActualizar] = useState(false);

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

  function toggleSet(itemKey: string, setIndex: number) {
    hapticoSeleccion();
    setSetsCompletados((prev) => {
      const actuales = prev[itemKey] ?? [];
      const nuevo = actuales.includes(setIndex)
        ? actuales.filter((s) => s !== setIndex)
        : [...actuales, setIndex];
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
    <div className="space-y-5">
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-accent">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold capitalize text-ink">
                        {nombreDe(it.slug)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-[4px] border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink-soft capitalize">
                        {base?.equipo ? base.equipo.replace(/_/g, " ") : "Con barra"}
                      </span>
                      <span className="text-[11px] text-ink-soft capitalize">
                        {base?.grupo_muscular ?? "cuerpo completo"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      hapticoSeleccion();
                      setSwapKey(swapKey === it.key ? null : it.key);
                    }}
                    className="inline-flex min-h-9 items-center gap-1 rounded-[8px] border border-rule bg-paper px-2.5 text-xs text-ink-soft transition-colors hover:text-ink active:scale-95"
                  >
                    <RefreshCw className="size-3" />
                    Cambiar
                  </button>
                </div>

                {/* Selectores de Series / Reps y Botones interactivos de tildar serie */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rule/60 pt-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={it.series}
                      onChange={(e) =>
                        editar(diaActivoIdx, it.key, "series", e.target.value)
                      }
                      className="h-9 appearance-none rounded-[8px] border border-rule bg-paper px-2 text-xs font-mono tabular-nums text-ink outline-none focus:border-ink"
                    >
                      {SERIES_OPCIONES.map((s) => (
                        <option key={s} value={s}>
                          {s} series
                        </option>
                      ))}
                    </select>
                    <select
                      value={it.repeticiones}
                      onChange={(e) =>
                        editar(diaActivoIdx, it.key, "repeticiones", e.target.value)
                      }
                      className="h-9 appearance-none rounded-[8px] border border-rule bg-paper px-2 text-xs font-mono tabular-nums text-ink outline-none focus:border-ink"
                    >
                      {(REPS_OPCIONES.includes(it.repeticiones as any)
                        ? REPS_OPCIONES
                        : [it.repeticiones, ...REPS_OPCIONES]
                      ).map((r) => (
                        <option key={r} value={r}>
                          {r} reps
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Círculos interactivos de series */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: it.series }).map((_, sIdx) => {
                      const hecha = completadas.includes(sIdx);
                      return (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => toggleSet(it.key, sIdx)}
                          className={`size-8 rounded-[8px] text-xs font-mono font-bold transition-[transform,background-color] duration-150 active:scale-90 flex items-center justify-center ${
                            hecha
                              ? "bg-accent text-accent-ink shadow-xs"
                              : "border border-rule bg-paper text-ink-soft hover:text-ink"
                          }`}
                        >
                          {hecha ? "✓" : sIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
    </div>
  );
}

/* ───────────────────────── Peso (control de peso, mock) ────────────────── */

function DemoPeso() {
  const [historial, setHistorial] = useState([
    { id: "1", fecha: "01 Sep", peso: 76.5 },
    { id: "2", fecha: "04 Sep", peso: 75.9 },
    { id: "3", fecha: "08 Sep", peso: 75.2 },
  ]);
  const [nuevo, setNuevo] = useState("");

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(nuevo);
    if (isNaN(val) || val <= 30 || val >= 250) return;
    hapticoImpactoMedio();
    const ahora = new Date();
    const fecha = `${ahora.getDate()} ${ahora.toLocaleString("es-AR", {
      month: "short",
    })}`;
    setHistorial((prev) => [
      ...prev,
      { id: String(Date.now()), fecha, peso: val },
    ]);
    setNuevo("");
    hapticoExito();
  }

  const ultimo = historial[historial.length - 1]?.peso ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Control de peso
        </h1>
        <p className="mt-1 text-sm text-ink-soft leading-snug">
          Anotá tu peso y mirá la evolución. En la demo se guarda solo en esta
          pantalla.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="flex gap-2 rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm"
      >
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder="Ej: 74.8"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          className="h-11 flex-1 rounded-[10px] border border-rule bg-paper px-3.5 text-[16px] tabular-nums font-mono text-ink outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink placeholder:text-ink-soft/60"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-volt px-4 text-sm font-semibold text-volt-ink shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-95"
        >
          <Plus className="size-4" />
          Anotar
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Último peso
          </span>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold tabular-nums font-mono text-ink">
              {ultimo ?? "--"}
            </span>
            <span className="text-xs font-semibold text-ink-soft">kg</span>
          </div>
        </div>
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Evolución
          </span>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[color:var(--ok)] tabular-nums font-mono">
            <TrendingDown className="size-4 shrink-0" />
            -1.3 kg / 7 días
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Historial
        </span>
        {historial.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-[10px] border border-rule bg-paper px-3.5 py-2.5 shadow-xs"
          >
            <span className="text-[13px] font-mono text-ink-soft">{r.fecha}</span>
            <span className="text-sm font-semibold tabular-nums font-mono text-ink">
              {r.peso} kg
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 rounded-[12px] border border-rule bg-paper-2 p-3.5 text-[13px] leading-snug text-ink-soft shadow-xs">
        <Scale className="size-4 shrink-0 text-accent" />
        <span>
          Con una cuenta, tu peso queda guardado y aparece en el PDF de tu rutina.
        </span>
      </div>
    </div>
  );
}
