"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

export function JitterPoster() {
  const [hasVideoError, setHasVideoError] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/20 bg-[#0a0a0c] shadow-[0_24px_80px_rgba(0,0,0,0.9)] group">
      
      {/* ── Video Player Completo de Jitter ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {!hasVideoError ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            onError={() => setHasVideoError(true)}
            poster="https://d1sk5dy9gxckst.cloudfront.net/thumbnails/mwq_fULsuMUf41zwX1dm4.png"
            className="w-full h-full object-cover object-center scale-[1.01] group-hover:scale-[1.04] transition-transform duration-700 ease-out filter contrast-[1.05] brightness-[0.98]"
          >
            <source src="/images/login-poster.mp4" type="video/mp4" />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="https://d1sk5dy9gxckst.cloudfront.net/thumbnails/mwq_fULsuMUf41zwX1dm4.png"
            alt="Athlete Runner Kinetic Poster"
            className="w-full h-full object-cover object-center scale-[1.01] group-hover:scale-[1.04] transition-transform duration-700 ease-out filter contrast-[1.05] brightness-[0.98]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/login-poster.png";
            }}
          />
        )}
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
    </div>
  );
}
