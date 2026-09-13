"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Repeat } from "lucide-react";
import { hapticoExito, hapticoImpactoSuave } from "@/lib/ui/hapticos";
import { GRUPO_MUSCULAR_LABEL, type Ejercicio } from "@/lib/rutina/tipos";

interface ModalSustitutoExpressProps {
  open: boolean;
  onClose: () => void;
  ejercicioActual: Ejercicio;
  candidatos: Ejercicio[];
  onSeleccionar: (ejercicio: Ejercicio) => void;
}

/** Sustituto Express: 1 toque para reemplazar el ejercicio de hoy cuando la
 * máquina/equipo está ocupado, priorizando equivalentes biomecánicos (mismo
 * patrón de movimiento y grupo muscular principal). */
export function ModalSustitutoExpress({
  open,
  onClose,
  ejercicioActual,
  candidatos,
  onSeleccionar,
}: ModalSustitutoExpressProps) {
  const [mounted, setMounted] = useState(false);

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

  function elegir(ej: Ejercicio) {
    hapticoExito();
    onSeleccionar(ej);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sustituto express por máquina ocupada"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-[22px] border border-rule bg-paper p-5 shadow-2xl flex flex-col gap-4 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
              <Repeat className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink leading-tight">
                Máquina ocupada
              </h2>
              <p className="text-[11px] text-ink-soft truncate">
                Reemplazá {ejercicioActual.nombre} por un equivalente
              </p>
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

        {/* Tarjetas de reemplazo rápido */}
        {candidatos.length === 0 ? (
          <p className="text-xs text-ink-soft py-2">
            No encontramos un equivalente biomecánico disponible.
          </p>
        ) : (
          <div className="space-y-2">
            {candidatos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => elegir(c)}
                className="w-full flex items-center justify-between gap-3 rounded-[14px] border border-rule bg-paper-2 p-3 text-left transition-[transform,border-color,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{c.nombre}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-ink-soft">
                    <span className="uppercase tracking-[0.05em]">
                      {(c.grupo_muscular && GRUPO_MUSCULAR_LABEL[c.grupo_muscular]) ??
                        c.grupo_muscular}
                    </span>
                    {c.patron ? (
                      <span className="inline-flex items-center rounded-full border border-rule bg-paper px-1.5 py-0.5 font-medium">
                        {c.patron}
                      </span>
                    ) : null}
                    {c.equipo ? (
                      <span className="inline-flex items-center rounded-full border border-rule bg-paper px-1.5 py-0.5 font-medium">
                        {c.equipo}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 grid size-8 place-items-center rounded-full bg-accent/15 text-accent">
                  <Repeat className="size-4" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.getElementById("portal-root") ?? document.body,
  );
}

/** Botón táctil secundario que abre el modal de sustituto express. */
export function BotonMaquinaOcupada({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticoImpactoSuave();
        onOpen();
      }}
      aria-label="Máquina ocupada, buscar sustituto"
      className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
    >
      <Repeat className="size-4" />
    </button>
  );
}
