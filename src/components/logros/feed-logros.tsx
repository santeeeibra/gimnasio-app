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

import Image from "next/image";
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
      className="w-full space-y-2.5 rounded-[16px] border border-rule bg-paper p-3.5"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Comunidad en vivo
          </span>
        </div>
        <span className="text-[11px] font-medium text-ink-soft">
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
      className={`group relative flex items-center justify-between gap-3 rounded-[14px] border p-3 shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
        esRecord
          ? "border-warn/30 bg-gradient-to-r from-warn/10 via-paper-2 to-paper-2 hover:border-warn/50"
          : "border-ok/30 bg-gradient-to-r from-ok/10 via-paper-2 to-paper-2 hover:border-ok/50"
      }`}
    >
      {/* Mascota en tarjeta + badge identificador */}
      <div className="relative shrink-0">
        {esRecord ? (
          <PulpoCard
            size={34}
            pose="festejo"
            cardClassName="w-11 h-11 !p-1 !rounded-[12px] shadow-sm transition-transform duration-200 group-hover:scale-105 border-warn/40 bg-paper"
          />
        ) : (
          <div className="relative w-11 h-11 rounded-[12px] bg-paper border border-ok/40 p-0.5 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.2)_0%,transparent_70%)] pointer-events-none" />
            <Image
              src="/mascota/racha-activa.png"
              alt="Racha activa"
              width={38}
              height={38}
              className="object-cover rounded-[8px] select-none"
            />
          </div>
        )}
        <span
          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm ${
            esRecord
              ? "border-warn/80 bg-warn text-paper"
              : "border-ok/80 bg-ok text-paper"
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
              esRecord ? "text-warn" : "text-ok"
            }`}
          >
            {esRecord ? "Récord Personal" : "Hito de Racha"}
          </span>
        </div>
        <p
          data-logro-titulo
          className="text-xs leading-snug text-ink-soft line-clamp-2"
        >
          <strong className="font-bold text-ink">{item.clienteNombre}</strong>{" "}
          <span className="text-ink-soft">—</span> {item.titulo}
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
              ? "border-warn/60 bg-warn/20 text-warn shadow-sm"
              : "border-ok/60 bg-ok/20 text-ok shadow-sm"
            : "border-rule bg-paper text-ink-soft hover:bg-paper-3 hover:text-ink"
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
