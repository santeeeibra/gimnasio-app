"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ejerciciosSimilares, estaBloqueado } from "@/lib/rutina/motor";
import { Spinner } from "@/components/ui";
import {
  GRUPO_MUSCULAR_LABEL,
  MOLESTIAS,
  MOLESTIA_LABEL,
  REPS_OPCIONES,
  SERIES_OPCIONES,
  TECNICAS,
  TECNICA_DESC,
  TECNICA_LABEL,
  type Ejercicio,
  type Molestia,
  type Tecnica,
} from "@/lib/rutina/tipos";

const campoCls =
  "h-11 rounded-[10px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink";
import { editarItem, editarTecnica, sustituirEjercicio } from "./actions";

export type ItemEditable = {
  id: string;
  series: number;
  repeticiones: string;
  nota: string;
  tecnica: Tecnica | null;
  ejercicio: Ejercicio | null;
};

export type DiaEditable = {
  numero: number;
  titulo: string;
  items: ItemEditable[];
};

/** free-exercise-db trae 2 cuadros por ejercicio (…/0.jpg y …/1.jpg). */
function frameAlterno(url: string): string | null {
  if (/\/0\.jpg$/i.test(url)) return url.replace(/\/0\.jpg$/i, "/1.jpg");
  return null;
}

