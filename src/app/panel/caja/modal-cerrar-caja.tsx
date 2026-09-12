"use client";

import { useState, useTransition } from "react";
import { cerrarSesionCaja, type ResultadoCierreCaja } from "./actions";
import { Spinner } from "@/components/ui";
import { hapticoExito, hapticoError, hapticoImpactoFuerte, hapticoSeleccion } from "@/lib/ui/hapticos";
import { Lock, Sparkles, CheckCircle2, AlertTriangle, X, ArrowRight } from "lucide-react";

interface ModalCerrarCajaProps {
  turnoNombre: string;
}

export function ModalCerrarCaja({ turnoNombre }: ModalCerrarCajaProps) {
  const [abierto, setAbierto] = useState(false);
  const [montoDeclarado, setMontoDeclarado] = useState("");
  const [notas, setNotas] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCierreCaja | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAbrir = () => {
    hapticoSeleccion();
    setAbierto(true);
    setResultado(null);
    setErrorMsg(null);
  };

  const handleCerrar = () => {
    if (isPending) return;
    setAbierto(false);
    setResultado(null);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("monto_declarado", montoDeclarado || "0");
    formData.set("notas_cierre", notas);

    startTransition(async () => {
      const res = await cerrarSesionCaja(formData);
      if (!res.ok) {
        hapticoError();
        setErrorMsg(res.error || "Ocurrió un error al cerrar el turno.");
      } else {
        if (res.diferencia === 0) {
          hapticoExito();
        } else {
          hapticoImpactoFuerte();
        }
        setResultado(res);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAbrir}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-[12px] font-semibold text-xs border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all"
      >
        <Lock className="size-3.5" />
        <span>Cerrar Turno y Arqueo</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] border-2 border-rule bg-paper-2 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] space-y-5 animate-in zoom-in-95 duration-200"
          >
            {!resultado ? (
              <>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
                      <Sparkles className="size-3" />
                      <span>Arqueo Ciego de Seguridad</span>
                    </div>
                    <h3 className="text-xl font-bold text-ink">Cierre de {turnoNombre}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">
                      Contá el efectivo físico del cajón y declará el monto exacto.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCerrar}
                    disabled={isPending}
                    className="rounded-full p-1.5 text-ink-soft hover:bg-paper hover:text-ink transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="rounded-[10px] border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Monto Declarado */}
                  <div className="rounded-[16px] border border-rule bg-paper p-4 space-y-2">
                    <label className="block text-xs font-semibold text-ink-soft">
                      Total de Efectivo Físico Contado
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-black text-ink-soft">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0"
                        value={montoDeclarado}
                        onChange={(e) => setMontoDeclarado(e.target.value)}
                        className="w-full h-14 pl-9 pr-4 rounded-[12px] border border-rule bg-paper-2 text-2xl font-black text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-ink-soft leading-tight">
                      Por política de seguridad ciega, el sistema cruzará tus billetes con los cobros del turno al confirmar.
                    </p>
                  </div>

                  {/* Notas de cierre */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                      Observaciones de Cierre (opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Se entregó sobre cerrado con la recaudación al dueño"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="w-full p-3 rounded-[12px] border border-rule bg-paper text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCerrar}
                      disabled={isPending}
                      className="flex-1 h-11 rounded-[12px] border border-rule text-sm font-medium text-ink hover:bg-paper transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-sm text-black shadow-lg hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Spinner />
                          <span>Calculando arqueo...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="size-4" />
                          <span>Finalizar y Cerrar</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Pantalla de Resultados del Arqueo */
              <div className="space-y-5 text-center py-2">
                <div className="flex justify-center">
                  {resultado.diferencia === 0 ? (
                    <div className="flex size-16 items-center justify-center rounded-full bg-[#10e7a0]/20 text-[#10e7a0] ring-4 ring-[#10e7a0]/10">
                      <CheckCircle2 className="size-10" />
                    </div>
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 ring-4 ring-amber-500/10">
                      <AlertTriangle className="size-10" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xl font-black text-ink">
                    {resultado.diferencia === 0
                      ? "¡Arqueo Exacto!"
                      : (resultado.diferencia ?? 0) > 0
                      ? "Sobrante de Efectivo"
                      : "Faltante de Efectivo"}
                  </h4>
                  <p className="text-xs text-ink-soft mt-1">
                    El turno ha quedado cerrado y archivado en la auditoría del gimnasio.
                  </p>
                </div>

                <div className="rounded-[16px] border border-rule bg-paper p-4 space-y-3 text-left text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-rule">
                    <span className="text-ink-soft">Efectivo Contado Declarado:</span>
                    <span className="font-bold text-ink">
                      ${resultado.montoDeclarado?.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-rule">
                    <span className="text-ink-soft">Efectivo Esperado por Sistema:</span>
                    <span className="font-bold text-ink">
                      ${resultado.montoEsperado?.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-sm font-black">
                    <span className="text-ink">Diferencia:</span>
                    <span
                      className={
                        resultado.diferencia === 0
                          ? "text-[#10e7a0]"
                          : (resultado.diferencia ?? 0) > 0
                          ? "text-blue-400"
                          : "text-rose-400"
                      }
                    >
                      {resultado.diferencia === 0
                        ? "$0 (Exacto)"
                        : `${(resultado.diferencia ?? 0) > 0 ? "+" : ""}$${resultado.diferencia?.toLocaleString("es-AR")}`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCerrar}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-[12px] bg-ink text-paper font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span>Aceptar y Continuar</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
