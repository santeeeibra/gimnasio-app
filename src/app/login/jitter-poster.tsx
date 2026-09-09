"use client";

import { useEffect, useState } from "react";
import { Sparkles, Play } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

const KINETIC_PHRASES = [
  { top: "To be", middle: "the best,", bottom: "beat the best." },
  { top: "Tu cuota,", middle: "tu rutina,", bottom: "tus avisos." },
  { top: "Cada repetición,", middle: "cada logro,", bottom: "sin límites." },
];

export function JitterPoster() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % KINETIC_PHRASES.length);
        setAnimating(false);
      }, 300);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  const current = KINETIC_PHRASES[index];

  return (
    <div className="relative w-full h-full min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/20 bg-[#0a0a0c] shadow-[0_24px_80px_rgba(0,0,0,0.9)] group">
      
      {/* ── High-Contrast Runner Poster Image Layer ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://d1sk5dy9gxckst.cloudfront.net/thumbnails/mwq_fULsuMUf41zwX1dm4.png"
          alt="Athlete Runner Kinetic Poster"
          className="w-full h-full object-cover object-center scale-[1.02] group-hover:scale-[1.05] transition-transform duration-700 ease-out filter contrast-[1.1] brightness-[0.95]"
          onError={(e) => {
            // Fallback si falla CloudFront
            (e.target as HTMLImageElement).src = "/images/login-poster.png";
          }}
        />

        {/* Gradient sutil solo en la base para contraste de texto inferior */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      </div>

      {/* ── Floating Badges (Header Layer) ── */}
      <div className="relative z-10 p-5 sm:p-7 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/25 backdrop-blur-md text-[11px] font-extrabold tracking-widest uppercase text-volt shadow-lg">
          <span className="size-2 rounded-full bg-volt animate-pulse shadow-[0_0_8px_#cde94a]" />
          <span>SysGym Motion</span>
        </div>

        <a
          href="/promo-video/index.html"
          onClick={() => hapticoImpactoSuave()}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-[11px] font-bold tracking-wide uppercase text-emerald-300 backdrop-blur-md transition-all active:scale-95 shadow-[0_0_20px_rgba(16,231,160,0.25)] touch-manipulation cursor-pointer"
        >
          <Play className="size-3 fill-emerald-300 text-emerald-300" />
          <span>Ver Video</span>
        </a>
      </div>

      {/* ── Kinetic Typography Content Block (Estilo exacto Jitter) ── */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-8 lg:p-10 pb-8 sm:pb-10">
        <div className="max-w-lg space-y-3">
          
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-300">
            <Sparkles className="size-3.5 text-volt" />
            <span>Power & Performance</span>
          </div>

          <h2 className="font-display tracking-tighter leading-[0.92] text-[clamp(2.6rem,6.5vw,4.2rem)] font-black text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
            <span
              className={`block transition-all duration-300 ease-out ${
                animating
                  ? "opacity-0 -translate-y-3 filter blur-sm"
                  : "opacity-100 translate-y-0 filter blur-0"
              }`}
            >
              {current.top}
            </span>
            <span
              className={`block text-volt drop-shadow-[0_0_30px_rgba(205,233,74,0.5)] transition-all duration-300 delay-75 ease-out ${
                animating
                  ? "opacity-0 translate-y-3 filter blur-sm"
                  : "opacity-100 translate-y-0 filter blur-0"
              }`}
            >
              {current.middle}
            </span>
            <span
              className={`block transition-all duration-300 delay-150 ease-out ${
                animating
                  ? "opacity-0 translate-y-4 filter blur-sm"
                  : "opacity-100 translate-y-0 filter blur-0"
              }`}
            >
              {current.bottom}
            </span>
          </h2>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium max-w-xs pt-1 drop-shadow">
            Tu gimnasio al siguiente nivel. Control total de accesos y entrenamiento.
          </p>

          {/* Dots de paginación interactivos */}
          <div className="flex items-center gap-2 pt-3">
            {KINETIC_PHRASES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  hapticoImpactoSuave();
                  setAnimating(true);
                  setTimeout(() => {
                    setIndex(i);
                    setAnimating(false);
                  }, 180);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === index ? "w-8 bg-volt shadow-[0_0_12px_#cde94a]" : "w-2 bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Ver frase ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