function usePrefiereMenosMovimiento() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** Crossfade entre los dos cuadros (en vez de cortar el src en seco). */
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
  onError: () => void;
  alt?: string;
}) {
  const alt = frameAlterno(url);
  const [mostrarAlt, setMostrarAlt] = useState(false);

  useEffect(() => {
    if (!activo || !alt) return;
    const id = setInterval(() => setMostrarAlt((v) => !v), 1800);
    return () => clearInterval(id);
  }, [activo, alt]);

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={altText}
        loading="lazy"
        decoding="async"
        onError={onError}
        className={`${className} absolute inset-0 transition-opacity duration-500 ${mostrarAlt ? "opacity-0" : "opacity-100"}`}
      />
      {alt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${className} absolute inset-0 transition-opacity duration-500 ${mostrarAlt ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

function Glifo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8v8M3 10v4M18 8v8M21 10v4M7 12h10" />
    </svg>
  );
}

function ExThumb({
  ej,
  onOpen,
}: {
  ej: Ejercicio | null;
  onOpen: () => void;
}) {
  const reduce = usePrefiereMenosMovimiento();
  const [err, setErr] = useState(false);
  const url = ej?.imagen_url ?? null;

  if (!url || err) {
    return (
      <div
        className="grid size-[68px] shrink-0 place-items-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft"
        aria-hidden
      >
        <Glifo className="size-6" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver ${ej?.nombre ?? "ejercicio"} en grande`}
      className="group relative size-[68px] shrink-0 overflow-hidden rounded-[10px] border border-rule bg-paper-2 transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
    >
      <ImagenAnimada
        url={url}
        activo={!reduce && !err}
        onError={() => setErr(true)}
        className="h-full w-full object-contain p-1"
      />
    </button>
  );
}

function VisorEjercicio({
  ej,
  onClose,
}: {
  ej: Ejercicio;
  onClose: () => void;
}) {
  const reduce = usePrefiereMenosMovimiento();
  const [err, setErr] = useState(false);
  const url = ej.imagen_url ?? null;

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ej.nombre}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight">{ej.nombre}</h3>
            {ej.grupo_muscular ? (
              <span className="mt-0.5 inline-block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                {GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-[6px] text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] border border-rule bg-paper-2">
          {url && !err ? (
            <ImagenAnimada
              url={url}
              activo={!reduce && !err}
              onError={() => setErr(true)}
              alt={ej.nombre}
              className="h-full w-full object-contain"
            />
          ) : (
            <Glifo className="size-10 text-ink-soft" />
          )}
        </div>

        {ej.descripcion ? (
          <p className="mt-3 text-[13px] leading-snug text-ink-soft">
            {ej.descripcion}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RutinaEditor({
  dias,
  ejercicios,
  mostrarTecnica = false,
}: {
  dias: DiaEditable[];
  ejercicios: Ejercicio[];
  mostrarTecnica?: boolean;
}) {
  const [visor, setVisor] = useState<Ejercicio | null>(null);
  const [activo, setActivo] = useState(dias[0]?.numero ?? 1);
  // Series guardadas en caliente: el tiempo estimado se recalcula sin recargar.
  const [seriesGuardadas, setSeriesGuardadas] = useState<Record<string, number>>(
    {},
  );
  // Progreso de series completadas hoy (guardado en memoria local de la sesión por ejercicio)
  const [setsCompletados, setSetsCompletados] = useState<Record<string, number[]>>({});

  function toggleSet(itemId: string, setIndex: number) {
    setSetsCompletados((prev) => {
      const actuales = prev[itemId] ?? [];
      const existe = actuales.includes(setIndex);
      const nuevos = existe
        ? actuales.filter((s) => s !== setIndex)
        : [...actuales, setIndex];
      return { ...prev, [itemId]: nuevos };
    });
  }

  const multi = dias.length > 1;
  const visibles = multi ? dias.filter((d) => d.numero === activo) : dias;
  return (
    <div className="space-y-6">
      {multi ? (
        <DiaTabs dias={dias} activo={activo} onSelect={setActivo} />
      ) : null}
      <div key={activo} className="stagger space-y-8">
        {visibles.map((dia) => {
          const totalSeries = dia.items.reduce(
            (acc, it) => acc + (seriesGuardadas[it.id] ?? it.series),
            0,
          );
          const tiempoMin = Math.round(totalSeries * 2.2);

          // Contar series completadas del día actual
          const seriesHechas = dia.items.reduce((acc, it) => {
            const hechas = (setsCompletados[it.id] ?? []).filter(
              (s) => s < (seriesGuardadas[it.id] ?? it.series),
            ).length;
            return acc + hechas;
          }, 0);

          const pct = totalSeries > 0 ? Math.round((seriesHechas / totalSeries) * 100) : 0;

          // Estimación de volumen de carga basado en las series
          const volumenKilos = totalSeries * 140;

          const musculos = [
            ...new Set(
              dia.items.map(
                (i) => GRUPO_MUSCULAR_LABEL[i.ejercicio?.grupo_muscular ?? ""],
              ),
            ),
          ]
            .filter(Boolean)
            .join(" · ");

          // Circunferencia del anillo SVG (radio 23 -> 2 * PI * 23 = ~144.5)
          const strokeCirc = 144.5;
          const strokeOffset = strokeCirc - (strokeCirc * pct) / 100;

          return (
            <section key={dia.numero}>
              {/* Hero Card: Resumen del Día y Progreso de Sesión */}
              <div className="relative overflow-hidden rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-[5px] bg-[color:var(--accent-glow)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                        Sesión Activa
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        {dia.items.length} ejercicios
                      </span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-ink">
                      {dia.titulo}
                    </h2>
                    {musculos ? (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {musculos}
                      </p>
                    ) : null}
                  </div>

                  {/* Anillo de progreso circular */}
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
                        strokeDasharray={strokeCirc}
                        strokeDashoffset={strokeOffset}
                        className="text-accent transition-[stroke-dashoffset] duration-500 [transition-timing-function:var(--ease-out)]"
                      />
                    </svg>
                    <span
                      className="absolute inset-0 flex items-center justify-center text-xs font-bold text-ink"
                      style={{ fontFamily: "var(--font-hero)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Grilla de Métricas Técnicas */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-rule pt-3">
                  <div>
                    <div
                      className="text-[15px] font-bold leading-tight text-ink"
                      style={{ fontFamily: "var(--font-hero)" }}
                    >
                      {seriesHechas}/{totalSeries}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                      Series
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[15px] font-bold leading-tight text-ink"
                      style={{ fontFamily: "var(--font-hero)" }}
                    >
                      ~{tiempoMin}m
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                      Duración
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-[15px] font-bold leading-tight text-ink"
                      style={{ fontFamily: "var(--font-hero)" }}
                    >
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
                    <span
                      className="font-bold text-ink"
                      style={{ fontFamily: "var(--font-hero)" }}
                    >
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

              {/* Lista de ejercicios con nuevo card style Obsidian */}
              <div className="mt-5 pb-32 md:pb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                    Ejercicios del día
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    Tildá cada serie al terminar
                  </span>
                </div>
                <ul className="stagger-in divide-y divide-rule overflow-hidden rounded-[16px] border border-rule bg-paper-2 shadow-sm">
                  {dia.items.map((item, i) => (
                    <ItemFila
                      key={item.id}
                      indice={i + 1}
                      item={item}
                      ejercicios={ejercicios}
                      mostrarTecnica={mostrarTecnica}
                      onVer={setVisor}
                      setsCompletados={setsCompletados[item.id] ?? []}
                      onToggleSet={(idx) => toggleSet(item.id, idx)}
                      onSeriesGuardadas={(n) =>
                        setSeriesGuardadas((p) => ({ ...p, [item.id]: n }))
                      }
                    />
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
      {visor ? (
        <VisorEjercicio ej={visor} onClose={() => setVisor(null)} />
      ) : null}
    </div>
  );
}

/** Selector de días: pestañas Obsidian con esquinas redondeadas 12px */
function DiaTabs({
  dias,
  activo,
  onSelect,
}: {
  dias: DiaEditable[];
  activo: number;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {dias.map((d) => {
        const on = d.numero === activo;
        return (
          <button
            key={d.numero}
            type="button"
            onClick={() => onSelect(d.numero)}
            aria-pressed={on}
            className={`flex-1 rounded-[12px] border px-3 py-2.5 text-xs font-semibold transition-[transform,color,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
              on
                ? "border-accent bg-accent text-accent-ink shadow-sm"
                : "border-rule bg-paper-2 text-ink hover:border-ink/40"
            }`}
          >
            {(() => {
              const m = d.titulo.match(/d[ií]a\s*(\d+)/i);
              return m ? `Día ${m[1]}` : `Día ${d.numero}`;
            })()}
          </button>
        );
      })}
    </div>
  );
}

function ItemFila({
  item,
  indice,
  ejercicios,
  mostrarTecnica,
  onVer,
  onSeriesGuardadas,
  setsCompletados,
  onToggleSet,
}: {
  item: ItemEditable;
  indice: number;
  ejercicios: Ejercicio[];
  mostrarTecnica: boolean;
  onVer: (ej: Ejercicio) => void;
  onSeriesGuardadas: (series: number) => void;
  setsCompletados: number[];
  onToggleSet: (setIndex: number) => void;
}) {
  const [series, setSeries] = useState(String(item.series));
  const [reps, setReps] = useState(item.repeticiones);
  const [tecnica, setTecnica] = useState<Tecnica>(item.tecnica ?? "ninguna");
  const [ej, setEj] = useState(item.ejercicio);
  const [abrirCambio, setAbrirCambio] = useState(false);
  const [molestias, setMolestias] = useState<Molestia[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty =
    series !== String(item.series) || reps.trim() !== item.repeticiones;

  function flash(t: string) {
    setMsg(t);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 1800);
  }

  function guardar() {
    startTransition(async () => {
      const r = await editarItem(item.id, {
        series: Number(series) || item.series,
        repeticiones: reps,
        nota: item.nota,
      });
      flash(r.error ?? "Guardado ✓");
      if (!r.error) {
        item.series = Number(series) || item.series;
        item.repeticiones = reps.trim() || item.repeticiones;
        onSeriesGuardadas(item.series);
      }
    });
  }

  function cambiar(nuevo: Ejercicio) {
    startTransition(async () => {
      const r = await sustituirEjercicio(item.id, nuevo.id);
      if (r.error) {
        flash(r.error);
        return;
      }
      setEj(nuevo);
      setAbrirCambio(false);
      flash("Ejercicio cambiado ✓");
    });
  }

  function cambiarTecnica(nueva: Tecnica) {
    const previa = tecnica;
    setTecnica(nueva);
    startTransition(async () => {
      const r = await editarTecnica(item.id, nueva);
      if (r.error) {
        setTecnica(previa);
        flash(r.error);
        return;
      }
      item.tecnica = nueva === "ninguna" ? null : nueva;
      flash("Técnica actualizada ✓");
    });
  }

  const baseAlt = ej ? ejerciciosSimilares(ej, ejercicios, 12) : [];
  const alternativas = (
    molestias.length
      ? baseAlt.filter((a) => !estaBloqueado(a, molestias))
      : baseAlt
  ).slice(0, 6);

  // Menús cerrados: si el valor guardado no está en la lista, lo agregamos
  // como primera opción para no perderlo.
  const seriesOpts = (SERIES_OPCIONES as readonly number[]).map(String);
  const repsOpts = (REPS_OPCIONES as readonly string[]).slice();
  if (!seriesOpts.includes(series)) seriesOpts.unshift(series);
  if (!repsOpts.includes(reps)) repsOpts.unshift(reps);

  const numSeries = Number(series) || item.series;

  return (
    <li className="p-4 transition-colors duration-150">
      <div className="flex items-start gap-3">
        <ExThumb ej={ej} onOpen={() => ej && onVer(ej)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="shrink-0 text-[11px] font-[700] leading-none text-accent"
                  style={{ fontFamily: "var(--font-hero)" }}
                  aria-hidden
                >
                  {String(indice).padStart(2, "0")}
                </span>
                <p className="min-w-0 font-display text-[15px] font-bold leading-tight text-ink">
                  {ej?.nombre ?? "Ejercicio"}
                </p>
              </div>
              {ej?.grupo_muscular ? (
                <span className="mt-1 inline-block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                  {GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setAbrirCambio((v) => !v)}
              aria-expanded={abrirCambio}
              aria-label={
                abrirCambio
                  ? "Cerrar alternativas"
                  : "No conozco este ejercicio o me molesta"
              }
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
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
                {abrirCambio ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <>
                    <path d="M8 3 4 7l4 4" />
                    <path d="M4 7h16" />
                    <path d="m16 21 4-4-4-4" />
                    <path d="M20 17H4" />
                  </>
                )}
              </svg>
            </button>
          </div>

          {/* Prescripción: el dato dominante de la card con JetBrains Mono */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft">
              <b
                className="font-[700] text-ink"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {series}
              </b>
              series
            </span>
            <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft">
              <b
                className="font-[700] text-ink"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {reps.replace("–", "-")}
              </b>
              reps
            </span>
            {item.tecnica ? (
              <span className="inline-flex items-center rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                {TECNICA_LABEL[item.tecnica]}
              </span>
            ) : null}
          </div>

          {/* Tracker táctil de series de hoy (mínimo 44x44px por botón táctil §3 WCAG) */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-rule bg-paper p-2">
            <span className="text-[11px] font-semibold text-ink-soft">
              Series de hoy:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: Math.min(numSeries, 8) }).map((_, sIdx) => {
                const hecho = setsCompletados.includes(sIdx);
                return (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => onToggleSet(sIdx)}
                    aria-label={`Serie ${sIdx + 1} de ${numSeries} ${hecho ? "completada" : "pendiente"}`}
                    className={`grid size-11 min-w-[44px] place-items-center rounded-[10px] border text-xs font-bold transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                      hecho
                        ? "border-accent bg-accent text-accent-ink shadow-sm"
                        : "border-rule bg-paper-2 text-ink-soft hover:border-ink/40"
                    }`}
                    style={{ fontFamily: "var(--font-hero)" }}
                  >
                    {hecho ? "✓" : sIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {ej?.descripcion ? (
            <p className="mt-2 text-xs leading-snug text-ink-soft line-clamp-2">
              {ej.descripcion}
            </p>
          ) : null}

          <details className="group mt-2">
            <summary className="inline-flex w-fit cursor-pointer select-none list-none items-center gap-1 rounded-[8px] border border-rule px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <span className="group-open:hidden">Ajustar plan</span>
              <span className="hidden group-open:inline">Listo</span>
            </summary>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[11px] text-ink-soft mb-1">Series</span>
                <select
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  className={`${campoCls} w-16 px-2 text-center`}
                >
                  {seriesOpts.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <span className="pb-3 text-ink-soft">×</span>
              <label className="block">
                <span className="block text-[11px] text-ink-soft mb-1">Reps</span>
                <select
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className={`${campoCls} w-24 px-2`}
                >
                  {repsOpts.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              {dirty ? (
                <button
                  type="button"
                  onClick={guardar}
                  disabled={pending}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] bg-accent text-accent-ink text-sm font-bold transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50 shadow-sm"
                >
                  {pending ? (
                    <>
                      <Spinner />
                      Guardando…
                    </>
                  ) : (
                    "Guardar"
                  )}
                </button>
              ) : null}
              {msg ? (
                <span className="pb-3 text-xs text-ok animate-fade-in font-medium">{msg}</span>
              ) : null}
            </div>
          </details>

          {mostrarTecnica ? (
            <div className="mt-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink-soft">
                  Técnica
                </span>
                <select
                  value={tecnica}
                  onChange={(e) => cambiarTecnica(e.target.value as Tecnica)}
                  disabled={pending}
                  className={`${campoCls} w-full max-w-[16rem] px-2 disabled:opacity-50`}
                >
                  {TECNICAS.map((t) => (
                    <option key={t} value={t}>
                      {TECNICA_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              {tecnica !== "ninguna" ? (
                <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                  {TECNICA_DESC[tecnica]}
                </p>
              ) : null}
            </div>
          ) : null}

          {item.nota ? (
            <p className="mt-2 text-[11px] text-ink-soft">{item.nota}</p>
          ) : null}

          {abrirCambio ? (
            <div className="mt-3 rounded-[12px] border border-rule bg-paper p-3 animate-fade-in">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MOLESTIAS.map((m) => {
                  const on = molestias.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setMolestias((p) =>
                          on ? p.filter((x) => x !== m) : [...p, m],
                        )
                      }
                      className={`h-11 rounded-[10px] border px-3 text-[11px] font-semibold transition-colors ${
                        on
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-rule text-ink-soft hover:border-ink/40"
                      }`}
                    >
                      {MOLESTIA_LABEL[m]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-soft mb-2">
                Marcá una molestia para descartar variantes, o cambialo por uno equivalente:
              </p>
              {alternativas.length === 0 ? (
                <p className="text-xs text-ink-soft">Sin alternativas para este grupo.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {alternativas.map((alt) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => cambiar(alt)}
                      disabled={pending}
                      className="h-11 px-3 rounded-[10px] border border-rule bg-paper-2 text-sm font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
                    >
                      {alt.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
