"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { eliminarClienteDefinitivo } from "../actions";
import { useHapticos } from "@/lib/ui/hapticos";

export function BajaClienteModal({
  clienteId,
  nombre,
  dni,
}: {
  clienteId: string;
  nombre: string;
  dni: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inputDni, setInputDni] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hapticos = useHapticos();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = () => {
    hapticos.medio();
    setInputDni("");
    setError(null);
    setOpen(true);
  };

  const handleClose = () => {
    hapticos.suave();
    setOpen(false);
  };

  const isDniMatch = inputDni.trim() === dni.trim();

  const handleConfirm = () => {
    if (!isDniMatch || isPending) return;
    hapticos.fuerte();
    setError(null);
    startTransition(async () => {
      const res = await eliminarClienteDefinitivo(clienteId);
      if (res?.error) {
        setError(res.error);
        hapticos.error();
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium text-danger border border-danger/30 bg-danger/10 hover:bg-danger/20 active:scale-95 transition-all cursor-pointer"
      >
        <Trash2 className="size-3.5" />
        <span>Dar de baja definitiva</span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Dar de baja definitiva"
              onClick={handleClose}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-[22px] border border-danger/30 bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="size-5 shrink-0" />
                    <h2 className="text-lg font-bold leading-tight">
                      Dar de baja definitiva
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 rounded-full text-ink-soft hover:text-ink hover:bg-paper-3 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Warning Body */}
                <div className="p-4 rounded-[12px] bg-danger/10 border border-danger/20 text-sm text-ink space-y-2">
                  <p className="font-semibold text-danger flex items-center gap-1.5">
                    ⚠️ Esta acción no se puede deshacer.
                  </p>
                  <p className="text-ink-soft text-xs leading-relaxed">
                    Se va a borrar para siempre a <strong className="text-ink">{nombre}</strong> (DNI <span className="font-mono text-ink">{dni}</span>) y todo lo asociado: historial de pagos, rutinas, mensajes y registros de entrada. El socio ya no va a poder ingresar a la app.
                  </p>
                </div>

                {/* DNI Input Confirmation */}
                <div className="space-y-2">
                  <label htmlFor="confirm-dni" className="block text-xs font-semibold text-ink-soft">
                    Para confirmar, escribí el DNI del socio (<span className="font-mono text-ink">{dni}</span>):
                  </label>
                  <input
                    id="confirm-dni"
                    type="text"
                    inputMode="numeric"
                    value={inputDni}
                    onChange={(e) => setInputDni(e.target.value)}
                    placeholder={`Escribí ${dni}`}
                    className="w-full h-10 rounded-[10px] border border-rule bg-paper-2 px-3 text-sm font-mono text-ink outline-none focus:border-danger focus:ring-1 focus:ring-danger/30 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-danger font-medium bg-danger/10 p-2.5 rounded-[8px] border border-danger/20">
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-rule">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="px-4 py-2 rounded-[10px] border border-rule text-xs font-semibold text-ink hover:bg-paper-3 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!isDniMatch || isPending}
                    className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                      isDniMatch && !isPending
                        ? "bg-danger text-white hover:opacity-90 active:scale-95 cursor-pointer"
                        : "bg-paper-3 text-ink-soft border border-rule cursor-not-allowed opacity-50"
                    }`}
                  >
                    {isPending ? "Eliminando..." : "Sí, eliminar definitivamente"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
