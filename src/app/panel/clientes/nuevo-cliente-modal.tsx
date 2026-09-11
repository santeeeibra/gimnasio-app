"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { UserPlus, X, Lock, ArrowRight, Sparkles } from "lucide-react";
import { AltaForm } from "./alta-form";
import { useHapticos } from "@/lib/ui/hapticos";
import { PulpoCard } from "@/components/mascota/pulpo";

export function NuevoClienteModal({
  planes,
  cupo,
  gimnasioId,
}: {
  planes: { id: string; nombre: string }[];
  cupo: { ok: boolean; usados: number; max: number | null; esGratuito?: boolean; plan?: string | null };
  gimnasioId: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hapticos = useHapticos();

  useEffect(() => {
    setMounted(true);
  }, []);

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

      {mounted && open ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo cliente"
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
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

            {/* Formulario de Alta o Gating de Plan Inicial */}
            {cupo.esGratuito && !cupo.ok ? (
              <div className="space-y-4 py-2 animate-fade-in">
                <div className="rounded-[16px] bg-danger/10 border border-danger/30 p-4 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-danger/20 text-danger shrink-0">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      Límite de 40 alumnos activos alcanzado
                    </h3>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Tu gimnasio llegó al tope del Plan Inicial Gratuito. Para sumar más clientes y desbloquear cobro automático o check-in QR, pasate a un plan superior.
                    </p>
                  </div>
                </div>

                <div className="flex justify-center my-2">
                  <PulpoCard size={72} pose="festejo" />
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <Link
                    href="/panel/plan"
                    onClick={() => hapticos.exito()}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-[12px] bg-accent text-accent-contrast font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    <span>Ver Planes y Desbloquear Alumnos Ilimitados</span>
                    <ArrowRight className="size-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full h-10 rounded-[12px] border border-rule bg-paper-2 text-ink-soft hover:text-ink font-medium text-xs active:scale-95 transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : planes.length === 0 ? (
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
        </div>,
        document.getElementById("portal-root") ?? document.body
      ) : null}
    </>
  );
}
