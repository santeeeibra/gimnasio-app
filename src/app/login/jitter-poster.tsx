"use client";

export function JitterPoster() {
  return (
    <div className="relative w-full h-full min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/20 bg-[#0a0a0c] shadow-[0_24px_80px_rgba(0,0,0,0.9)] group">
      
      {/* ── Video Player Completo de Jitter ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#0a0a0c]">
        {/* Imagen de fondo de alta definición (fallback si la reproducción de video se retrasa o bloquea en móvil/PC) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-poster.png"
          alt="SysGym Motion"
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01] contrast-[1.05] brightness-[0.98]"
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/images/login-poster.png"
          className="relative z-10 w-full h-full object-cover object-center scale-[1.01] group-hover:scale-[1.04] transition-transform duration-700 ease-out filter contrast-[1.05] brightness-[0.98]"
        >
          <source src="/images/login-poster.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── Floating Badges (Header Layer) ── */}
      <div className="relative z-10 p-5 sm:p-7 flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/25 backdrop-blur-md text-[11px] font-extrabold tracking-widest uppercase text-volt shadow-lg">
          <span className="size-2 rounded-full bg-volt animate-pulse shadow-[0_0_8px_#cde94a]" />
          <span>SysGym Motion</span>
        </div>

      </div>
    </div>
  );
}
