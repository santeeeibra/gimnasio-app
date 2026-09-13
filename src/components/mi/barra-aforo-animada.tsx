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
  { color: string; glow: string; mensaje: string; imagen: string }
> = {
  tranquilo: {
    color: "#10e7a0",
    glow: "rgba(16,231,160,0.55)",
    mensaje: "Gym despejado • Ideal para entrenar sin esperas",
    imagen: "/mascota/aforo-tranquilo.jpg",
  },
  moderado: {
    color: "#f5b400",
    glow: "rgba(245,180,0,0.55)",
    mensaje: "Afluencia media • Buen ritmo en máquinas",
    imagen: "/mascota/aforo-moderado.jpg",
  },
  concurrido: {
    color: "#ff3d5a",
    glow: "rgba(255,61,90,0.6)",
    mensaje: "Horario pico • Aforo alto",
    imagen: "/mascota/aforo-concurrido.jpg",
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
        className="w-full text-left rounded-[16px] border border-rule/60 bg-paper-2/75 backdrop-blur-xl p-3.5 shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-[10px] border border-rule bg-paper shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cfg.imagen}
              alt="Mascota Volt Aforo"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Users aria-hidden strokeWidth={2} className="size-3.5 shrink-0 text-ink-soft" />
                <span className="text-xs font-semibold text-ink-soft truncate">
                  Aforo en vivo
                </span>
              </div>
              <span
                className="tabular-nums font-mono text-xs font-extrabold shrink-0 px-2 py-0.5 rounded-full border border-rule bg-paper"
                style={{ color: cfg.color }}
              >
                {porcentaje}%
              </span>
            </div>

            {/* Doble capa: fondo translúcido + relleno neón animado */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-paper border border-rule/60">
              <div
                className="absolute inset-y-0 left-0 h-full w-full rounded-full origin-left transition-transform duration-500 [transition-timing-function:var(--ease-out)]"
                style={{
                  transform: `scaleX(${Math.max(porcentaje, 2) / 100})`,
                  backgroundColor: cfg.color,
                  boxShadow: `0 0 12px ${cfg.glow}`,
                }}
              />
            </div>

            <p className="mt-1 text-[11px] font-medium text-ink-soft truncate">{cfg.mensaje}</p>
          </div>
        </div>
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
