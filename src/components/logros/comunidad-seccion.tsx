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
      className="w-full space-y-3 rounded-[22px] border border-white/10 bg-zinc-950/60 p-4 backdrop-blur-xl shadow-xl"
    >
      {/* Encabezado y pestañas estilo iOS */}
      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Comunidad Gym
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-[12px] bg-zinc-900/90 p-1 border border-white/5">
          <button
            type="button"
            onClick={() => cambiarTab("feed")}
            className={`flex h-7 items-center gap-1.5 rounded-[9px] px-2.5 text-xs font-semibold transition-all duration-150 ${
              tab === "feed"
                ? "bg-emerald-500 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
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
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
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
                : "text-zinc-400 hover:text-zinc-200"
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
            <div className="rounded-[16px] border border-white/5 bg-zinc-900/40 p-4 text-center">
              <p className="text-xs text-zinc-400">
                Aún no hay récords ni hitos hoy. ¡Entrená y sé el primero en aparecer! 🔥
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "ranking" && (
        <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 font-medium">
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
                        ? "border-amber-500/50 bg-amber-500/10 font-bold text-white shadow-sm"
                        : "border-white/5 bg-zinc-900/60 text-zinc-300"
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
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {item.asistencias}
                    </span>
                  </div>
                );
              })}

              {miPosicion && miPosicion.posicion > 5 && (
                <div className="mt-2 flex items-center justify-between rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs font-bold text-white">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-mono font-bold text-xs">
                      #{miPosicion.posicion}
                    </span>
                    <span>{miPosicion.nombre} (Tú)</span>
                  </div>
                  <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {miPosicion.asistencias}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[16px] border border-white/5 bg-zinc-900/40 p-4 text-center">
              <p className="text-xs text-zinc-400">
                La tabla se actualizará con los primeros check-ins del mes. 🏋️‍♂️
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "desafio" && desafio && (
        <div className="space-y-3 pt-1 animate-in fade-in-50 duration-200">
          <div className="rounded-[16px] border border-volt/30 bg-gradient-to-br from-volt/10 via-zinc-950 to-zinc-950 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-volt" />
                <h3 className="text-xs font-bold text-white">{desafio.titulo}</h3>
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
                <span className="text-zinc-300">Tu avance:</span>
                <span className="font-mono text-volt">
                  {desafio.misAsistencias} / {desafio.metaAsistencias} asistencias
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-volt transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (desafio.misAsistencias / desafio.metaAsistencias) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-400">
              <Users className="h-3.5 w-3.5 text-zinc-400" />
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
