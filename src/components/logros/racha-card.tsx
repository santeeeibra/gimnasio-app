"use client";

/**
 * Card de racha de constancia en /mi.
 *
 * Diseño nativo estilo iOS / SysGym:
 * - Mascota <Pulpo> dentro de su tarjeta con fondo oscuro fijo (zinc-950).
 * - Números tabulares monospaciados para días seguidos.
 * - Micro-interacciones hápticas en acciones de compartir.
 */

import Image from "next/image";
import { RACHA_MINIMA_VISIBLE, type ResultadoRacha } from "@/lib/logros/tipos";
import { hapticoImpactoMedio, iniciarAudioHaptico } from "@/lib/ui/hapticos";
import { Share2, Flame, ShieldCheck } from "lucide-react";

export type RachaCardProps = {
  racha: ResultadoRacha;
  /** Se llama al tocar "Compartir" (sólo se ofrece en un hito). */
  onCompartir?: () => void;
};

export function RachaCard({ racha, onCompartir }: RachaCardProps) {
  if (racha.dias < RACHA_MINIMA_VISIBLE) return null;

  function handleCompartir() {
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    onCompartir?.();
  }

  return (
    <div
      data-logro="racha"
      className="relative w-full rounded-[16px] border border-emerald-500/25 bg-zinc-900/90 p-4 shadow-xl backdrop-blur-xl transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-3.5">
        {/* Icono de Racha Activa de Pulpo Volt en tarjeta oscura (Regla SysGym) */}
        <div className="relative flex-shrink-0 w-16 h-16 rounded-[14px] bg-zinc-950 border border-emerald-500/30 p-1 shadow-xl overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.25)_0%,transparent_70%)] pointer-events-none" />
          <Image
            src="/mascota/racha-activa.png"
            alt="Pulpo Racha Activa"
            width={56}
            height={56}
            className="object-cover rounded-[10px] select-none"
          />
        </div>

        {/* Información de la racha */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse fill-orange-500" />
            <span>Racha activa</span>
          </div>

          <p className="mt-0.5 text-lg font-bold text-white tracking-tight flex items-baseline gap-1.5">
            <span className="font-mono tabular-nums text-2xl font-black text-emerald-400">
              {racha.dias}
            </span>
            <span className="text-zinc-300 text-sm font-medium">
              {racha.dias === 1 ? "día seguido" : "días seguidos"}
            </span>
          </p>

          {racha.conPerdon && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Día de perdón aplicado</span>
            </div>
          )}
        </div>

        {/* Botón de compartir en hitos */}
        {racha.enHito && (
          <button
            type="button"
            onClick={handleCompartir}
            className="flex-shrink-0 h-11 px-3.5 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.97] transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>Compartir</span>
          </button>
        )}
      </div>
    </div>
  );
}

