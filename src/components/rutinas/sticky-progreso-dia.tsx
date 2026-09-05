"use client";

import { useEffect, useState } from "react";

interface StickyProgresoDiaProps {
  titulo: string;
  seriesHechas: number;
  totalSeries: number;
  pct: number;
  targetRefId?: string;
}

export function StickyProgresoDia({
  titulo,
  seriesHechas,
  totalSeries,
  pct,
  targetRefId = "hero-resumen-dia",
}: StickyProgresoDiaProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetRefId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Cuando la hero card deja de estar visible (scroll hacia abajo), mostramos la barra sticky
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      {
        threshold: 0.1,
        rootMargin: "-40px 0px 0px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRefId]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Progreso del día: ${seriesHechas} de ${totalSeries} series completadas (${pct}%)`}
      className="fixed top-0 left-0 right-0 z-40 animate-sticky-slide-down border-b border-rule bg-paper/90 shadow-md backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        <div className="min-w-0 pr-3">
          <span className="truncate text-xs font-bold text-ink">
            {titulo}
          </span>
          <span className="ml-1.5 inline-block rounded-[4px] bg-accent/15 px-1.5 py-0.2 text-[10px] font-bold text-accent">
            En vivo
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs">
          <span
            className="font-bold tabular-nums text-ink"
            style={{ fontFamily: "var(--font-hero)" }}
          >
            {seriesHechas}/{totalSeries}
          </span>
          <span className="text-[11px] text-ink-soft">series</span>
          <span
            className="rounded-[6px] border border-rule bg-paper-2 px-1.5 py-0.5 text-[11px] font-bold text-accent"
            style={{ fontFamily: "var(--font-hero)" }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Micro-barra de progreso inferior con aceleración GPU */}
      <div className="h-[3px] w-full overflow-hidden bg-paper-2">
        <div
          className="h-full bg-accent shadow-[0_0_8px_var(--accent)] transition-[width] duration-300 [transition-timing-function:var(--ease-out)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
