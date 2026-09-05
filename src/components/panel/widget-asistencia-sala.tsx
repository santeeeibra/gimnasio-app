"use client";

import { useEffect, useState, useTransition } from "react";
import { LifeBuoy, Check, Navigation, Clock, User } from "lucide-react";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  marcarEnCamino,
  marcarAtendido,
  obtenerPedidosActivos,
  type PedidoPanel,
} from "@/app/panel/asistencia/actions";

function tiempoTranscurrido(fechaIso: string): string {
  const diffSeg = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 1000);
  if (diffSeg < 60) return "hace un momento";
  const min = Math.floor(diffSeg / 60);
  if (min === 1) return "hace 1 min";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  return `hace ${horas} h`;
}

export function WidgetAsistenciaSala({
  iniciales = [],
  gimnasioId,
}: {
  iniciales?: PedidoPanel[];
  gimnasioId: string;
}) {
  const [pedidos, setPedidos] = useState<PedidoPanel[]>(iniciales);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Polling y suscripción Realtime a nuevos pedidos
  useEffect(() => {
    const supabase = createClient();

    const canal = supabase
      .channel("pedidos_asistencia_sala")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos_asistencia",
          filter: `gimnasio_id=eq.${gimnasioId}`,
        },
        () => {
          // Re-cargar la lista activa
          obtenerPedidosActivos().then((res) => {
            setPedidos(res.pedidos);
          });
        }
      )
      .subscribe();

    // Chequeo periódico cada 15 segundos por si no entra socket
    const interval = setInterval(() => {
      obtenerPedidosActivos().then((res) => {
        setPedidos(res.pedidos);
      });
    }, 15000);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(interval);
    };
  }, [gimnasioId]);

  if (pedidos.length === 0) {
    return null;
  }

  function handleEnCamino(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await marcarEnCamino(id);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: "en_camino" } : p))
      );
      setPendingId(null);
    });
  }

  function handleAtendido(id: string) {
    setPendingId(id);
    startTransition(async () => {
      await marcarAtendido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
      setPendingId(null);
    });
  }

  return (
    <section className="mb-6 rounded-[16px] border border-warn/40 bg-warn/10 p-4 shadow-sm backdrop-blur-sm animate-fade-in">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-warn/20">
        <div className="flex items-center gap-2.5">
          <div className="relative grid size-9 shrink-0 place-items-center rounded-[10px] bg-warn text-paper font-bold shadow-sm">
            <LifeBuoy className="size-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warn opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-warn" />
            </span>
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              Ayuda solicitada en sala ({pedidos.length})
            </h2>
            <p className="text-xs text-ink-soft">
              Alumnos que pidieron asistencia técnica con un ejercicio
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 divide-y divide-warn/15">
        {pedidos.map((p) => {
          const nombre = p.cliente?.profile?.nombre || "Socio";
          const foto = p.cliente?.foto_url;
          const esPending = pendingId === p.id;
          const enCamino = p.estado === "en_camino";

          return (
            <div
              key={p.id}
              className="py-3 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={foto}
                    alt={nombre}
                    className="size-10 shrink-0 rounded-full border border-rule object-cover"
                  />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded-full border border-rule bg-paper text-ink-soft">
                    <User className="size-5" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-sm font-bold text-ink truncate">
                      {nombre}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                      <Clock className="size-3" />
                      {tiempoTranscurrido(p.creado_at)}
                    </span>
                  </div>

                  <p className="text-xs text-ink mt-0.5">
                    Dudas con: <b className="text-warn">{p.ejercicio_nombre}</b>
                  </p>

                  <p className="text-[11px] text-ink-soft">
                    Ubicación: <span className="text-ink font-medium">{p.sector}</span>
                  </p>
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!enCamino ? (
                  <button
                    type="button"
                    disabled={esPending}
                    onClick={() => handleEnCamino(p.id)}
                    className="flex items-center gap-1.5 rounded-[10px] border border-warn bg-warn/20 px-3 py-2 text-xs font-bold text-ink transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-warn/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warn/30"
                  >
                    {esPending ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <>
                        <Navigation className="size-3.5 text-warn" />
                        <span>Voy para allá</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-[8px] bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent">
                    En camino...
                  </span>
                )}

                <button
                  type="button"
                  disabled={esPending}
                  onClick={() => handleAtendido(p.id)}
                  className="flex items-center gap-1.5 rounded-[10px] bg-ok px-3 py-2 text-xs font-bold text-paper transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ok/30"
                >
                  {esPending ? (
                    <Spinner className="size-3.5" />
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Atendido</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
