"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";
import type { AforoInfo } from "@/lib/aforo/actions";

type Tramo = "tranquilo" | "moderado" | "concurrido";

function tramoDe(pct: number): Tramo {
  if (pct <= 40) return "tranquilo";
  if (pct <= 75) return "moderado";
  return "concurrido";
}

const TRAMO_CONFIG: Record<
  Tramo,
  { color: string; glow: string; mensaje: string }
> = {
  tranquilo: {
    color: "#10e7a0",
    glow: "rgba(16,231,160,0.55)",
    mensaje: "Gym despejado • Ideal para entrenar sin esperas",
  },
  moderado: {
    color: "#f5b400",
    glow: "rgba(245,180,0,0.55)",
    mensaje: "Afluencia media • Buen ritmo en máquinas",
  },
  concurrido: {
    color: "#ff3d5a",
    glow: "rgba(255,61,90,0.6)",
    mensaje: "Horario pico • Aforo alto",
  },
};

export function BarraAforoAnimada({ aforo }: { aforo: AforoInfo }) {
  const [abierto, setAbierto] = useState(false);
  const { enSala, capacidadMaxima, porcentaje } = aforo;
  const tramo = tramoDe(porcentaje);
  const cfg = TRAMO_CONFIG[tramo];

  function handleTap() {
    hapticoImpactoSuave();
    setAbierto((v) => !v);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleTap}
        aria-expanded={abierto}
        className="w-full text-left rounded-[16px] border border-rule/60 bg-paper-2/75 backdrop-blur-xl p-4 shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users aria-hidden strokeWidth={2} className="size-4 shrink-0 text-ink-soft" />
            <span className="text-xs font-medium text-ink-soft truncate">
              Aforo en vivo
            </span>
          </div>
          <span
            className="tabular-nums font-mono text-sm font-bold shrink-0"
            style={{ color: cfg.color }}
          >
            {porcentaje}%
          </span>
        </div>

        {/* Doble capa: fondo translúcido + relleno neón animado (compositor-only) */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-paper border border-rule/60">
          <div
            className="absolute inset-y-0 left-0 h-full w-full rounded-full origin-left transition-transform duration-500 [transition-timing-function:var(--ease-out)]"
            style={{
              transform: `scaleX(${Math.max(porcentaje, 2) / 100})`,
              backgroundColor: cfg.color,
              boxShadow: `0 0 12px ${cfg.glow}`,
            }}
          />
        </div>

        <p className="mt-2 text-[11px] text-ink-soft">{cfg.mensaje}</p>
      </button>

      {abierto ? (
        <div className="animate-pop-in absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-[12px] border border-rule bg-paper-2 p-3 shadow-lg">
          <p className="text-xs text-ink">
            <span className="tabular-nums font-mono font-bold" style={{ color: cfg.color }}>
              {enSala}
            </span>{" "}
            {enSala === 1 ? "persona entrenando" : "personas entrenando"} ahora de{" "}
            <span className="tabular-nums font-mono font-bold">{capacidadMaxima}</span> de
            capacidad máxima
          </p>
        </div>
      ) : null}
    </div>
  );
}
