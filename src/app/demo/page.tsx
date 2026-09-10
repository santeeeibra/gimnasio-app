"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingDown,
} from "lucide-react";
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
    <main className="mx-auto max-w-md px-5 pt-6">
      {vista === "inicio" && <DemoInicio />}
      {vista === "rutina" && <DemoRutina />}
      {vista === "peso" && <DemoPeso />}
    </main>
  );
}

/* ───────────────────────── Inicio (home del alumno, mock) ───────────────── */

function DemoInicio() {
  const { ir } = useDemoVista();
  const [wall, setWall] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[13px] text-ink-soft">Hola 👋</p>
        <h1 className="font-display text-2xl">Tu gimnasio</h1>
      </div>

      <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
          Tu cuota
        </p>
        <p className="mt-1 font-display text-lg text-[color:var(--ok)]">Al día</p>
        <p className="text-[13px] text-ink-soft">Vence en 24 días</p>
      </div>

      <ul className="divide-y divide-rule overflow-hidden rounded-[16px] border border-rule bg-paper-2">
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              ir("rutina");
            }}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-paper-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
              <Dumbbell className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Tu rutina</span>
              <span className="block text-[13px] text-ink-soft">
                Generá y ajustá tu plan
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-soft" />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall(true);
            }}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-paper-3"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
              <MessageSquare className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Mensajes</span>
              <span className="block text-[13px] text-ink-soft">
                Escribite con los profes
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-soft" />
          </button>
        </li>
      </ul>

      <p className="text-center text-[13px] text-ink-soft">
        Estás viendo una demo. Tocá{" "}
        <span className="font-medium text-ink">Rutina</span> abajo para probar el
        generador.
      </p>

      {wall ? (
        <LoginWall
          titulo="Mensajes con tu gimnasio"
          detalle="Creá tu cuenta gratis para escribirte con los profes y recibir avisos de tu cuota y tu rutina."
          onClose={() => setWall(false)}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────── Rutina (generador + editor) ─────────────────── */

function ChipRow<T extends string | number>({
  label,
  opciones,
  valor,
  onChange,
  render,
}: {
  label: string;
  opciones: readonly T[];
  valor: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div>
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {opciones.map((op) => {
          const activo = op === valor;
          return (
            <button
              key={String(op)}
              type="button"
              onClick={() => {
                hapticoSeleccion();
                onChange(op);
              }}
              className={`h-10 min-w-10 flex-1 rounded-[10px] border px-3 text-xs font-medium transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] ${
                activo
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-rule bg-paper text-ink-soft hover:text-ink"
              }`}
            >
              {render(op)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DemoRutina() {
  const [objetivo, setObjetivo] = useState<Objetivo>("hipertrofia");
  const [nivel, setNivel] = useState<Nivel>("intermedio");
  const [dias, setDias] = useState(4);
  const [plan, setPlan] = useState<DiaEditable[] | null>(null);
  const [usadas, setUsadas] = useState(0);
  const [wall, setWall] = useState<null | "limite" | "guardar">(null);
  const [swapKey, setSwapKey] = useState<string | null>(null);

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

  function editar(
    diaIdx: number,
    key: string,
    campo: "series" | "repeticiones",
    valor: string,
  ) {
    hapticoSeleccion();
    setPlan(
      (prev) =>
        prev &&
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
                        [campo]:
                          campo === "series" ? Number(valor) : valor,
                      },
                ),
              },
        ),
    );
  }

  function cambiarEjercicio(diaIdx: number, key: string, nuevoSlug: string) {
    hapticoExito();
    setPlan(
      (prev) =>
        prev &&
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

  const restantes = Math.max(LIMITE_GENERACIONES - usadas, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Tu rutina</h1>
        <p className="text-sm text-ink-soft">
          Respondé y armamos tu plan con evidencia científica. Después ajustás
          series, reps y ejercicios.
        </p>
      </div>

      <div className="space-y-4 rounded-[16px] border border-rule bg-paper-2 p-4">
        <ChipRow
          label="Objetivo"
          opciones={OBJETIVOS}
          valor={objetivo}
          onChange={setObjetivo}
          render={(o) => OBJETIVO_LABEL[o]}
        />
        <ChipRow
          label="Nivel"
          opciones={NIVELES}
          valor={nivel}
          onChange={setNivel}
          render={(n) => NIVEL_LABEL[n]}
        />
        <ChipRow
          label={`Días por semana: ${dias}`}
          opciones={[2, 3, 4, 5, 6] as const}
          valor={dias}
          onChange={setDias}
          render={(d) => String(d)}
        />

        <button
          type="button"
          onClick={generar}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-volt text-sm font-semibold text-volt-ink shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98]"
        >
          <Sparkles className="size-4" />
          {plan ? "Regenerar rutina" : "Generar rutina con evidencia científica"}
        </button>

        <p className="text-center text-[11px] text-ink-soft">
          {restantes > 0
            ? `Te quedan ${restantes} ${
                restantes === 1 ? "generación" : "generaciones"
              } de prueba`
            : "Llegaste al límite de la prueba"}
        </p>
      </div>

      {plan ? (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            <CheckCircle2 className="size-4 text-[color:var(--ok)]" />
            Plan armado · {plan.length} días
          </h2>

          {plan.map((dia, di) => (
            <div
              key={di}
              className="space-y-3 rounded-[16px] border border-rule bg-paper-2 p-4"
            >
              <div className="flex items-center justify-between border-b border-rule pb-2">
                <span className="font-display text-sm">
                  Día {di + 1}: {dia.titulo}
                </span>
                <span className="text-[11px] text-ink-soft">
                  {dia.items.length} ejercicios
                </span>
              </div>

              <div className="space-y-2.5">
                {dia.items.map((it) => {
                  const base = ejPorSlug(it.slug);
                  const alts = base
                    ? ejerciciosSimilares(base, CATALOGO, 6)
                    : [];
                  return (
                    <div
                      key={it.key}
                      className="rounded-[10px] border border-rule bg-paper p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-sm font-medium capitalize">
                            {nombreDe(it.slug)}
                          </span>
                          <span className="block text-[11px] capitalize text-ink-soft">
                            {base?.grupo_muscular ?? "cuerpo completo"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <select
                          value={it.series}
                          onChange={(e) =>
                            editar(di, it.key, "series", e.target.value)
                          }
                          className="h-9 appearance-none rounded-[8px] border border-rule bg-paper px-2 text-[13px] outline-none focus:border-ink"
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
                            editar(di, it.key, "repeticiones", e.target.value)
                          }
                          className="h-9 appearance-none rounded-[8px] border border-rule bg-paper px-2 text-[13px] outline-none focus:border-ink"
                        >
                          {(REPS_OPCIONES.includes(
                            it.repeticiones as (typeof REPS_OPCIONES)[number],
                          )
                            ? REPS_OPCIONES
                            : [
                                it.repeticiones,
                                ...REPS_OPCIONES,
                              ]).map((r) => (
                            <option key={r} value={r}>
                              {r} reps
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            hapticoSeleccion();
                            setSwapKey(swapKey === it.key ? null : it.key);
                          }}
                          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-rule px-2.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
                        >
                          <RefreshCw className="size-3.5" />
                          Cambiar
                        </button>
                      </div>

                      {swapKey === it.key ? (
                        <div className="mt-2.5 space-y-1.5 border-t border-rule pt-2.5">
                          <span className="block text-[11px] text-ink-soft">
                            Elegí un reemplazo del mismo grupo:
                          </span>
                          {alts.length ? (
                            alts.map((alt) => (
                              <button
                                key={alt.id}
                                type="button"
                                onClick={() =>
                                  alt.slug &&
                                  cambiarEjercicio(di, it.key, alt.slug)
                                }
                                className="flex w-full items-center justify-between rounded-[8px] border border-rule bg-paper-2 px-2.5 py-2 text-left text-[13px] transition-colors active:bg-paper-3"
                              >
                                <span className="capitalize">{alt.nombre}</span>
                                <ChevronRight className="size-3.5 shrink-0 text-ink-soft" />
                              </button>
                            ))
                          ) : (
                            <span className="block text-[13px] text-ink-soft">
                              Sin alternativas para este grupo.
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              hapticoImpactoMedio();
              setWall("guardar");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-ink text-sm font-medium text-paper shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98]"
          >
            <RotateCcw className="size-4" />
            Guardar rutina
          </button>
        </div>
      ) : null}

      {wall === "limite" ? (
        <LoginWall
          titulo="Probaste el generador 3 veces"
          detalle="Creá tu cuenta gratis para generar rutinas ilimitadas, guardarlas y seguir tu progreso semana a semana."
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
        <h1 className="font-display text-2xl">Control de peso</h1>
        <p className="text-sm text-ink-soft">
          Anotá tu peso y mirá la evolución. En la demo se guarda solo en esta
          pantalla.
        </p>
      </div>

      <form
        onSubmit={agregar}
        className="flex gap-2 rounded-[16px] border border-rule bg-paper-2 p-4"
      >
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder="Ej: 74.8"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          className="h-11 flex-1 rounded-[10px] border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-volt px-4 text-sm font-semibold text-volt-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95"
        >
          <Plus className="size-4" />
          Anotar
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
          <span className="block text-[13px] text-ink-soft">Último peso</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl">{ultimo ?? "--"}</span>
            <span className="text-xs font-medium text-ink-soft">kg</span>
          </div>
        </div>
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
          <span className="block text-[13px] text-ink-soft">Evolución</span>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[color:var(--ok)]">
            <TrendingDown className="size-4" />
            -1.3 kg / 7 días
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-[16px] border border-rule bg-paper-2 p-4">
        <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
          Historial
        </span>
        {historial.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-[10px] border border-rule bg-paper px-3 py-2.5"
          >
            <span className="text-[13px] text-ink-soft">{r.fecha}</span>
            <span className="text-sm font-medium">{r.peso} kg</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-[12px] border border-rule bg-paper-2 p-3 text-[13px] text-ink-soft">
        <Scale className="size-4 shrink-0 text-accent" />
        Con una cuenta, tu peso queda guardado y aparece en el PDF de tu rutina.
      </div>
    </div>
  );
}
