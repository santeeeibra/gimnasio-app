"use client";

import { useState } from "react";
import { CreditCard, X } from "lucide-react";
import { PagoForm, type PlanConDescuentos } from "./pago-form";
import { useHapticos } from "@/lib/ui/hapticos";

export function RegistrarPagoModal({
  clienteId,
  planes,
  planActual,
}: {
  clienteId: string;
  planes: PlanConDescuentos[];
  planActual: string | null;
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
        <CreditCard className="size-4" />
        <span>Registrar pago</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pago"
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
                  Registrar cobro de cuota
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Extiende la membresía del socio e impacta en tus ingresos.
                </p>
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

            {/* Formulario de Pago */}
            <PagoForm
              clienteId={clienteId}
              planes={planes}
              planActual={planActual}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
