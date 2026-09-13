"use client";

/**
 * Splash de arranque en frío (cold start).
 * Portada oficial con ilustración 9:16 de Volt, barra de carga neón animada a 60fps
 * y transición de salida suave con micro-zoom.
 */

import { useEffect, useState } from "react";

const FLAG = "sysgym:splash:v3";
const VISIBLE_MS = 1400;
const FADE_MS = 450;

type Fase = "idle" | "visible" | "saliendo";

export function SplashScreen() {
  const [fase, setFase] = useState<Fase>("idle");
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    let yaVisto = true;
    try {
      yaVisto = sessionStorage.getItem(FLAG) === "1";
    } catch {
      yaVisto = false;
    }
    if (yaVisto) return;

    try {
      sessionStorage.setItem(FLAG, "1");
    } catch {
      /* modo privado */
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setFase("idle");
      return;
    }

    setFase("visible");
    const frame = requestAnimationFrame(() => {
      setProgreso(100);
    });

    const tSalida = window.setTimeout(() => setFase("saliendo"), VISIBLE_MS);
    const tFin = window.setTimeout(() => setFase("idle"), VISIBLE_MS + FADE_MS);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(tSalida);
      window.clearTimeout(tFin);
    };
  }, []);

  if (fase === "idle") return null;

  return (
    <div
      className="splash-screen"
      data-leaving={fase === "saliendo"}
      role="status"
      aria-label="Cargando SysGym"
    >
      {/* Ilustración de fondo 9:16 de Volt */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-out"
        style={{ backgroundImage: `url('/mascota/splash-intro.png')` }}
      />

      {/* Sombra ambiental inferior */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35 pointer-events-none" />

      {/* Overlay de la barra de carga animada a 60fps en la parte inferior */}
      <div className="absolute bottom-[3.6%] left-1/2 -translate-x-1/2 w-[70%] max-w-[260px] z-10 flex flex-col items-center">
        <div className="relative w-full h-[14px] rounded-full bg-zinc-950/90 border border-[#10e7a0]/50 p-0.5 shadow-[0_0_20px_rgba(16,231,160,0.3)] overflow-hidden backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#10e7a0] to-cyan-300 shadow-[0_0_12px_#10e7a0] transition-all duration-[1250ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] relative"
            style={{ width: `${progreso}%` }}
          >
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff,0_0_14px_#10e7a0] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;

