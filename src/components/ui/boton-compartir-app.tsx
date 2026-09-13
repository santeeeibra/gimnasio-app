"use client";

import { useState } from "react";
import { Share2, Check, Sparkles } from "lucide-react";
import { hapticoExito, hapticoSeleccion, iniciarAudioHaptico } from "@/lib/ui/hapticos";

export type BotonCompartirAppProps = {
  variant?: "card" | "button" | "banner";
  className?: string;
  titulo?: string;
  texto?: string;
  url?: string;
};

export function BotonCompartirApp({
  variant = "card",
  className = "",
  titulo = "SysGym — Tu Entrenador con IA",
  texto = "¡Entrená conmigo en SysGym! Llevá tus rutinas, progreso y racha al siguiente nivel 🏋️‍♂️💪",
  url,
}: BotonCompartirAppProps) {
  const [copiado, setCopiado] = useState(false);

  async function handleCompartir() {
    iniciarAudioHaptico();
    hapticoSeleccion();

    const shareUrl = url || (typeof window !== "undefined" ? window.location.origin : "https://sysgym.app");

    const shareData = {
      title: titulo,
      text: texto,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        hapticoExito();
        return;
      } catch (err: any) {
        // Si el usuario canceló la hoja de compartir nativa, ignorar
        if (err?.name === "AbortError") return;
      }
    }

    // Fallback: copiar al portapapeles
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${texto}\n${shareUrl}`);
        setCopiado(true);
        hapticoExito();
        setTimeout(() => setCopiado(false), 2500);
      }
    } catch {
      // Ignorar errores de permisos de portapapeles
    }
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleCompartir}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-sm cursor-pointer ${className}`}
      >
        {copiado ? (
          <>
            <Check className="size-4 text-emerald-300" />
            <span>¡Link copiado!</span>
          </>
        ) : (
          <>
            <Share2 className="size-4" />
            <span>Compartir app</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div
      className={`relative w-full rounded-[18px] border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-zinc-950 p-4 shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md">
            <Sparkles className="size-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              ¿Te gusta la app?
            </p>
            <p className="text-sm font-bold text-white tracking-tight">
              Invitá a tus amigos a entrenar
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCompartir}
          className="shrink-0 h-10 px-4 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.96] transition-all cursor-pointer"
        >
          {copiado ? (
            <>
              <Check className="size-4 stroke-[2.5]" />
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="size-4 stroke-[2.5]" />
              <span>Compartir</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
