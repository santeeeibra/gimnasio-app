"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ejerciciosSimilares, estaBloqueado } from "@/lib/rutina/motor";
import { obtenerClasificacionEjercicio } from "@/lib/rutina/clasificacion-muscular";
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
  NIVEL_LABEL,
  type Ejercicio,
  type Molestia,
  type Nivel,
  type Tecnica,
} from "@/lib/rutina/tipos";

const campoCls =
  "h-11 rounded-[10px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink";
import { editarItem, editarTecnica, sustituirEjercicio } from "./actions";
import { StickyProgresoDia } from "@/components/rutinas/sticky-progreso-dia";
import { LogroDiaCompletado } from "@/components/rutinas/logro-dia-completado";
import { BotonPedirAyuda } from "@/components/rutinas/boton-pedir-ayuda";
import { PulpoAsistenteChat } from "@/components/mi/pulpo-asistente-chat";
import { Pulpo } from "@/components/mascota/pulpo";
import { Sparkles } from "lucide-react";
import { DialVerticalProgreso } from "@/components/progreso/dial-vertical-progreso";
import { HistorialEjercicio } from "@/components/progreso/historial-ejercicio";
import { EquipamientoSugerido } from "@/components/monetizacion/equipamiento-sugerido";
import { PanelDropSet } from "@/components/progreso/panel-dropset";
import {
  CalculadoraDiscosModal,
  PillCalculadoraDiscos,
} from "@/components/rutinas/calculadora-discos";
import {
  ModalRampaCalentamiento,
  PillRampaCalentamiento,
} from "@/components/rutinas/modal-rampa-calentamiento";
import { useWakeLock } from "@/lib/ui/use-wake-lock";
import { Focus, Sun } from "lucide-react";
import type { DropPaso } from "@/lib/progreso/tipos";
import type { ColoresImagen } from "@/lib/logros/imagen";
import {
  hapticoDial,
  hapticoExito,
  hapticoImpactoSuave,
  hapticoSeleccion,
} from "@/lib/ui/hapticos";
import {
  guardarProgresoCliente,
  guardarProgresoSocio,
  obtenerProgresoCliente,
  obtenerProgresoSocio,
} from "@/lib/progreso/actions";

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

export function extraerSegundosDescanso(nota?: string): number {
  if (!nota) return 60;
  if (nota.includes("35s")) return 35;
  if (nota.includes("45-60") || nota.includes("45–60")) return 60;
  if (nota.includes("60-90") || nota.includes("60–90")) return 60;
  if (nota.includes("90-120") || nota.includes("90–120")) return 90;
  if (nota.includes("2-3 min") || nota.includes("2–3 min")) return 120;
  return 60;
}

/** free-exercise-db trae 2 cuadros por ejercicio (…/0.jpg y …/1.jpg). */
function frameAlterno(url: string): string | null {
  if (/\/0\.jpg$/i.test(url)) return url.replace(/\/0\.jpg$/i, "/1.jpg");
  return null;
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
    // Pre-cargar el cuadro alternativo para que Safari en iOS no lo postergue
    if (typeof window !== "undefined") {
      const img = new Image();
      img.src = alt;
    }
    const id = setInterval(() => setMostrarAlt((v) => !v), 850);
    return () => clearInterval(id);
  }, [activo, alt]);

  return (
    <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={altText}
        decoding="async"
        onError={onError}
        className={`${className} absolute inset-0 m-auto max-h-full max-w-full object-contain object-center transition-opacity duration-200 [transition-timing-function:var(--ease-out)] ${mostrarAlt ? "opacity-0" : "opacity-100"}`}
      />
      {alt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt}
          alt=""
          decoding="async"
          className={`${className} absolute inset-0 m-auto max-h-full max-w-full object-contain object-center transition-opacity duration-200 [transition-timing-function:var(--ease-out)] ${mostrarAlt ? "opacity-100" : "opacity-0"}`}
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
      className="group relative size-[68px] shrink-0 overflow-hidden rounded-[10px] border border-rule bg-white shadow-xs transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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
  ej: Ejercicio;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [err, setErr] = useState(false);
  const url = ej.imagen_url ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    const scrollOrig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = scrollOrig;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ej.nombre}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--scrim)] p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[16px] border border-rule bg-paper p-4 shadow-2xl animate-scale-in"
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
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid aspect-square w-full place-items-center overflow-hidden rounded-[12px] border border-rule bg-white shadow-xs">
          {url && !err ? (
            <ImagenAnimada
              url={url}
              activo={!err}
              onError={() => setErr(true)}
              alt={ej.nombre}
              className="h-full w-full object-contain object-center p-3"
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

        {/* Recomendación de equipamiento con monetización pasiva */}
        <div className="mt-4">
          <EquipamientoSugerido ejercicio={ej} />
        </div>
      </div>
    </div>,
    document.body
  );
}

