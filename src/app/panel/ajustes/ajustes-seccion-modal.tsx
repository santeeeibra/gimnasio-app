"use client";

import { useState, type ReactNode } from "react";
import { X, ChevronRight } from "lucide-react";
import { useHapticos } from "@/lib/ui/hapticos";

export function AjustesSeccionModal({
  titulo,
  subtitulo,
  badge,
  icon: Icon,
  resumen,
  children,
}: {
  titulo: string;
  subtitulo: string;
  badge?: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  resumen?: ReactNode;
  children: ReactNode;
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
      <div className="card-cut border border-rule bg-paper-2 p-5 flex flex-col justify-between gap-4 hover:border-ink/30 transition-all">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-[10px] bg-paper-3 border border-rule grid place-items-center text-ink shrink-0">
                <Icon className="size-4" />
              </div>
              <h2 className="text-base font-semibold text-ink leading-tight">{titulo}</h2>
            </div>
            {badge}
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">{subtitulo}</p>
          {resumen ? <div className="pt-1">{resumen}</div> : null}
        </div>

        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center justify-between w-full h-9 px-3 rounded-[10px] bg-paper border border-rule text-xs font-medium text-ink hover:border-ink active:scale-[0.98] transition-all"
        >
          <span>Configurar</span>
          <ChevronRight className="size-3.5 text-ink-soft" />
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-ink leading-tight">{titulo}</h2>
                  {badge}
                </div>
                <p className="text-xs text-ink-soft mt-0.5">{subtitulo}</p>
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

            {/* Contenido del Formulario */}
            <div className="py-1">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
