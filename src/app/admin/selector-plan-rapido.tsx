"use client";

import { useState, useTransition } from "react";
import { Sparkles, Shield, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { cambiarPlanRapido } from "./actions";
import { hapticoSeleccion, hapticoImpactoMedio } from "@/lib/ui/hapticos";

interface SelectorPlanRapidoProps {
  gimnasioSlug: string;
  gimnasioNombre: string;
  planActualInicial: string;
}

const PLANES_CONFIG = [
  {
    nombre: "Básico" as const,
    socios: "50 socios",
    icono: Shield,
    badge: "Trial / Base",
    desc: "Bloquea Check-in QR, Cobro automático y Avisos morosos",
    color: "border-slate-500/30 hover:border-slate-400 bg-paper",
    activeColor: "border-slate-600 bg-slate-500/15 ring-2 ring-slate-400/40 text-ink",
    textColor: "text-ink-soft",
  },
  {
    nombre: "Pro" as const,
    socios: "150 socios",
    icono: Zap,
    badge: "Intermedio",
    desc: "Mayor capacidad de alumnos y gestión completa",
    color: "border-blue-500/30 hover:border-blue-400 bg-paper",
    activeColor: "border-blue-500 bg-blue-500/15 ring-2 ring-blue-400/40 text-blue-900 dark:text-blue-200",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    nombre: "Elite" as const,
    socios: "350 socios",
    icono: Sparkles,
    badge: "✦ ELITE TOTAL",
    desc: "Desbloquea Check-in autoservicio, Cobro MP Connect y Avisos",
    color: "border-[#10e7a0]/40 hover:border-[#10e7a0] bg-paper",
    activeColor: "border-[#10e7a0] bg-[#10e7a0]/15 ring-2 ring-[#10e7a0]/60 text-emerald-950 dark:text-emerald-100 shadow-[0_0_25px_rgba(16,231,160,0.25)]",
    textColor: "text-emerald-600 dark:text-[#10e7a0]",
  },
];

export function SelectorPlanRapido({
  gimnasioSlug,
  gimnasioNombre,
  planActualInicial,
}: SelectorPlanRapidoProps) {
  const [planActual, setPlanActual] = useState(planActualInicial);
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const handleCambiarPlan = (nombre: "Básico" | "Pro" | "Elite") => {
    if (nombre === planActual && !isPending) return;
    hapticoImpactoMedio();

    startTransition(async () => {
      try {
        const res = await cambiarPlanRapido(nombre, gimnasioSlug);
        if (res.ok) {
          hapticoSeleccion();
          setPlanActual(nombre);
          setMensaje({ tipo: "ok", texto: `Plan de "${gimnasioNombre}" cambiado a ${nombre}.` });
        } else {
          setMensaje({ tipo: "error", texto: res.msg });
        }
      } catch {
        setMensaje({ tipo: "error", texto: "Error al cambiar el plan." });
      }
    });
  };

  return (
    <div className="card-cut rounded-[18px] border border-rule/80 bg-paper-2/90 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Testing de Planes y Bloqueo Elite (1-Click)
            </h2>
            <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] font-bold text-ink-soft border border-rule">
              {gimnasioNombre} ({gimnasioSlug})
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Cambiá el plan en tiempo real para verificar cómo reaccionan las funciones y bloqueos visuales en la app.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft">Plan activo:</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
              planActual === "Elite"
                ? "bg-gradient-to-r from-[#10e7a0] to-[#10b981] text-black shadow-[0_0_15px_rgba(16,231,160,0.4)]"
                : planActual === "Pro"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-white"
            }`}
          >
            {planActual === "Elite" && <Sparkles className="size-3 fill-black text-black" />}
            {planActual}
          </span>
        </div>
      </div>

      {/* 3 Botones de selección */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLANES_CONFIG.map((p) => {
          const esSeleccionado = planActual === p.nombre;
          const Icon = p.icono;

          return (
            <button
              key={p.nombre}
              type="button"
              disabled={isPending}
              onClick={() => handleCambiarPlan(p.nombre)}
              className={`group relative flex flex-col justify-between rounded-[14px] border p-4 text-left transition-all duration-150 [transition-timing-function:var(--ease-spring)] active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
                esSeleccionado ? p.activeColor : p.color
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4.5 ${p.textColor}`} />
                    <span className="font-display text-base font-bold tracking-tight text-ink">
                      {p.nombre}
                    </span>
                  </div>
                  {esSeleccionado ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-ok text-paper">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-paper-2/80 px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                    {p.socios}
                  </span>
                  <span className={`text-[11px] font-bold tracking-wider uppercase ${p.textColor}`}>
                    {p.badge}
                  </span>
                </div>

                <p className="mt-2.5 text-xs text-ink-soft leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-4 border-t border-rule/50 pt-2.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink-soft group-hover:text-ink">
                  {esSeleccionado ? "Activo ahora" : "Clic para activar →"}
                </span>
                {isPending && esSeleccionado ? (
                  <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent text-ink" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {mensaje ? (
        <div
          className={`mt-4 flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-xs font-medium ${
            mensaje.tipo === "ok"
              ? "bg-ok/15 text-ok border border-ok/30"
              : "bg-danger/15 text-danger border border-danger/30"
          }`}
        >
          {mensaje.tipo === "ok" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      ) : null}

      <div className="mt-4 rounded-[12px] bg-paper/60 p-3 text-xs text-ink-soft border border-rule/50 flex items-start gap-2.5">
        <Sparkles className="size-4 shrink-0 text-emerald-500 mt-0.5" />
        <p>
          <strong>Tip de prueba rápida:</strong> Seleccioná <strong>Básico</strong> y entrá como Dueño para verificar que la pantalla de <strong>Check-in QR</strong> y <strong>Cobro Automático</strong> muestran el banner brillante de bloqueo con botón de upgrade. Luego cambiá a <strong>Elite</strong> y refrescá para ver cómo se desbloquean al 100%.
        </p>
      </div>
    </div>
  );
}
