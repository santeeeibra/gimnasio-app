"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Play } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

const KINETIC_PHRASES = [
  { text: "To be the best,", highlight: "beat your limits." },
  { text: "Tu cuota,", highlight: "tu rutina, tus avisos." },
  { text: "Cada repetición cuenta,", highlight: "no te detengas." },
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
      }, 350);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const currentPhrase = KINETIC_PHRASES[index];

  return (
    <div className="relative w-full h-full min-h-[360px] lg:min-h-[580px] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/15 bg-[#0e1017] shadow-[0_24px_80px_rgba(0,0,0,0.85)] group">
      {/* ── Background Poster Image with GPU Scale Motion ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Image
          src="/images/login-poster.png"
          alt="SysGym Kinetic Runner Poster"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center scale-[1.03] group-hover:scale-[1.07] transition-transform duration-1000 ease-out brightness-[0.85] contrast-[1.15]"
        />
        {/* Subtle Dark Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d11] via-[#0c0d11]/50 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d11]/80 via-transparent to-[#0c0d11]/80" />
        
        {/* Ambient Neon Volt Lighting Beam */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-volt/20 blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 right-0 w-72 h-72 rounded-full bg-[#10e7a0]/15 blur-[90px] pointer-events-none" />
      </div>

      {/* ── Floating Badges (Header Layer) ── */}
      <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-xl text-[11px] font-extrabold tracking-widest uppercase text-volt shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <span className="size-2 rounded-full bg-[#10e7a0] animate-pulse shadow-[0_0_8px_#10e7a0]" />
          <span>Jitter Motion Tech</span>
        </div>

        <a
          href="/promo-video/index.html"
          onClick={() => hapticoImpactoSuave()}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[11px] font-bold tracking-wide uppercase text-emerald-300 backdrop-blur-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(16,231,160,0.25)] touch-manipulation cursor-pointer"
        >
          <Play className="size-3 fill-emerald-300 text-emerald-300" />
          <span>Ver Video</span>
        </a>
      </div>

      {/* ── Kinetic Typography Content Block (Jitter Animation Style) ── */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-10 pt-20 pb-10">
        <div className="max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Sparkles className="size-3.5 text-volt" />
            <span>SysGym Engine</span>
          </div>

          <h2 className="font-display tracking-tighter leading-[0.95] text-[clamp(2.2rem,5vw,3.6rem)] font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            <span
              className={`block transition-all duration-500 ${
                animating
                  ? "opacity-0 -translate-y-4 filter blur-sm"
                  : "opacity-100 translate-y-0 filter blur-0"
              }`}
            >
              {currentPhrase.text}
            </span>
            <span
              className={`block text-transparent bg-clip-text bg-gradient-to-r from-volt via-[#10e7a0] to-white transition-all duration-500 delay-75 drop-shadow-[0_0_30px_rgba(205,233,74,0.4)] ${
                animating
                  ? "opacity-0 translate-y-4 filter blur-sm"
                  : "opacity-100 translate-y-0 filter blur-0"
              }`}
            >
              {currentPhrase.highlight}
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium max-w-sm pt-1">
            Controlá tus accesos, rutinas y pagos en tiempo real con la máxima velocidad.
          </p>

          {/* Indicator dots loop */}
          <div className="flex items-center gap-2 pt-2">
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
                  }, 200);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === index ? "w-8 bg-volt shadow-[0_0_10px_#cde94a]" : "w-2 bg-white/20 hover:bg-white/40"
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
