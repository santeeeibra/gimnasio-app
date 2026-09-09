"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { linkClasses } from "@/components/ui";

export type Paso = {
  titulo: string;
  cuerpo: string;
  /** Fragmento visual de mentira. Puede recibir `avanzar` para botones tipo
   *  "Simular alta" que solo pasan al siguiente paso. */
  demo?: React.ReactNode | ((o: { avanzar: () => void }) => React.ReactNode);
};

export function Overlay({
  pasos,
  finalLabel,
  onClose,
}: {
  pasos: Paso[];
  finalLabel: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ultimo = i === pasos.length - 1;
  const paso = pasos[i];

  useEffect(() => {
    setMounted(true);
  }, []);

  const avanzar = useCallback(() => {
    setI((n) => (n >= pasos.length - 1 ? n : n + 1));
  }, [pasos.length]);

  // Bloquear scroll del body mientras el tutorial está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape = saltear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const demo =
    typeof paso.demo === "function" ? paso.demo({ avanzar }) : paso.demo;

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--scrim)] p-4 animate-fade-in sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-[14px] border border-rule bg-paper shadow-xl animate-slide-up"
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Tutorial · {i + 1} de {pasos.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`-mr-1 -mt-1 shrink-0 rounded-[5px] px-2 py-1 text-xs active:scale-95 ${linkClasses.plano}`}
          >
            Saltear
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          <h2 className="text-lg leading-tight">{paso.titulo}</h2>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">
            {paso.cuerpo}
          </p>
          {demo ? (
            <div className="mt-4 rounded-[8px] border border-rule bg-paper-2 p-3">
              {demo}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-rule px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            {pasos.map((_, n) => (
              <span
                key={n}
                className={`size-1.5 rounded-full transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
                  n === i ? "bg-ink" : "bg-rule"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <button
                type="button"
                onClick={() => setI((n) => Math.max(0, n - 1))}
                className="inline-flex h-9 items-center rounded-[5px] border border-rule px-3 text-sm font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                Atrás
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (ultimo ? onClose() : avanzar())}
              className="inline-flex h-9 items-center rounded-[5px] bg-ink px-3 text-sm font-medium text-paper transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              {ultimo ? finalLabel : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById("portal-root") ?? document.body
  );
}
