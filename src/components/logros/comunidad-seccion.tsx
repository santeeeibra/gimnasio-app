"use client";

import { useState } from "react";
import type { LogroFeedItem, ItemRankingAsistencia, DesafioMensual } from "@/lib/logros/actions";
import { FeedLogros } from "./feed-logros";
import { hapticoSeleccion, iniciarAudioHaptico } from "@/lib/ui/hapticos";
import { Trophy, Flame, Target, Users, Medal } from "lucide-react";

interface Props {
  feedItems: LogroFeedItem[];
  ranking: ItemRankingAsistencia[];
  miPosicion: ItemRankingAsistencia | null;
  desafio: DesafioMensual | null;
}

export function ComunidadSeccion({ feedItems, ranking, miPosicion, desafio }: Props) {
  const [tab, setTab] = useState<"feed" | "ranking" | "desafio">("feed");

  function cambiarTab(nuevaTab: "feed" | "ranking" | "desafio") {
    iniciarAudioHaptico();
    hapticoSeleccion();
    setTab(nuevaTab);
  }

  return (
    <section
      data-comunidad-seccion
      className="card-cut w-full space-y-3 rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm"
    >
      {/* Encabezado y pestañas — mismo lenguaje de card que el resto de /mi */}
      <div className="flex items-center justify-between pb-1 border-b border-rule">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ok" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Comunidad Gym
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-[12px] bg-paper p-1 border border-rule">
          <button
            type="button"
            onClick={() => cambiarTab("feed")}
            className={`flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold transition-all duration-150 ${
              tab === "feed"
                ? "bg-ok text-paper shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Feed</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarTab("ranking")}
            className={`flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold transition-all duration-150 ${
              tab === "ranking"
                ? "bg-warn text-paper shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Top</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarTab("desafio")}
            className={`flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold transition-all duration-150 ${
              tab === "desafio"
                ? "bg-volt text-volt-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Reto</span>
          </button>
        </div>
      </div>

      {/* Contenido según pestaña activa */}
      {tab === "feed" && (
        <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
          {feedItems.length > 0 ? (
            <FeedLogros items={feedItems} />
          ) : (
            <div className="rounded-[16px] border border-rule bg-paper p-4 text-center">
              <p className="text-xs text-ink-soft">
                Aún no hay récords ni hitos hoy. ¡Entrená y sé el primero en aparecer! 🔥
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "ranking" && (
        <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between px-1 text-[11px] text-ink-soft font-medium">
            <span>Ranking Asistencia (Este mes)</span>
            <span>Clases</span>
          </div>

          {ranking.length > 0 ? (
            <div className="space-y-1.5">
              {ranking.map((item) => {
                const medallas = ["🥇", "🥈", "🥉"];
                const esTop3 = item.posicion <= 3;

                return (
                  <div
                    key={item.clienteId}
                    className={`flex items-center justify-between rounded-[14px] border p-2.5 text-xs transition-all ${
                      item.esUsuarioActual
                        ? "border-warn/50 bg-warn/10 font-bold text-ink shadow-sm"
                        : "border-rule bg-paper text-ink-soft"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-center font-mono font-bold text-xs">
                        {esTop3 ? medallas[item.posicion - 1] : `#${item.posicion}`}
                      </span>
                      <span className="truncate">
                        {item.nombre} {item.esUsuarioActual && "(Tú)"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-ok bg-ok/10 px-2 py-0.5 rounded-full border border-ok/20">
                      {item.asistencias}
                    </span>
                  </div>
                );
              })}

              {miPosicion && miPosicion.posicion > 5 && (
                <div className="mt-2 flex items-center justify-between rounded-[14px] border border-warn/40 bg-warn/10 p-2.5 text-xs font-bold text-ink">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-mono font-bold text-xs">
                      #{miPosicion.posicion}
                    </span>
                    <span>{miPosicion.nombre} (Tú)</span>
                  </div>
                  <span className="font-mono text-ok bg-ok/10 px-2 py-0.5 rounded-full border border-ok/20">
                    {miPosicion.asistencias}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[16px] border border-rule bg-paper p-4 text-center">
              <p className="text-xs text-ink-soft">
                La tabla se actualizará con los primeros check-ins del mes. 🏋️‍♂️
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "desafio" && desafio && (
        <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
          <div className="rounded-[16px] border border-volt/30 bg-gradient-to-br from-volt/10 via-paper to-paper p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-volt-ink" />
                <h3 className="text-xs font-bold text-ink">{desafio.titulo}</h3>
              </div>
              {desafio.completado && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-volt text-volt-ink px-2 py-0.5 rounded-full">
                  ¡Completado! 🎉
                </span>
              )}
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-ink-soft">Tu avance:</span>
                <span className="font-mono text-volt-ink">
                  {desafio.misAsistencias} / {desafio.metaAsistencias} asistencias
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-paper border border-rule overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ok to-volt transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (desafio.misAsistencias / desafio.metaAsistencias) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-ink-soft">
              <Users className="h-3.5 w-3.5 text-ink-soft" />
              <span>
                <strong>{desafio.totalSociosCumplidos} socios</strong> de tu gym ya lo lograron este mes.
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
