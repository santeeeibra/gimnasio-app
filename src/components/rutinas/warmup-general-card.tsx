"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  Check,
  Flame,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SesionWarmupResult } from "@/lib/rutinas/warmup-engine";
import {
  hapticoWarmupExpand,
  hapticoWarmupTick,
  hapticoSerieCompletada,
} from "@/lib/ui/hapticos";

interface WarmupGeneralCardProps {
  warmup: SesionWarmupResult;
}

const GRUPO_TITULO: Record<string, string> = {
  pecho: "Empuje · Pecho y Hombros",
  espalda: "Tracción · Espalda y Dorsales",
  cuadriceps: "Cadena Anterior · Cuádriceps",
  isquios: "Cadena Posterior · Isquiotibiales",
  gluteos: "Cadena Posterior · Glúteos",
  hombros: "Empuje · Deltoides",
  biceps: "Tracción · Bíceps",
  triceps: "Empuje · Tríceps",
  gemelos: "Tren Inferior · Gemelos y Tobillos",
  core: "Estabilidad Central · Core y Columna",
};

export function WarmupGeneralCard({ warmup }: WarmupGeneralCardProps) {
  const [expandido, setExpandido] = useState(false);
  const [completados, setCompletados] = useState<Record<string, boolean>>({});

  const totalMovilidad = warmup.ejerciciosMovilidad.length;
  const listosCount = warmup.ejerciciosMovilidad.filter(
    (ej) => completados[ej.id]
  ).length;
  const todoListo = totalMovilidad > 0 && listosCount === totalMovilidad;

  const handleToggleExpandir = () => {
    const proximo = !expandido;
    setExpandido(proximo);
    hapticoWarmupExpand(proximo);
  };

  const handleToggleEjercicio = (id: string) => {
    const yaEstaba = Boolean(completados[id]);
    const nuevoEstado = { ...completados, [id]: !yaEstaba };
    setCompletados(nuevoEstado);

    if (!yaEstaba) {
      hapticoWarmupTick();
      const nuevoTotal = warmup.ejerciciosMovilidad.filter(
        (ej) => nuevoEstado[ej.id]
      ).length;
      if (nuevoTotal === totalMovilidad) {
        setTimeout(() => {
          hapticoSerieCompletada();
        }, 120);
      }
    }
  };

  const tituloGrupo =
    GRUPO_TITULO[warmup.grupoPrincipal] ??
    `Activación · ${warmup.grupoPrincipal.charAt(0).toUpperCase() + warmup.grupoPrincipal.slice(1)}`;

  return (
    <aside
      aria-label="Calentamiento general y movilidad previa"
      className="relative overflow-hidden rounded-[16px] border border-accent/25 bg-paper-2 shadow-sm transition-all duration-300"
    >
      {/* Luz ambiental sutil estilo Liquid Glass / Apple */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-accent/10 blur-2xl transition-opacity duration-500"
        style={{ opacity: expandido ? 0.35 : 0.15 }}
      />

      {/* Header Botón Colapsable (Touch target ergonómico >= 44px) */}
      <button
        type="button"
        onClick={handleToggleExpandir}
        className="flex w-full items-center justify-between gap-3 p-3.5 text-left transition-colors active:bg-paper/60"
        aria-expanded={expandido}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Icono con aura de pulso */}
          <div className="relative size-10 shrink-0 rounded-[12px] bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shadow-sm">
            {todoListo ? (
              <Check className="size-5 stroke-[2.5] text-accent animate-in zoom-in-50 duration-200" />
            ) : (
              <Activity className="size-5 stroke-[2.2] animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                Activación Previa
              </span>
              <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-ink-soft border border-rule">
                ⏱️ {warmup.duracionEstimadaTotal}
              </span>
            </div>
            <h3
              className="truncate text-[14px] font-bold text-ink leading-tight mt-0.5"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              {tituloGrupo}
            </h3>
          </div>
        </div>

        {/* Badges de estado + Chevron rotatorio 60fps */}
        <div className="flex items-center gap-2 shrink-0">
          {totalMovilidad > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-all ${
                todoListo
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-paper text-ink-soft border border-rule"
              }`}
              style={{ fontFamily: "var(--font-hero)" }}
            >
              {todoListo ? "Listo ✓" : `${listosCount}/${totalMovilidad}`}
            </span>
          )}

          <div
            className={`size-7 rounded-full flex items-center justify-center bg-paper border border-rule text-ink-soft transition-transform duration-300 [transition-timing-function:var(--ease-out)] ${
              expandido ? "rotate-180 text-ink bg-paper-2" : "rotate-0"
            }`}
          >
            <ChevronDown className="size-4" />
          </div>
        </div>
      </button>

      {/* Contenedor Acordeón CSS Grid (GPU 60fps sin layout thrashing) */}
      <div
        className="grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out)]"
        style={{
          gridTemplateRows: expandido ? "1fr" : "0fr",
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-rule/80 px-3.5 pb-4 pt-3 space-y-3">
            {/* Directriz Científica (Cero fatiga, lejos de RIR) */}
            <div className="flex items-start gap-2.5 rounded-[12px] bg-paper p-2.5 border border-rule text-[11px] text-ink-soft leading-relaxed">
              <Zap className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <b className="text-ink font-semibold">Cero fatiga (lejos de RIR):</b>{" "}
                Lubrica articulaciones y prepara la conexión neuromuscular previa a las
                series efectivas. No uses cargas externas.
              </span>
            </div>

            {/* Aviso de sustitución biomecánica por molestia si aplica */}
            {warmup.avisoMolestiaAplicado && (
              <div className="flex items-start gap-2 rounded-[12px] bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300 leading-snug">
                <ShieldCheck className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{warmup.avisoMolestiaAplicado}</span>
              </div>
            )}

            {/* Política de Cardio según objetivo */}
            {warmup.cardio.permitido && warmup.cardio.sugerencia ? (
              <div className="rounded-[12px] border border-rule bg-paper/50 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                  <Flame className="size-3.5 text-accent" />
                  <span>Cardio Previo (Opcional · {warmup.cardio.tiempoMinutos ?? 3} min)</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft leading-snug">
                  {warmup.cardio.sugerencia}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-[10px] bg-paper/40 px-2.5 py-1.5 text-[11px] text-ink-soft">
                <span className="size-1.5 rounded-full bg-accent/60 shrink-0" />
                <span>
                  <b>Cardio omitido:</b> En tu objetivo actual, el cardio previo resta glucógeno necesario para las series pesadas.
                </span>
              </div>
            )}

            {/* Lista interactiva de ejercicios de movilidad */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft px-1">
                Movimientos de activación ({totalMovilidad})
              </span>

              {warmup.ejerciciosMovilidad.map((ej, index) => {
                const hecho = Boolean(completados[ej.id]);

                return (
                  <button
                    key={ej.id}
                    type="button"
                    onClick={() => handleToggleEjercicio(ej.id)}
                    className={`group flex w-full items-start gap-3 rounded-[12px] border p-2.5 text-left transition-all duration-200 active:scale-[0.99] ${
                      hecho
                        ? "border-accent/30 bg-accent/[0.04]"
                        : "border-rule bg-paper hover:border-rule/80"
                    }`}
                  >
                    {/* Checkbox táctil circular con respuesta visual háptica */}
                    <div
                      className={`relative mt-0.5 size-5 shrink-0 rounded-full border flex items-center justify-center transition-all duration-200 ${
                        hecho
                          ? "border-accent bg-accent text-black scale-105 shadow-[0_0_8px_rgba(16,231,160,0.4)]"
                          : "border-ink-soft/40 bg-paper-2 text-transparent group-hover:border-ink-soft"
                      }`}
                    >
                      <Check className={`size-3 stroke-[3] ${hecho ? "opacity-100" : "opacity-0"}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <span
                          className={`text-[13px] font-bold leading-snug transition-colors ${
                            hecho ? "text-ink line-through opacity-70" : "text-ink"
                          }`}
                        >
                          {index + 1}. {ej.nombre}
                        </span>
                        <span className="rounded-[5px] bg-paper-2 px-1.5 py-0.5 text-[10px] font-semibold text-accent border border-accent/20 shrink-0">
                          {ej.repeticionesOTiempo}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">
                        {ej.nota}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Barra de cierre cuando todo está completado */}
            {todoListo && (
              <div className="mt-3 flex items-center justify-between rounded-[12px] bg-accent/15 border border-accent/30 px-3 py-2 text-[12px] font-bold text-accent animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4" />
                  ¡Articulaciones listas para entrenar!
                </span>
                <button
                  type="button"
                  onClick={handleToggleExpandir}
                  className="rounded-[8px] bg-accent px-2.5 py-1 text-[11px] font-extrabold text-black active:scale-95 transition-transform"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
