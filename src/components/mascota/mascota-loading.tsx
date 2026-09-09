"use client";

/**
 * Indicador de carga oficial de SysGym: la mascota (pulpo volt-green)
 * corriendo en loop. Reemplaza los spinners genéricos (Suspense fallbacks,
 * estados de carga de Server Actions, etc.).
 *
 * Sprite swap manual con setInterval (~100ms/frame) sobre los 8 PNG de
 * `public/mascota/corriendo/`. El intervalo se limpia al desmontar.
 * Con `prefers-reduced-motion: reduce` no anima: muestra un solo frame.
 *
 * La mascota tiene color de marca FIJO — no depende del tema del gimnasio —
 * pero el layout y el texto sí usan tokens de tema.
 */

import { useEffect, useRef, useState } from "react";

const TOTAL_FRAMES = 8;
const FRAMES = Array.from(
  { length: TOTAL_FRAMES },
  (_, i) => `/mascota/corriendo/frame${i + 1}.png`,
);
const MS_POR_FRAME = 100;

export type MascotaLoadingProps = {
  /** Lado del sprite en px. */
  size?: number;
  /** Texto para lectores de pantalla (y opcionalmente visible). */
  label?: string;
  /** Muestra el label debajo de la mascota. */
  mostrarLabel?: boolean;
  className?: string;
};

export function MascotaLoading({
  size = 64,
  label = "Cargando…",
  mostrarLabel = false,
  className = "",
}: MascotaLoadingProps) {
  const [frame, setFrame] = useState(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = mq.matches;
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, MS_POR_FRAME);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      {/* Precarga: todos los frames montados, sólo uno visible. Evita el
          parpadeo del primer ciclo y el layout shift. */}
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {FRAMES.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            width={size}
            height={size}
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain select-none"
            style={{ opacity: i === frame ? 1 : 0 }}
          />
        ))}
      </div>

      {mostrarLabel ? (
        <span className="text-sm text-ink-soft">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export default MascotaLoading;
