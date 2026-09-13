"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Flame, Calculator } from "lucide-react";
import { hapticoSeleccion, hapticoImpactoSuave } from "@/lib/ui/hapticos";
import { CalculadoraDiscosModal } from "@/components/rutinas/calculadora-discos";

interface PasoRampa {
  id: string;
  etiqueta: string;
  detalle: string;
  porcentaje: number;
  reps: number;
}

const PASOS_RAMPA: PasoRampa[] = [
  { id: "lubricacion", etiqueta: "Lubricación", detalle: "Activa el líquido sinovial de la articulación.", porcentaje: 0.5, reps: 8 },
  { id: "sn-central", etiqueta: "SN Central", detalle: "Reclutamiento neuromuscular progresivo.", porcentaje: 0.7, reps: 4 },
  { id: "potenciacion-pap", etiqueta: "Potenciación PAP", detalle: "Post-activation potentiation: prepara la serie de trabajo.", porcentaje: 0.85, reps: 1 },
];

/** Redondea al múltiplo de 2.5kg más cercano (discos estándar de gimnasio). */
function redondearA25(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

interface ModalRampaCalentamientoProps {
  open: boolean;
  onClose: () => void;
  pesoObjetivo: number;
  ejercicioNombre?: string;
}

/** Rampa Científica de Calentamiento: 3 series de aproximación al peso
 * objetivo (lubricación → SN central → potenciación PAP) antes de la serie
 * de trabajo. Cada peso de aproximación es 1-tap hacia la Calculadora
 * Visual de Discos para armar la barra sin cuentas mentales. */
export function ModalRampaCalentamiento({
  open,
  onClose,
  pesoObjetivo,
  ejercicioNombre,
}: ModalRampaCalentamientoProps) {
  const [mounted, setMounted] = useState(false);
  const [pesoDiscos, setPesoDiscos] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    const scrollOrig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = scrollOrig;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const w = pesoObjetivo > 0 ? pesoObjetivo : 20;

  function abrirDiscos(kg: number) {
    hapticoSeleccion();
    setPesoDiscos(kg);
  }

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rampa científica de calentamiento"
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-[22px] border border-rule bg-paper/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col gap-4 animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
                <Flame className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink leading-tight">
                  Rampa de calentamiento
                </h2>
                {ejercicioNombre ? (
                  <p className="text-[11px] text-ink-soft truncate">{ejercicioNombre}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-[11px] text-ink-soft -mt-1">
            3 series de aproximación antes de tu serie de trabajo con{" "}
            <b className="font-mono tabular-nums text-ink">{w}kg</b>.
          </p>

          {/* Pasos de la rampa */}
          <div className="flex flex-col gap-2">
            {PASOS_RAMPA.map((paso, i) => {
              const kg = redondearA25(w * paso.porcentaje);
              return (
                <div
                  key={paso.id}
                  className="flex items-center gap-3 rounded-[16px] border border-rule bg-paper-2 p-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-[700] font-mono tabular-nums text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink leading-tight">
                      {paso.etiqueta}
                    </p>
                    <p className="text-[10.5px] text-ink-soft leading-snug break-words">
                      {paso.detalle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirDiscos(kg)}
                    className="flex h-11 shrink-0 flex-col items-end justify-center rounded-[12px] border border-rule bg-paper px-3 transition-[transform,border-color,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.95] hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    aria-label={`Ver discos para ${kg} kilos, serie ${paso.etiqueta}`}
                  >
                    <span className="flex items-baseline gap-1 font-mono text-base font-extrabold tabular-nums text-ink">
                      {kg}
                      <span className="text-[10px] font-semibold text-ink-soft">kg</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-soft">
                      <Calculator className="size-2.5" />
                      {paso.reps} reps
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {pesoDiscos !== null ? (
        <CalculadoraDiscosModal
          open={pesoDiscos !== null}
          onClose={() => setPesoDiscos(null)}
          pesoInicial={pesoDiscos}
          ejercicioNombre={ejercicioNombre}
        />
      ) : null}
    </>,
    document.getElementById("portal-root") ?? document.body,
  );
}

/** Pill táctil que abre la rampa de calentamiento. Úsala junto al peso objetivo. */
export function PillRampaCalentamiento({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticoImpactoSuave();
        onOpen();
      }}
      className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-2.5 py-1 text-[11px] text-ink-soft transition-[transform,color,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      aria-label="Series de calentamiento"
    >
      <Flame className="size-3.5" />
      <b className="font-[700] text-ink">Calentar</b>
    </button>
  );
}
