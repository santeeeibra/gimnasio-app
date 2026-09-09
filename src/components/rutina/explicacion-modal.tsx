"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, ChevronRight } from "lucide-react";
import { useHapticos } from "@/lib/ui/hapticos";

export function ExplicacionModal({
  explicacionGeneral,
  pasos,
}: {
  explicacionGeneral?: string;
  pasos: string[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hapticos = useHapticos();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pasos.length === 0 && !explicacionGeneral) return null;

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
        className="w-full flex items-center justify-between gap-3 p-3.5 rounded-[14px] border border-accent/30 bg-accent/5 hover:bg-accent/10 active:scale-[0.99] transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-accent/20 text-accent">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-semibold text-ink text-left truncate">
            ¿Por qué está armada así tu rutina?
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-accent shrink-0">
          <span>Ver explicación</span>
          <ChevronRight className="size-4" />
        </div>
      </button>

      {mounted && open ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Explicación de tu rutina"
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink leading-tight">
                    ¿Por qué está armada así?
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Fundamento científico y estructura recomendada
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

            {/* Contenido */}
            <div className="space-y-4 text-sm leading-relaxed text-ink">
              {explicacionGeneral ? (
                <div className="p-3.5 rounded-[14px] bg-paper-2 border border-rule">
                  <p className="text-xs text-ink-soft whitespace-pre-wrap">{explicacionGeneral}</p>
                </div>
              ) : null}

              {pasos.length > 0 ? (
                <ol className="space-y-2">
                  {pasos.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-[12px] border border-rule bg-paper-2"
                    >
                      <span className="shrink-0 px-2 py-0.5 rounded-[6px] bg-paper-3 font-mono font-bold text-xs text-accent border border-rule">
                        Día {i + 1}
                      </span>
                      <span className="text-xs text-ink">{t}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </div>
        </div>,
        document.getElementById("portal-root") ?? document.body
      ) : null}
    </>
  );
}
