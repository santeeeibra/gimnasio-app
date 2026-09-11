"use client";

/**
 * Feed de logros del gimnasio (récords + hitos de racha de todos los socios)
 * con reacción 👏.
 *
 * Diseño estilo Apple / SysGym:
 * - Dos variantes visuales: ámbar/trofeo para récords, esmeralda/llama para racha.
 * - Mascota Pulpo en tarjeta oscura fija (PulpoCard) con badge indicador.
 * - Botón de reacción ergonómico (≥44px) con feedback táctil (hapticoSeleccion).
 * - Animaciones fluidas compositor-only (GPU transform + opacity).
 */

import { useState, useTransition } from "react";
import { alternarReaccionLogro } from "@/lib/logros/actions";
import type { LogroFeedItem } from "@/lib/logros/actions";
import { PulpoCard } from "@/components/mascota/pulpo";
import { hapticoSeleccion, iniciarAudioHaptico } from "@/lib/ui/hapticos";
import { Trophy, Flame } from "lucide-react";

export function FeedLogros({ items }: { items: LogroFeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      data-feed-logros
      className="w-full space-y-2.5 rounded-[22px] border border-white/5 bg-zinc-950/40 p-3.5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Comunidad en vivo
          </span>
        </div>
        <span className="text-[11px] font-medium text-zinc-500">
          {items.length} {items.length === 1 ? "logro" : "logros"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ItemLogro key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ItemLogro({ item }: { item: LogroFeedItem }) {
  const [total, setTotal] = useState(item.totalReacciones);
  const [miReaccion, setMiReaccion] = useState(item.miReaccion);
  const [pending, startTransition] = useTransition();

  const esRecord = item.tipoLogro === "record";

  function reaccionar() {
    iniciarAudioHaptico();
    hapticoSeleccion();

    // Optimista — el server action confirma o revierte.
    const previo = { total, miReaccion };
    setMiReaccion(!miReaccion);
    setTotal(miReaccion ? total - 1 : total + 1);

    startTransition(async () => {
      const res = await alternarReaccionLogro({
        autorId: item.clienteId,
        tipoLogro: item.tipoLogro,
        claveLogro: item.claveLogro,
      });
      if (res.error) {
        setTotal(previo.total);
        setMiReaccion(previo.miReaccion);
        return;
      }
      setTotal(res.total);
      setMiReaccion(res.miReaccion);
    });
  }

  return (
    <div
      data-logro-item
      data-tipo={item.tipoLogro}
      className={`group relative flex items-center justify-between gap-3 rounded-[16px] border p-3 shadow-md backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
        esRecord
          ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-950/80 to-zinc-950/90 hover:border-amber-500/50 shadow-amber-500/5"
          : "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-zinc-950/80 to-zinc-950/90 hover:border-emerald-500/50 shadow-emerald-500/5"
      }`}
    >
      {/* Mascota en tarjeta fija oscura + badge identificador */}
      <div className="relative shrink-0">
        <PulpoCard
          size={34}
          pose="festejo"
          cardClassName={`w-11 h-11 !p-1 !rounded-[12px] shadow-md transition-transform duration-200 group-hover:scale-105 ${
            esRecord
              ? "border-amber-500/40 bg-zinc-950"
              : "border-emerald-500/40 bg-zinc-950"
          }`}
        />
        <span
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm ${
            esRecord
              ? "border-amber-400/80 bg-amber-500 text-zinc-950"
              : "border-emerald-400/80 bg-emerald-500 text-zinc-950"
          }`}
          aria-hidden="true"
        >
          {esRecord ? (
            <Trophy className="h-2.5 w-2.5 fill-current" />
          ) : (
            <Flame className="h-2.5 w-2.5 fill-current" />
          )}
        </span>
      </div>

      {/* Contenido textual del logro */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider ${
              esRecord ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {esRecord ? "Récord Personal" : "Hito de Racha"}
          </span>
        </div>
        <p
          data-logro-titulo
          className="text-xs leading-snug text-zinc-200 line-clamp-2"
        >
          <strong className="font-bold text-white">{item.clienteNombre}</strong>{" "}
          <span className="text-zinc-400">—</span> {item.titulo}
        </p>
      </div>

      {/* Botón de reacción con feedback háptico */}
      <button
        type="button"
        onClick={reaccionar}
        disabled={pending}
        data-reaccion
        data-activa={miReaccion}
        aria-pressed={miReaccion}
        className={`relative flex min-h-[44px] min-w-[56px] shrink-0 items-center justify-center gap-1.5 rounded-[12px] border px-2.5 text-xs font-semibold select-none cursor-pointer transition-all duration-150 active:scale-90 ${
          miReaccion
            ? esRecord
              ? "border-amber-500/60 bg-amber-500/20 text-amber-300 shadow-sm shadow-amber-500/20"
              : "border-emerald-500/60 bg-emerald-500/20 text-emerald-300 shadow-sm shadow-emerald-500/20"
            : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
        } ${pending ? "opacity-60 cursor-wait" : ""}`}
        aria-label={`Reaccionar con aplauso (${total} reacciones)`}
      >
        <span
          className={`text-base leading-none transition-transform duration-200 ${
            miReaccion ? "scale-115" : "scale-100"
          }`}
          role="img"
          aria-hidden="true"
        >
          👏
        </span>
        <span className="font-mono tabular-nums text-xs font-bold leading-none">
          {total}
        </span>
      </button>
    </div>
  );
}
