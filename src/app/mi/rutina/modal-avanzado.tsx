"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { GenerarRutinaForm, type AvanzadoDefaults } from "./generar-form";
import { generarMiRutinaAvanzada } from "./actions";
import { useHapticos } from "@/lib/ui/hapticos";
import type { Enfasis, Molestia, Nivel, Objetivo, PreferenciaEquipo, Sexo } from "@/lib/rutina/tipos";

export function ModalAvanzadoAfinarPlan({
  rutina,
  clienteSexo,
  prefs,
}: {
  rutina: { objetivo: string; nivel?: string; dias_por_semana?: number } | null;
  clienteSexo?: Sexo | null;
  prefs: {
    equipo?: PreferenciaEquipo;
    sexo?: Sexo;
    enfasis?: Enfasis[];
    zonasDolor?: Molestia[];
    avanzado?: AvanzadoDefaults | null;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const hapticos = useHapticos();

  const handleOpen = () => {
    hapticos.medio();
    setOpen(true);
  };

  const handleClose = () => {
    hapticos.suave();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between rounded-[12px] border border-rule bg-paper-2 p-3 text-sm font-medium text-ink transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-3 hover:border-ink/20 active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
            <SlidersHorizontal aria-hidden className="size-4" />
          </span>
          <span className="truncate">Modo avanzado — afinar el plan</span>
        </div>
        <span className="text-xs font-semibold text-accent shrink-0">Abrir</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modo avanzado — afinar el plan"
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
                  <SlidersHorizontal className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink leading-tight">
                    Modo avanzado
                  </h2>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Ajustes de estructura (split), repeticiones, volumen y RIR.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar modal"
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Generador Avanzado Form */}
            <div className="py-1">
              <GenerarRutinaForm
                action={generarMiRutinaAvanzada}
                mostrarAvanzado
                tieneRutina={!!rutina}
                defaults={{
                  objetivo: (rutina?.objetivo as Objetivo) ?? undefined,
                  nivel: (rutina?.nivel as Nivel) ?? "avanzado",
                  dias: rutina?.dias_por_semana ?? undefined,
                  preferencia: prefs?.equipo ?? undefined,
                  sexo: prefs?.sexo ?? undefined,
                  enfasis: prefs?.enfasis ?? undefined,
                  zonasDolor: prefs?.zonasDolor ?? undefined,
                }}
                clienteSexo={clienteSexo}
                avanzadoDefaults={prefs?.avanzado ?? undefined}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
