"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { AltaForm } from "./alta-form";
import { useHapticos } from "@/lib/ui/hapticos";

export function NuevoClienteModal({
  planes,
  cupo,
  gimnasioId,
}: {
  planes: { id: string; nombre: string }[];
  cupo: { ok: boolean; usados: number; max: number | null };
  gimnasioId: string;
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
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[12px] bg-accent text-accent-contrast font-medium text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-sm shrink-0"
      >
        <UserPlus className="size-4" />
        <span>Nuevo cliente</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo cliente"
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h2 className="text-xl font-bold text-ink leading-tight">
                  Nuevo cliente
                </h2>
                {cupo.max != null ? (
                  <p className={`text-xs mt-0.5 ${cupo.ok ? "text-ink-soft" : "text-danger font-medium"}`}>
                    {cupo.usados} / {cupo.max} socios ocupados
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Cerrar modal"
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Formulario de Alta */}
            {planes.length === 0 ? (
              <p className="text-sm text-ink-soft py-4">
                Primero creá al menos un plan en la sección Planes.
              </p>
            ) : (
              <AltaForm
                planes={planes}
                full={!cupo.ok}
                gimnasioId={gimnasioId}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
