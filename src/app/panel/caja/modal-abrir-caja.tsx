"use client";

import { useState, useTransition } from "react";
import { abrirSesionCaja } from "./actions";
import { Spinner } from "@/components/ui";
import { hapticoExito, hapticoError, hapticoSeleccion, hapticoImpactoMedio } from "@/lib/ui/hapticos";
import { Coins, Plus, X, Sun, Sunset, Moon, Clock } from "lucide-react";

const TURNOS_RAPIDOS = [
  { nombre: "Turno Mañana", icono: Sun, desc: "07:00 a 14:00" },
  { nombre: "Turno Tarde", icono: Sunset, desc: "14:00 a 21:00" },
  { nombre: "Turno Noche", icono: Moon, desc: "21:00 al cierre" },
  { nombre: "Turno Único", icono: Clock, desc: "Jornada completa" },
];

export function ModalAbrirCaja() {
  const [abierto, setAbierto] = useState(false);
  const [turnoNombre, setTurnoNombre] = useState("Turno Mañana");
  const [montoInicial, setMontoInicial] = useState("");
  const [notas, setNotas] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAbrir = () => {
    hapticoSeleccion();
    setAbierto(true);
  };

  const handleCerrar = () => {
    if (isPending) return;
    setAbierto(false);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hapticoImpactoMedio();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("turno_nombre", turnoNombre);
    formData.set("monto_inicial", montoInicial || "0");
    formData.set("notas_apertura", notas);

    startTransition(async () => {
      const res = await abrirSesionCaja(formData);
      if (res?.error) {
        hapticoError();
        setErrorMsg(res.error);
      } else {
        hapticoExito();
        setAbierto(false);
        setMontoInicial("");
        setNotas("");
      }
    });
  };

  return (
    <>
      <button
        onClick={handleAbrir}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-[12px] font-semibold text-sm bg-gradient-to-r from-[#10e7a0] to-[#22c55e] text-black shadow-[0_4px_20px_rgba(16,231,160,0.35)] hover:brightness-105 active:scale-[0.98] transition-all"
      >
        <Coins className="size-4" />
        <span>Abrir Turno de Caja</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[20px] border border-rule bg-paper-2 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#10e7a0]/15 text-[#10e7a0]">
                  <Coins className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Apertura de Caja</h3>
                  <p className="text-xs text-ink-soft">Iniciar nuevo turno de recepción</p>
                </div>
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
              {/* Selector de turno */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-2">
                  Nombre del Turno
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TURNOS_RAPIDOS.map((t) => {
                    const Icono = t.icono;
                    const activo = turnoNombre === t.nombre;
                    return (
                      <button
                        key={t.nombre}
                        type="button"
                        onClick={() => {
                          hapticoSeleccion();
                          setTurnoNombre(t.nombre);
                        }}
                        className={`flex flex-col items-start p-3 rounded-[12px] border text-left transition-all ${
                          activo
                            ? "border-[#10e7a0] bg-[#10e7a0]/10 text-ink ring-1 ring-[#10e7a0]"
                            : "border-rule bg-paper hover:border-ink-soft/40 text-ink-soft"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-xs text-ink">
                          <Icono className={`size-3.5 ${activo ? "text-[#10e7a0]" : "text-ink-soft"}`} />
                          <span>{t.nombre}</span>
                        </div>
                        <span className="text-[10px] text-ink-soft mt-0.5">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fondo inicial en efectivo */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Fondo Inicial de Efectivo (Caja Chica)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-ink-soft">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={montoInicial}
                    onChange={(e) => setMontoInicial(e.target.value)}
                    className="w-full h-12 pl-8 pr-4 rounded-[12px] border border-rule bg-paper text-lg font-bold tabular-nums font-mono text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0] focus:ring-1 focus:ring-[#10e7a0]"
                    required
                  />
                </div>
                <p className="text-[11px] text-ink-soft mt-1">
                  Billetes y cambio inicial en el cajón al empezar el turno.
                </p>
              </div>

              {/* Notas de apertura */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Notas de Apertura (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Se dejaron 5 billetes de 1000 para cambio"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full p-3 rounded-[12px] border border-rule bg-paper text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0] focus:ring-1 focus:ring-[#10e7a0]"
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
                  className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#10e7a0] font-semibold text-sm text-black shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Spinner />
                      <span>Abriendo...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      <span>Confirmar Apertura</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
