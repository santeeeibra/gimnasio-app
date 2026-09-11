"use client";

import { useState, useEffect, useTransition } from "react";
import { type DropPaso, calcularPasosSugeridos } from "@/lib/progreso/tipos";
import { guardarDropSetCliente } from "@/lib/rutina/dropset-actions";
import {
  hapticoDial,
  hapticoExito,
  hapticoImpactoSuave,
} from "@/lib/ui/hapticos";

interface PanelDropSetProps {
  ejercicioId: string;
  ejercicioNombre: string;
  serieIndex: number;
  pesoBase: number;
  repsBase: number;
  pasosPrevios?: DropPaso[] | null;
  onCompletado: (pasos: DropPaso[]) => void;
  onCerrar: () => void;
}

export function PanelDropSet({
  ejercicioId,
  ejercicioNombre,
  serieIndex,
  pesoBase,
  repsBase,
  pasosPrevios,
  onCompletado,
  onCerrar,
}: PanelDropSetProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar pasos: si ya había guardados se usan esos, sino se pre-calculan
  // el escalón base + 2 bajadas recomendadas del 20%-25%.
  const [pasos, setPasos] = useState<DropPaso[]>(() => {
    if (pasosPrevios && pasosPrevios.length > 0) {
      return pasosPrevios;
    }
    const pesoValido = pesoBase > 0 ? pesoBase : 20;
    const repsValidas = repsBase > 0 ? repsBase : 10;
    const sugeridos = calcularPasosSugeridos(pesoValido, repsValidas, 2);
    return [{ peso: pesoValido, reps: repsValidas }, ...sugeridos];
  });

  // Si cambia el pesoBase o repsBase y no había pasos previos, refrescar base
  useEffect(() => {
    if (!pasosPrevios || pasosPrevios.length === 0) {
      const pesoValido = pesoBase > 0 ? pesoBase : 20;
      const repsValidas = repsBase > 0 ? repsBase : 10;
      const sugeridos = calcularPasosSugeridos(pesoValido, repsValidas, 2);
      setPasos([{ peso: pesoValido, reps: repsValidas }, ...sugeridos]);
    }
  }, [pesoBase, repsBase, pasosPrevios]);

  function ajustarPeso(index: number, delta: number) {
    hapticoDial();
    setPasos((prev) => {
      const copy = [...prev];
      const actual = copy[index].peso;
      const nuevo = Math.max(0.5, Math.round((actual + delta) * 2) / 2);
      copy[index] = { ...copy[index], peso: nuevo };
      return copy;
    });
  }

  function ajustarReps(index: number, delta: number) {
    hapticoDial();
    setPasos((prev) => {
      const copy = [...prev];
      const actual = copy[index].reps;
      const nuevo = Math.max(1, actual + delta);
      copy[index] = { ...copy[index], reps: nuevo };
      return copy;
    });
  }

  function agregarEscalon() {
    hapticoImpactoSuave();
    setPasos((prev) => {
      const ultimo = prev[prev.length - 1];
      const pesoSugerido = Math.max(1, Math.round(ultimo.peso * 0.75));
      return [...prev, { peso: pesoSugerido, reps: ultimo.reps }];
    });
  }

  function eliminarEscalon(index: number) {
    if (pasos.length <= 1) return;
    hapticoImpactoSuave();
    setPasos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGuardar() {
    hapticoExito();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await guardarDropSetCliente(ejercicioId, serieIndex, pasos);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onCompletado(pasos);
        }
      } catch (e) {
        // En caso de fallo de red, igual completamos optimista para el socio
        onCompletado(pasos);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-label={`Registro de Drop Set para ${ejercicioNombre}`}
      className="mt-2.5 rounded-[12px] border border-accent/30 bg-paper-2/90 p-3 shadow-sm backdrop-blur-sm transition-all"
    >
      {/* Header del Panel */}
      <div className="flex items-center justify-between pb-2 border-b border-rule/70">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent/20 text-[13px] font-extrabold text-accent">
            ⚡
          </span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
              Drop Set · Serie {serieIndex + 1}
            </h4>
            <p className="text-[11px] text-ink-soft">
              Sin pausa entre escalones, bajá el peso y continuá.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticoImpactoSuave();
            onCerrar();
          }}
          className="size-7 rounded-[8px] border border-rule grid place-items-center text-xs font-bold text-ink-soft hover:text-ink hover:bg-paper transition-colors"
          aria-label="Cerrar panel de drop set"
        >
          ✕
        </button>
      </div>

      {/* Lista de Escalones / Drops */}
      <div className="mt-2.5 space-y-2">
        {pasos.map((paso, idx) => {
          const esBase = idx === 0;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between gap-2 p-2 rounded-[10px] border transition-colors ${
                esBase
                  ? "border-accent/30 bg-accent/5"
                  : "border-rule bg-paper"
              }`}
            >
              {/* Etiqueta del escalón */}
              <div className="min-w-0 flex items-center gap-1.5">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    esBase
                      ? "bg-accent text-accent-ink"
                      : "bg-paper-2 border border-rule text-ink-soft"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="truncate">
                  <span className="text-[11px] font-semibold text-ink">
                    {esBase ? "Carga Base" : `Bajada ${idx}`}
                  </span>
                </div>
              </div>

              {/* Controles de Peso y Reps con toques directos */}
              <div className="flex items-center gap-2">
                {/* Control de Peso (Kg) */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => ajustarPeso(idx, -1)}
                    className="size-7 rounded-[6px] border border-rule bg-paper-2 text-xs font-bold text-ink hover:bg-paper active:scale-90 transition-transform"
                    aria-label={`Disminuir 1 kg a escalón ${idx + 1}`}
                  >
                    −
                  </button>
                  <div className="w-12 text-center">
                    <span className="text-xs font-extrabold text-ink tabular-nums">
                      {paso.peso}
                    </span>
                    <span className="text-[9px] font-medium text-ink-soft ml-0.5">
                      kg
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => ajustarPeso(idx, 1)}
                    className="size-7 rounded-[6px] border border-rule bg-paper-2 text-xs font-bold text-ink hover:bg-paper active:scale-90 transition-transform"
                    aria-label={`Aumentar 1 kg a escalón ${idx + 1}`}
                  >
                    +
                  </button>
                </div>

                {/* Separador */}
                <span className="text-ink-soft/40 text-xs">×</span>

                {/* Control de Reps */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => ajustarReps(idx, -1)}
                    className="size-7 rounded-[6px] border border-rule bg-paper-2 text-xs font-bold text-ink hover:bg-paper active:scale-90 transition-transform"
                    aria-label={`Disminuir 1 rep a escalón ${idx + 1}`}
                  >
                    −
                  </button>
                  <div className="w-9 text-center">
                    <span className="text-xs font-extrabold text-accent tabular-nums">
                      {paso.reps}
                    </span>
                    <span className="text-[9px] font-medium text-ink-soft ml-0.5">
                      r
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => ajustarReps(idx, 1)}
                    className="size-7 rounded-[6px] border border-rule bg-paper-2 text-xs font-bold text-ink hover:bg-paper active:scale-90 transition-transform"
                    aria-label={`Aumentar 1 rep a escalón ${idx + 1}`}
                  >
                    +
                  </button>
                </div>

                {/* Botón eliminar escalón (sólo para escalones > 1) */}
                {!esBase && (
                  <button
                    type="button"
                    onClick={() => eliminarEscalon(idx)}
                    className="size-6 text-ink-soft hover:text-red-500 text-xs grid place-items-center active:scale-90 transition-transform"
                    aria-label={`Quitar escalón ${idx + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón agregar escalón */}
      {pasos.length < 5 && (
        <div className="mt-2 flex justify-start">
          <button
            type="button"
            onClick={agregarEscalon}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline active:scale-95 transition-transform"
          >
            <span>+ Agregar otra bajada</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <p className="mt-2 text-center text-xs text-red-500 font-medium">
          {errorMsg}
        </p>
      )}

      {/* Botón Principal: 1 Toque para Confirmar y Guardar */}
      <div className="mt-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleGuardar}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-[10px] bg-accent font-bold text-accent-ink text-sm shadow-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? (
            <span>Guardando...</span>
          ) : (
            <>
              <span>⚡ Confirmar Drop Set</span>
              <span className="text-xs font-semibold opacity-90">
                ({pasos.map((p) => `${p.peso}k`).join("➔")})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
