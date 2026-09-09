"use client";

/**
 * Splash de arranque en frío (cold start).
 * Cubre la pantalla con la mascota en su tarjeta de fondo fijo + el nombre "SysGym".
 */

import { useEffect, useState } from "react";
import { PulpoCard } from "@/components/mascota/pulpo";

const FLAG = "sysgym:splash:v1";
const VISIBLE_MS = 1000;
const FADE_MS = 400;

type Fase = "idle" | "visible" | "saliendo";

export function SplashScreen() {
  const [fase, setFase] = useState<Fase>("idle");

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
    const visibleMs = reduce ? 500 : VISIBLE_MS;

    setFase("visible");
    const tSalida = window.setTimeout(() => setFase("saliendo"), visibleMs);
    const tFin = window.setTimeout(() => setFase("idle"), visibleMs + FADE_MS);
    return () => {
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
      aria-label="Abriendo SysGym"
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <PulpoCard
          size={110}
          pose="festejo"
          cardClassName="!p-5 !rounded-[24px] shadow-2xl border-emerald-500/40 animate-in zoom-in-95"
        />
        <span className="splash-screen__nombre text-white font-black text-xl tracking-tight">
          SysGym
        </span>
      </div>
    </div>
  );
}

export default SplashScreen;

