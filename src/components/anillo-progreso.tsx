"use client";

/**
 * Componente AnilloProgreso: anillo SVG con número central en fuente héroe.
 * Usado para indicadores circulares de progreso (ej: días restantes de cuota).
 *
 * Patrón visual "Futurista" (ver REGLAS_UI_EMIL.md §17): fondo oscuro,
 * `--volt` como acento, números en `--font-hero` (Orbitron). Incluye
 * animaciones ambientales pasivas (CSS puro en globals.css, sin JS pesado):
 *  - `.ring-draw`: al montar, el arco recorre de vacío al valor (900 ms).
 *  - `.futurista-anillo-glow`: glow lento del anillo `--volt` (pulso de 6s).
 *  - Número: cuenta 0→N en un tween corto al montar; en cambios posteriores
 *    de `valor`, `key={valor}` remonta y `.futurista-num-in` desliza el número.
 * Todo respeta `prefers-reduced-motion: reduce` (el número salta al valor,
 * el arco queda en su estado final). Sin blink ni indicadores "en vivo".
 */

import { useEffect, useRef, useState } from "react";

type AnilloProgresoProps = {
  valor: number;
  max: number;
  label: string;
  className?: string;
};

export function AnilloProgreso({
  valor,
  max,
  label,
  className = "",
}: AnilloProgresoProps) {
  const porcentaje = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  const radio = 54; // radio del círculo
  const stroke = 8; // grosor del anillo
  const normalizedRadius = radio - stroke / 2;
  const circunferencia = normalizedRadius * 2 * Math.PI;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  // Cuenta el número desde el valor previo (0 al montar) hasta el actual.
  const [display, setDisplay] = useState(0);
  const previo = useRef(0);

  useEffect(() => {
    const desde = previo.current;
    const hasta = valor;
    previo.current = hasta;
    if (desde === hasta) {
      setDisplay(hasta);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(hasta);
      return;
    }
    const dur = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(desde + (hasta - desde) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [valor]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={radio * 2}
        height={radio * 2}
        className="transform -rotate-90"
      >
        {/* Círculo de fondo */}
        <circle
          cx={radio}
          cy={radio}
          r={normalizedRadius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-rule"
        />
        {/* Círculo de progreso */}
        <circle
          cx={radio}
          cy={radio}
          r={normalizedRadius}
          stroke="var(--volt)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={
            {
              "--ring-circ": circunferencia,
              "--ring-dash": offset,
            } as React.CSSProperties
          }
          className="ring-draw futurista-anillo-glow transition-[stroke-dashoffset] duration-500 [transition-timing-function:var(--ease-out)]"
        />
      </svg>
      {/* Número central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="font-[700] leading-none tracking-tight text-ink"
          style={{ fontFamily: "var(--font-hero)" }}
          aria-label={`${valor} ${label}`}
        >
          <span key={valor} className="futurista-num-in inline-block text-4xl">
            {display}
          </span>
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          {label}
        </p>
      </div>
    </div>
  );
}
