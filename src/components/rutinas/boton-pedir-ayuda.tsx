"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { LifeBuoy, X, Check, BellRing, Sparkles, MapPin } from "lucide-react";
import { Spinner } from "@/components/ui";
import { deducirSector, SECTORES_PREDETERMINADOS, type PedidoAsistencia } from "@/lib/rutina/asistencia";
import { pedirAsistencia, cancelarAsistencia, obtenerAsistenciaActiva } from "@/app/mi/rutina/asistencia-actions";

type Props = {
  ejercicioId?: string | null;
  ejercicioNombre: string;
  equipo?: string | null;
};

export function BotonPedirAyuda({
  ejercicioId,
  ejercicioNombre,
  equipo,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [sectorElegido, setSectorElegido] = useState(() => deducirSector(equipo));
  const [pedidoActivo, setPedidoActivo] = useState<PedidoAsistencia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Chequear al cargar si hay un pedido activo
    obtenerAsistenciaActiva().then((res) => {
      if (res.pedido) setPedidoActivo(res.pedido);
    });
  }, []);

  const esEsteEjercicioActivo =
    pedidoActivo &&
    (pedidoActivo.ejercicio_id === ejercicioId ||
      pedidoActivo.ejercicio_nombre.toLowerCase() === ejercicioNombre.toLowerCase());

  function handlePedir() {
    setMensaje(null);
    startTransition(async () => {
      const res = await pedirAsistencia({
        ejercicioId,
        ejercicioNombre,
        sector: sectorElegido,
      });

      if (!res.ok) {
        setMensaje(res.error || "Ocurrió un error al enviar el aviso.");
        return;
      }

      if (res.pedido) {
        setPedidoActivo(res.pedido);
      }
      setMensaje("¡Aviso enviado! El profe ya fue notificado.");
    });
  }

  function handleCancelar() {
    if (!pedidoActivo) return;
    setMensaje(null);
    startTransition(async () => {
      const res = await cancelarAsistencia(pedidoActivo.id);
      if (res.ok) {
        setPedidoActivo(null);
        setAbierto(false);
      } else {
        setMensaje(res.error || "No se pudo cancelar.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Pedir ayuda al profe con ${ejercicioNombre}`}
        title="Pedir ayuda con este ejercicio"
        className={`relative grid size-8 shrink-0 place-items-center rounded-[8px] border transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
          esEsteEjercicioActivo
            ? "border-accent bg-accent/15 text-accent animate-pulse"
            : "border-rule bg-paper text-ink-soft hover:text-ink hover:border-ink/30"
        }`}
      >
        <LifeBuoy className="size-4" />
        {esEsteEjercicioActivo && (
          <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent ring-2 ring-paper" />
        )}
      </button>

      {abierto && mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pedir ayuda al profe"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-0 sm:p-4 backdrop-blur-sm animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] border border-rule bg-paper p-5 shadow-2xl animate-scale-in"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-rule bg-paper-2 text-accent">
                    <LifeBuoy className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold leading-tight text-ink">
                      Pedir ayuda en sala
                    </h3>
                    <p className="text-xs text-ink-soft">
                      Avisale al profe para que se acerque a darte una mano
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  aria-label="Cerrar"
                  className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft hover:text-ink transition-transform active:scale-90"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Contenido */}
              <div className="mt-4 space-y-4">
                {/* Ejercicio info card */}
                <div className="rounded-[12px] border border-rule bg-paper-2 p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                    Ejercicio con dudas
                  </span>
                  <p className="font-display text-base font-bold text-ink mt-0.5">
                    {ejercicioNombre}
                  </p>
                </div>

                {/* Si ya hay un pedido activo */}
                {pedidoActivo ? (
                  <div className="rounded-[14px] border border-accent/30 bg-accent/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-accent">
                      <BellRing className="size-5 animate-bounce" />
                      <span className="font-display text-sm font-bold">
                        {pedidoActivo.estado === "en_camino"
                          ? "¡El profe está yendo hacia tu ubicación!"
                          : "Aviso enviado — Esperando al profe"}
                      </span>
                    </div>

                    <p className="text-xs text-ink leading-relaxed">
                      El profesor ya recibió la alerta en su celular para acercarse a{" "}
                      <b className="text-accent">{pedidoActivo.sector}</b> por{" "}
                      <b>{pedidoActivo.ejercicio_nombre}</b>.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleCancelar}
                        className="w-full flex items-center justify-center gap-2 rounded-[10px] border border-rule bg-paper py-2.5 text-xs font-semibold text-ink-soft hover:text-ink transition-all active:scale-95"
                      >
                        {isPending ? <Spinner className="size-3.5" /> : "Cancelar pedido"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbierto(false)}
                        className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-accent py-2.5 text-xs font-bold text-accent-ink transition-all active:scale-95 shadow-sm"
                      >
                        Entendido
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Selector de sector */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <MapPin className="size-3.5 text-accent" />
                        ¿En qué sector estás?
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {SECTORES_PREDETERMINADOS.map((sec) => {
                          const activo = sectorElegido === sec;
                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setSectorElegido(sec)}
                              className={`rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                                activo
                                  ? "border-accent bg-accent text-accent-ink font-bold shadow-sm"
                                  : "border-rule bg-paper-2 text-ink-soft hover:border-ink/30"
                              }`}
                            >
                              {sec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {mensaje && (
                      <p className="text-xs font-medium text-warn leading-tight rounded-[8px] bg-warn/10 border border-warn/20 p-2.5">
                        {mensaje}
                      </p>
                    )}

                    {/* Botón CTA enviar */}
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handlePedir}
                        className="w-full flex items-center justify-center gap-2 rounded-[12px] bg-accent py-3 text-sm font-bold text-accent-ink transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-98 shadow-md hover:brightness-105 disabled:opacity-50"
                      >
                        {isPending ? (
                          <>
                            <Spinner className="size-4" />
                            <span>Enviando notificación...</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="size-4" />
                            <span>Avisar al profe que venga</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