export function RutinaEditor({
  dias,
  ejercicios,
  mostrarTecnica = false,
  clienteId,
  creadoPor,
  gimnasioNombre,
  logoUrl,
  colores,
  esIndividual = false,
}: {
  dias: DiaEditable[];
  ejercicios: Ejercicio[];
  mostrarTecnica?: boolean;
  clienteId?: string;
  creadoPor?: 'cliente' | 'dueno';
  /** Cuenta personal: no hay gimnasio a quien pedirle ayuda. */
  esIndividual?: boolean;
  /** Para el <CartelLogro> de récord (sólo se pasa en la vista del alumno). */
  gimnasioNombre?: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
}) {
  const [visor, setVisor] = useState<Ejercicio | null>(null);
  const [activo, setActivo] = useState(dias[0]?.numero ?? 1);
  const [logroAbierto, setLogroAbierto] = useState(false);
  const logroMostradoRef = useRef<Record<number, boolean>>({});

  // Modo Zen / Foco: pantalla siempre encendida durante el entrenamiento,
  // targets táctiles agrandados y navegación secundaria oculta.
  const [zenMode, setZenMode] = useState(false);
  useWakeLock(zenMode);

  function toggleZenMode() {
    if (!zenMode) {
      hapticoExito();
    } else {
      hapticoSeleccion();
    }
    setZenMode((v) => !v);
  }

  // Series guardadas en caliente: el tiempo estimado se recalcula sin recargar.
  const [seriesGuardadas, setSeriesGuardadas] = useState<Record<string, number>>(
    {},
  );

  // Progreso de series completadas hoy (persistido en localStorage por día)
  const LS_SETS_PREFIX = "gym.rutina-sets.v1";
  const LS_GUIA_VISTA_KEY = "gym.guia-serie.vista";
  const [setsCompletados, setSetsCompletados] = useState<Record<string, number[]>>({});
  const [guiaVista, setGuiaVista] = useState<boolean>(true);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(`${LS_SETS_PREFIX}.${activo}`);
      if (guardado) {
        setSetsCompletados(JSON.parse(guardado));
      } else {
        setSetsCompletados({});
      }
    } catch {
      /* ignore storage issue */
    }
  }, [activo]);

  useEffect(() => {
    try {
      const vista = localStorage.getItem(LS_GUIA_VISTA_KEY);
      if (!vista) {
        setGuiaVista(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function descartarGuia() {
    setGuiaVista(true);
    try {
      localStorage.setItem(LS_GUIA_VISTA_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  function toggleSet(itemId: string, setIndex: number) {
    if (!guiaVista) descartarGuia();
    setSetsCompletados((prev) => {
      const actuales = prev[itemId] ?? [];
      const existe = actuales.includes(setIndex);
      const nuevos = existe
        ? actuales.filter((s) => s !== setIndex)
        : [...actuales, setIndex];
      const next = { ...prev, [itemId]: nuevos };
      try {
        localStorage.setItem(`${LS_SETS_PREFIX}.${activo}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const multi = dias.length > 1;
  const visibles = multi ? dias.filter((d) => d.numero === activo) : dias;
  const diaActivo = visibles[0] ?? dias[0];

  const totalSeriesActivo = diaActivo?.items.reduce(
    (acc, it) => acc + (seriesGuardadas[it.id] ?? it.series),
    0,
  ) ?? 0;

  const seriesHechasActivo = diaActivo?.items.reduce((acc, it) => {
    const hechas = (setsCompletados[it.id] ?? []).filter(
      (s) => s < (seriesGuardadas[it.id] ?? it.series),
    ).length;
    return acc + hechas;
  }, 0) ?? 0;

  const pctActivo = totalSeriesActivo > 0
    ? Math.round((seriesHechasActivo / totalSeriesActivo) * 100)
    : 0;

  const volumenKilosActivo = totalSeriesActivo * 140;
  const tiempoMinActivo = Math.round(totalSeriesActivo * 2.2);

  // Disparar celebración cuando se llega al 100%
  useEffect(() => {
    if (totalSeriesActivo > 0 && seriesHechasActivo === totalSeriesActivo) {
      if (!logroMostradoRef.current[activo]) {
        logroMostradoRef.current[activo] = true;
        setLogroAbierto(true);
      }
    }
  }, [seriesHechasActivo, totalSeriesActivo, activo]);

  return (
    <div className="space-y-6">
      {/* Barra de progreso Sticky fija que acompaña el scroll */}
      {diaActivo && (
        <StickyProgresoDia
          titulo={diaActivo.titulo}
          seriesHechas={seriesHechasActivo}
          totalSeries={totalSeriesActivo}
          pct={pctActivo}
          targetRefId="hero-resumen-dia"
        />
      )}

      {/* Modal / Ceremonia de logro al completar el 100% de la sesión */}
      {diaActivo && (
        <LogroDiaCompletado
          abierto={logroAbierto}
          diaTitulo={diaActivo.titulo}
          totalSeries={totalSeriesActivo}
          volumenKilos={volumenKilosActivo}
          tiempoMin={tiempoMinActivo}
          gimnasioNombre={gimnasioNombre}
          logoUrl={logoUrl}
          colores={colores}
          onClose={() => setLogroAbierto(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        {multi && !zenMode ? (
          <DiaTabs dias={dias} activo={activo} onSelect={setActivo} />
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={toggleZenMode}
          aria-pressed={zenMode}
          aria-label={zenMode ? "Desactivar Modo Foco Gym" : "Activar Modo Foco Gym (Pantalla Encendida)"}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-[transform,color,background-color,border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
            zenMode
              ? "border-accent bg-accent text-accent-ink shadow-[0_0_12px_rgba(16,231,160,0.3)]"
              : "border-rule bg-paper text-ink-soft hover:text-ink"
          }`}
        >
          {zenMode ? <Sun className="size-4 animate-spin-slow" /> : <Focus className="size-4" />}
          <span>{zenMode ? "☀️ Foco Gym Activo" : "Modo Foco Gym"}</span>
        </button>
      </div>
      {zenMode ? (
        <div className="-mt-2 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3.5 py-2 text-xs font-medium text-ink shadow-[0_0_12px_rgba(16,231,160,0.1)]">
          <Sun className="size-4 shrink-0 text-accent" />
          <span>
            <strong>Modo Foco Gym Activo:</strong> Pantalla siempre encendida · Botones XL táctiles · Sin distracciones.
          </span>
        </div>
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
              <div
                id="hero-resumen-dia"
                className="relative overflow-hidden rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative size-11 shrink-0 rounded-[12px] bg-[#0b1311] border border-volt/30 flex items-center justify-center shadow-sm overflow-hidden">
                      <Pulpo size={30} pose="kettlebell" />
                    </div>
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
                  {!guiaVista && seriesHechasActivo === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent animate-pulse">
                      <span className="size-1.5 rounded-full bg-accent" />
                      Tildá cada serie al terminar
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-soft">
                      Tildá cada serie al terminar
                    </span>
                  )}
                </div>
                <ul className="stagger-in divide-y divide-rule overflow-hidden rounded-[16px] border border-rule bg-paper-2 shadow-sm">
                  {dia.items.map((item, i) => (
                    <ItemFila
                      key={item.id}
                      indice={i + 1}
                      item={item}
                      itemsDelDia={dia.items}
                      ejercicios={ejercicios}
                      mostrarTecnica={mostrarTecnica}
                      onVer={setVisor}
                      setsCompletados={setsCompletados[item.id] ?? []}
                      onToggleSet={(idx) => toggleSet(item.id, idx)}
                      onSeriesGuardadas={(n) =>
                        setSeriesGuardadas((p) => ({ ...p, [item.id]: n }))
                      }
                      clienteId={clienteId}
                      creadoPor={creadoPor}
                      esIndividual={esIndividual}
                      gimnasioNombre={gimnasioNombre}
                      logoUrl={logoUrl}
                      colores={colores}
                      mostrarGuiaSerie={!guiaVista && seriesHechasActivo === 0 && i === 0}
                      zenMode={zenMode}
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

/** Selector de días: Segmented Control iOS ultra-moderno con pill activa y haptics */
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
    <div className="inline-flex items-center gap-1.5 rounded-full border border-rule/70 bg-paper-2/80 p-1 shadow-inner backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
      {dias.map((d) => {
        const on = d.numero === activo;
        const diaTexto = (() => {
          const m = d.titulo.match(/d[ií]a\s*(\d+)/i);
          return m ? `Día ${m[1]}` : `Día ${d.numero}`;
        })();

        return (
          <button
            key={d.numero}
            type="button"
            onClick={() => {
              hapticoSeleccion();
              onSelect(d.numero);
            }}
            aria-pressed={on}
            className={`relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all duration-200 ease-out active:scale-95 whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
              on
                ? "bg-accent text-accent-ink font-black shadow-md shadow-accent/25 ring-1 ring-accent/30"
                : "text-ink-soft hover:bg-paper-3/70 hover:text-ink"
            }`}
          >
            {on && (
              <span className="size-1.5 rounded-full bg-accent-ink animate-pulse" />
            )}
            {diaTexto}
          </button>
        );
      })}
    </div>
  );
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

  return null;
}

function ItemFila({
  item,
  indice,
  itemsDelDia = [],
  ejercicios,
  mostrarTecnica,
  onVer,
  onSeriesGuardadas,
  setsCompletados,
  onToggleSet,
  clienteId,
  creadoPor,
  esIndividual = false,
  gimnasioNombre,
  logoUrl,
  colores,
  mostrarGuiaSerie = false,
  zenMode = false,
}: {
  item: ItemEditable;
  indice: number;
  itemsDelDia?: ItemEditable[];
  ejercicios: Ejercicio[];
  mostrarTecnica: boolean;
  onVer: (ej: Ejercicio) => void;
  onSeriesGuardadas: (series: number) => void;
  setsCompletados: number[];
  onToggleSet: (setIndex: number) => void;
  clienteId?: string;
  creadoPor?: 'cliente' | 'dueno';
  esIndividual?: boolean;
  gimnasioNombre?: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
  mostrarGuiaSerie?: boolean;
  /** Modo Zen / Foco: oculta nav secundaria y agranda targets táctiles. */
  zenMode?: boolean;
}) {
  const [series, setSeries] = useState(String(item.series));
  const [reps, setReps] = useState(item.repeticiones);
  const [tecnica, setTecnica] = useState<Tecnica>(item.tecnica ?? "ninguna");
  const [ej, setEj] = useState(item.ejercicio);
  const [abrirCambio, setAbrirCambio] = useState(false);
  const panelCambioRef = useRef<HTMLDivElement>(null);
  const [molestias, setMolestias] = useState<Molestia[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmacionSolape, setConfirmacionSolape] = useState<{
    ejercicio: Ejercicio;
    ocupadoPor: { nombre: string; indice: number; porcionLabel: string };
  } | null>(null);

  const dirty =
    series !== String(item.series) || reps.trim() !== item.repeticiones;

  const targetReps = useMemo(() => {
    const nums = item.repeticiones.match(/\d+/g);
    if (!nums || nums.length === 0) return 10;
    return parseInt(nums[nums.length - 1], 10);
  }, [item.repeticiones]);

  const [mostrarEditorSeries, setMostrarEditorSeries] = useState(false);
  const [repsPorSerie, setRepsPorSerie] = useState<Record<number, number>>({});
  const [mostrarDropSet, setMostrarDropSet] = useState(false);
  const [dropsetGuardado, setDropsetGuardado] = useState<Record<number, DropPaso[]>>({});
  const [pesoActualEjercicio, setPesoActualEjercicio] = useState<number>(20);
  const [mostrarCalculadoraDiscos, setMostrarCalculadoraDiscos] = useState(false);
  const [mostrarRampaCalentamiento, setMostrarRampaCalentamiento] = useState(false);

  const tipoEquipoItem = useMemo(() => {
    const eq = (ej?.equipo || item.ejercicio?.equipo || "").toLowerCase();
    const nom = (ej?.nombre || item.ejercicio?.nombre || "").toLowerCase();
    if (
      eq === "barra" ||
      nom.includes("barra") ||
      nom.includes("prensa") ||
      nom.includes("leg press") ||
      nom.includes("hack") ||
      nom.includes("multipower") ||
      nom.includes("smith")
    ) {
      return "barra" as const;
    }
    return "otro" as const;
  }, [ej, item.ejercicio]);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(`gym.reps-sets.${item.id}`);
      if (guardado) {
        setRepsPorSerie(JSON.parse(guardado));
      }
      const guardadoDS = localStorage.getItem(`gym.dropset.${item.id}`);
      if (guardadoDS) {
        setDropsetGuardado(JSON.parse(guardadoDS));
      }
    } catch {
      /* ignore */
    }
  }, [item.id]);

  function guardarDropSetLocal(serieIdx: number, pasos: DropPaso[]) {
    setDropsetGuardado((prev) => {
      const next = { ...prev, [serieIdx]: pasos };
      try {
        localStorage.setItem(`gym.dropset.${item.id}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function cambiarRepsSerie(setIndex: number, delta: number) {
    hapticoDial();
    setRepsPorSerie((prev) => {
      const actual = prev[setIndex] ?? targetReps;
      const nuevo = Math.max(1, actual + delta);
      const next = { ...prev, [setIndex]: nuevo };
      try {
        localStorage.setItem(`gym.reps-sets.${item.id}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

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
      setConfirmacionSolape(null);
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

  // Porciones musculares ya cubiertas hoy por otros ejercicios del mismo grupo
  const porcionesOcupadas = useMemo(() => {
    const mapa = new Map<
      string,
      { nombre: string; indice: number; porcionLabel: string }
    >();
    if (!ej) return mapa;
    const clasifActual = obtenerClasificacionEjercicio(ej);

    itemsDelDia.forEach((it, idx) => {
      if (it.id !== item.id && it.ejercicio) {
        const c = obtenerClasificacionEjercicio(it.ejercicio);
        if (c.grupo === clasifActual.grupo) {
          mapa.set(c.porcionId, {
            nombre: it.ejercicio.nombre,
            indice: idx + 1,
            porcionLabel: c.label,
          });
        }
      }
    });
    return mapa;
  }, [itemsDelDia, item.id, ej]);

  const baseAlt = ej ? ejerciciosSimilares(ej, ejercicios, 16) : [];
  const alternativasFiltradas = molestias.length
    ? baseAlt.filter((a) => !estaBloqueado(a, molestias))
    : baseAlt;

  // Clasificamos cada alternativa y detectamos si solapa
  const alternativasProcesadas = useMemo(() => {
    return alternativasFiltradas
      .map((alt) => {
        const c = obtenerClasificacionEjercicio(alt);
        const solapaCon = porcionesOcupadas.get(c.porcionId);
        return {
          ejercicio: alt,
          clasif: c,
          solapaCon,
        };
      })
      .sort((a, b) => {
        // Priorizar las porciones distintas (sin solapamiento)
        if (!a.solapaCon && b.solapaCon) return -1;
        if (a.solapaCon && !b.solapaCon) return 1;
        return 0;
      })
      .slice(0, 8);
  }, [alternativasFiltradas, porcionesOcupadas]);

  function handleSeleccionarAlternativa(altItem: {
    ejercicio: Ejercicio;
    solapaCon?: { nombre: string; indice: number; porcionLabel: string };
  }) {
    if (altItem.solapaCon) {
      setConfirmacionSolape({
        ejercicio: altItem.ejercicio,
        ocupadoPor: altItem.solapaCon,
      });
      return;
    }
    cambiar(altItem.ejercicio);
  }

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
        <div className="flex flex-col items-center gap-2 shrink-0 w-[68px]">
          <ExThumb ej={ej} onOpen={() => ej && onVer(ej)} />
          {clienteId && item.ejercicio && (() => {
            const eq = (ej?.equipo || item.ejercicio.equipo || "").toLowerCase();
            const nom = (ej?.nombre || item.ejercicio.nombre || "").toLowerCase();

            let tipoEquipo: "corporal" | "barra" | "mancuerna" | "polea" | "maquina" | "otro" = "otro";
            if (
              eq === "peso_corporal" ||
              eq === "corporal" ||
              nom.includes("corporal") ||
              nom.includes("fondos") ||
              nom.includes("flexiones") ||
              nom.includes("dominadas") ||
              nom.includes("plancha")
            ) {
              tipoEquipo = "corporal";
            } else if (eq === "barra" || nom.includes("barra")) {
              tipoEquipo = "barra";
            } else if (eq === "mancuerna" || eq === "mancuernas" || nom.includes("mancuerna")) {
              tipoEquipo = "mancuerna";
            } else if (eq === "polea" || nom.includes("polea")) {
              tipoEquipo = "polea";
            } else if (
              eq === "maquina" ||
              nom.includes("maquina") ||
              nom.includes("máquina") ||
              nom.includes("prensa")
            ) {
              tipoEquipo = "maquina";
            }

            return (
              <DialVerticalProgreso
                ejercicioId={item.ejercicio.id}
                tipoEquipo={tipoEquipo}
                ejercicioNombre={ej?.nombre ?? item.ejercicio.nombre}
                repsIniciales={targetReps}
                gimnasioNombre={creadoPor === "dueno" ? undefined : gimnasioNombre}
                logoUrl={logoUrl}
                colores={creadoPor === "dueno" ? undefined : colores}
                action={
                  creadoPor === "dueno"
                    ? guardarProgresoSocio.bind(null, clienteId)
                    : guardarProgresoCliente
                }
                fetchUltimoPeso={async (eid) => {
                  const registros =
                    creadoPor === "dueno"
                      ? await obtenerProgresoSocio(clienteId, eid, 1)
                      : await obtenerProgresoCliente(eid, 1);
                  if (registros[0]?.peso) {
                    setPesoActualEjercicio(registros[0].peso);
                  }
                  return registros[0]
                    ? { peso: registros[0].peso, reps: registros[0].reps }
                    : null;
                }}
              />
            );
          })()}
        </div>

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
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {ej?.grupo_muscular ? (
                  <span className="inline-block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    {GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular}
                    {ej?.nivel ? ` · ${NIVEL_LABEL[ej.nivel as Nivel] ?? ej.nivel}` : ""}
                  </span>
                ) : null}
                <BadgeEquipo equipo={ej?.equipo} nombre={ej?.nombre} />
              </div>
            </div>
            <div className="flex items-center gap-1 -mr-1 -mt-1">
              {!esIndividual && !zenMode ? (
                <BotonPedirAyuda
                  ejercicioId={ej?.id}
                  ejercicioNombre={ej?.nombre ?? "Ejercicio"}
                  equipo={ej?.equipo}
                />
              ) : null}
              {!zenMode ? (
                <PulpoAsistenteChat
                  ejercicioId={ej?.id}
                  ejercicioNombre={ej?.nombre}
                  onSeleccionarAlternativa={cambiar}
                />
              ) : null}
              {!zenMode ? (
              <button
                type="button"
                onClick={() =>
                  setAbrirCambio((v) => {
                    const next = !v;
                    if (next) {
                      requestAnimationFrame(() => {
                        panelCambioRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      });
                    }
                    return next;
                  })
                }
                aria-expanded={abrirCambio}
                aria-label={
                  abrirCambio ? "Cerrar alternativas" : "Cambiar ejercicio"
                }
                className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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
              ) : null}
            </div>
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
            {tipoEquipoItem === "barra" ? (
              <PillCalculadoraDiscos
                onOpen={() => setMostrarCalculadoraDiscos(true)}
              />
            ) : null}
            <PillRampaCalentamiento
              onOpen={() => setMostrarRampaCalentamiento(true)}
            />
          </div>

          {mostrarRampaCalentamiento ? (
            <ModalRampaCalentamiento
              open={mostrarRampaCalentamiento}
              onClose={() => setMostrarRampaCalentamiento(false)}
              pesoObjetivo={pesoActualEjercicio}
              ejercicioNombre={ej?.nombre ?? item.ejercicio?.nombre}
            />
          ) : null}

          {mostrarCalculadoraDiscos ? (
            <CalculadoraDiscosModal
              open={mostrarCalculadoraDiscos}
              onClose={() => setMostrarCalculadoraDiscos(false)}
              pesoInicial={pesoActualEjercicio}
              ejercicioNombre={ej?.nombre ?? item.ejercicio?.nombre}
            />
          ) : null}

          {item.nota ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-[8px] border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] text-ink-soft">
              <span className="font-semibold text-accent shrink-0">💡 Guía:</span>
              <span className="truncate">{item.nota}</span>
            </div>
          ) : null}

          {/* Tracker táctil de series de hoy con editor individual */}
          <div className="mt-2.5 rounded-[10px] border border-rule bg-paper p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-ink-soft">
                  Series de hoy:
                </span>
                <button
                  type="button"
                  onClick={() => setMostrarEditorSeries((v) => !v)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium border transition-colors ${
                    mostrarEditorSeries
                      ? "bg-accent/15 border-accent text-accent"
                      : "border-rule bg-paper-2 text-ink-soft hover:text-ink hover:border-ink/30"
                  }`}
                  aria-label="Editar reps por serie individuales"
                  title="Editar reps por serie individuales"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="11"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  <span>{mostrarEditorSeries ? "Cerrar" : "Reps"}</span>
                </button>
                {item.tecnica === "dropset" && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticoImpactoSuave();
                      setMostrarDropSet((v) => !v);
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold border transition-colors ${
                      mostrarDropSet
                        ? "bg-accent text-accent-ink border-accent"
                        : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                    }`}
                    aria-label="Registrar Drop Set"
                  >
                    <span>⚡ Drop Set</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: Math.min(numSeries, 8) }).map((_, sIdx) => {
                  const hecho = setsCompletados.includes(sIdx);
                  const esObjetivoGuia = mostrarGuiaSerie && sIdx === 0 && !hecho;
                  const repsEstaSerie = repsPorSerie[sIdx] ?? targetReps;
                  const tieneRepsPersonalizadas =
                    repsPorSerie[sIdx] !== undefined &&
                    repsPorSerie[sIdx] !== targetReps;
                  const esDropSetSerie =
                    (item.tecnica === "dropset" && sIdx === numSeries - 1) ||
                    Boolean(dropsetGuardado[sIdx]);

                  return (
                    <div key={sIdx} className="relative">
                      {esObjetivoGuia ? (
                        <div
                          role="tooltip"
                          className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-[8px] bg-accent px-2 py-0.5 text-[10.5px] font-bold text-accent-ink shadow-md pointer-events-none animate-bounce flex items-center"
                        >
                          <span>Tildá al terminar</span>
                          <span
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-2 rotate-45 bg-accent"
                            aria-hidden
                          />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          if (esDropSetSerie && !hecho) {
                            // En 1 toque abre el panel de Drop Set con sugerencias
                            hapticoImpactoSuave();
                            setMostrarDropSet(true);
                            return;
                          }

                          if (!hecho) {
                            hapticoExito();
                            const segs = extraerSegundosDescanso(item.nota);
                            if (typeof window !== "undefined") {
                              window.dispatchEvent(
                                new CustomEvent("timer:iniciar", {
                                  detail: { segundos: segs },
                                }),
                              );
                            }
                          } else {
                            hapticoImpactoSuave();
                          }
                          onToggleSet(sIdx);
                        }}
                        aria-label={`Serie ${sIdx + 1} de ${numSeries} (${repsEstaSerie} reps) ${
                          esDropSetSerie ? "Drop Set " : ""
                        }${hecho ? "completada" : "pendiente"}`}
                        className={`grid place-items-center rounded-[10px] border font-bold font-mono tabular-nums transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                          zenMode ? "size-14 min-w-[56px]" : "size-11 min-w-[44px]"
                        } ${
                          hecho
                            ? "border-accent bg-accent text-accent-ink shadow-sm"
                            : esDropSetSerie
                            ? "border-accent/70 bg-accent/10 text-ink ring-1 ring-accent/40 hover:bg-accent/20"
                            : esObjetivoGuia
                            ? "border-accent bg-paper-2 text-ink ring-2 ring-accent ring-offset-2 ring-offset-paper animate-pulse"
                            : "border-rule bg-paper-2 text-ink-soft hover:border-ink/40"
                        }`}
                        style={{ fontFamily: zenMode ? undefined : "var(--font-hero)" }}
                      >
                        {hecho ? (
                          esDropSetSerie ? (
                            <div className="flex flex-col items-center leading-none">
                              <span className={zenMode ? "text-base" : "text-[11px]"}>✓</span>
                              <span className="text-[8px] font-black text-accent-ink tracking-tight">
                                ⚡DROP
                              </span>
                            </div>
                          ) : tieneRepsPersonalizadas ? (
                            <div className="flex flex-col items-center leading-none">
                              <span className={zenMode ? "text-lg" : "text-[12px]"}>✓</span>
                              <span className="text-[8.5px] font-extrabold opacity-95">
                                {repsEstaSerie}
                              </span>
                            </div>
                          ) : (
                            <span className={zenMode ? "text-xl" : "text-sm"}>✓</span>
                          )
                        ) : esDropSetSerie ? (
                          <div className="flex flex-col items-center leading-none">
                            <span className={zenMode ? "text-base" : "text-[11px]"}>{sIdx + 1}</span>
                            <span className="text-[9px] font-black text-accent leading-none">
                              ⚡
                            </span>
                          </div>
                        ) : tieneRepsPersonalizadas ? (
                          <div className="flex flex-col items-center leading-none">
                            <span className={zenMode ? "text-lg" : "text-xs"}>{sIdx + 1}</span>
                            <span className="text-[8.5px] font-bold text-accent">
                              {repsEstaSerie}
                            </span>
                          </div>
                        ) : (
                          <span className={zenMode ? "text-xl" : "text-sm"}>{sIdx + 1}</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumen de Drop Set registrado */}
            {dropsetGuardado[numSeries - 1] && (
              <div className="mt-2 flex items-center justify-between gap-1.5 rounded-[8px] border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-accent shrink-0">⚡ Drop Set:</span>
                  <span className="truncate font-semibold text-ink">
                    {dropsetGuardado[numSeries - 1]
                      .map((p) => `${p.peso}kg (${p.reps}r)`)
                      .join(" ➔ ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    hapticoImpactoSuave();
                    setMostrarDropSet(true);
                  }}
                  className="shrink-0 text-[10px] font-bold text-accent hover:underline px-1 py-0.5"
                >
                  Ajustar
                </button>
              </div>
            )}

            {/* Panel de Registro de Drop Set (desplegado con 1 toque) */}
            {mostrarDropSet && (
              <PanelDropSet
                ejercicioId={ej?.id ?? item.ejercicio?.id ?? item.id}
                ejercicioNombre={ej?.nombre ?? item.ejercicio?.nombre ?? "Ejercicio"}
                serieIndex={numSeries - 1}
                pesoBase={pesoActualEjercicio}
                repsBase={repsPorSerie[numSeries - 1] ?? targetReps}
                pasosPrevios={dropsetGuardado[numSeries - 1]}
                onCompletado={(pasos) => {
                  guardarDropSetLocal(numSeries - 1, pasos);
                  if (!setsCompletados.includes(numSeries - 1)) {
                    onToggleSet(numSeries - 1);
                  }
                  setMostrarDropSet(false);
                  const segs = extraerSegundosDescanso(item.nota);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("timer:iniciar", {
                        detail: { segundos: segs },
                      }),
                    );
                  }
                }}
                onCerrar={() => setMostrarDropSet(false)}
              />
            )}

            {/* Panel colapsable de edición de reps por serie individual */}
            {mostrarEditorSeries && (
              <div className="mt-2.5 pt-2.5 border-t border-rule/70 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[10px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
                  <span>Serie individual</span>
                  <span>Reps realizadas</span>
                </div>
                {Array.from({ length: numSeries }).map((_, sIdx) => {
                  const repsEstaSerie = repsPorSerie[sIdx] ?? targetReps;
                  const hecho = setsCompletados.includes(sIdx);
                  return (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between py-1 px-2 rounded-[8px] bg-paper-2/50 border border-rule/50"
                    >
                      <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                        <span
                          className={`size-2 rounded-full ${
                            hecho ? "bg-accent" : "bg-ink-soft/30"
                          }`}
                        />
                        Serie {sIdx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => cambiarRepsSerie(sIdx, -1)}
                          className="size-7 rounded-[6px] bg-paper border border-rule grid place-items-center text-xs font-bold text-ink hover:bg-paper-2 transition-transform active:scale-90"
                        >
                          −
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-ink tabular-nums">
                          {repsEstaSerie}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarRepsSerie(sIdx, 1)}
                          className="size-7 rounded-[6px] bg-paper border border-rule grid place-items-center text-xs font-bold text-ink hover:bg-paper-2 transition-transform active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

          {/* Historial y gráfico del ejercicio */}
          {clienteId && item.ejercicio && (
            <HistorialEjercicio
              ejercicioNombre={item.ejercicio.nombre ?? "Ejercicio"}
              fetchHistorial={async () =>
                creadoPor === "dueno"
                  ? obtenerProgresoSocio(clienteId, item.ejercicio!.id)
                  : obtenerProgresoCliente(item.ejercicio!.id)
              }
            />
          )}

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
            <div
              ref={panelCambioRef}
              className="mt-3 rounded-[12px] border border-rule bg-paper p-3 animate-fade-in"
            >
              {/* Filtro de molestias articulares con explicación clara */}
              <div className="mb-3 rounded-[10px] border border-rule/60 bg-paper-2/60 p-2.5">
                <div className="flex items-baseline justify-between gap-1.5 mb-1">
                  <span className="text-xs font-bold text-ink">
                    ¿Sentís dolor o molestia en alguna articulación?
                  </span>
                  <span className="text-[10px] text-ink-soft shrink-0">(opcional)</span>
                </div>
                <p className="text-[11px] text-ink-soft mb-2 leading-relaxed">
                  Tocá la zona para quitar variantes que fuercen esa articulación:
                </p>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`h-8 rounded-[8px] border px-2.5 text-[11px] font-semibold transition-all active:scale-95 ${
                          on
                            ? "border-accent bg-accent text-accent-ink shadow-xs"
                            : "border-rule bg-paper text-ink-soft hover:border-ink/40 hover:text-ink"
                        }`}
                      >
                        {MOLESTIA_LABEL[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {confirmacionSolape ? (
                <div className="mb-3 rounded-[12px] border border-amber-500/40 bg-amber-500/10 p-3 text-xs animate-fade-in shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-500 text-base font-bold shrink-0 mt-0.5" aria-hidden>
                      ⚠️
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-ink">
                        Posible solapamiento muscular
                      </p>
                      <p className="mt-1 text-ink-soft leading-relaxed text-[11.5px]">
                        <strong>{confirmacionSolape.ejercicio.nombre}</strong> trabaja principalmente{" "}
                        <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                          {confirmacionSolape.ocupadoPor.porcionLabel}
                        </strong>
                        , al igual que el <strong>Ejercicio #{confirmacionSolape.ocupadoPor.indice} ({confirmacionSolape.ocupadoPor.nombre})</strong> de tu rutina de hoy.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const ejElegido = confirmacionSolape.ejercicio;
                            setConfirmacionSolape(null);
                            cambiar(ejElegido);
                          }}
                          disabled={pending}
                          className="h-9 px-3 rounded-[8px] bg-accent text-accent-ink font-bold text-[11.5px] transition-transform active:scale-95 disabled:opacity-50 shadow-xs"
                        >
                          Cambiar igual
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmacionSolape(null)}
                          className="h-9 px-3 rounded-[8px] border border-rule bg-paper text-ink-soft font-semibold text-[11.5px] transition-transform active:scale-95 hover:border-ink/40"
                        >
                          Elegir otro
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <p className="text-xs font-semibold text-ink mb-2">
                Elegí una variante para sustituirlo:
              </p>
              {alternativasProcesadas.length === 0 ? (
                <p className="text-xs text-ink-soft py-2">Sin alternativas para este grupo.</p>
              ) : (
                <div className="space-y-2">
                  {alternativasProcesadas.map(({ ejercicio: alt, clasif, solapaCon }) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => handleSeleccionarAlternativa({ ejercicio: alt, solapaCon })}
                      disabled={pending}
                      className={`flex items-center gap-3 p-2.5 rounded-[12px] border text-left transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50 w-full ${
                        solapaCon
                          ? "border-rule/80 bg-paper/50 hover:border-amber-500/40 text-ink-soft"
                          : "border-rule bg-paper-2 hover:border-accent/40 text-ink"
                      }`}
                    >
                      {/* Miniatura con foto o animación para reconocer el ejercicio */}
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-[8px] border border-rule bg-white grid place-items-center">
                        {alt.imagen_url ? (
                          <ImagenAnimada
                            url={alt.imagen_url}
                            activo={true}
                            onError={() => {}}
                            alt={alt.nombre}
                            className="h-full w-full object-contain p-0.5"
                          />
                        ) : (
                          <Glifo className="size-5 text-ink-soft" />
                        )}
                      </div>

                      {/* Nombre completo sin recortar + detalles */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-[13px] leading-tight text-ink break-words">
                            {alt.nombre}
                          </span>
                          {solapaCon ? (
                            <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[4px]">
                              Solapa #{solapaCon.indice}
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded-[4px]">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <span className="mt-1 text-[11px] text-ink-soft flex items-center gap-1">
                          <span>{clasif.label}</span>
                          {alt.equipo ? (
                            <span className="text-ink-soft/70">· {alt.equipo}</span>
                          ) : null}
                        </span>
                      </div>
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
