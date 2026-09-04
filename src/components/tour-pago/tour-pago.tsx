"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

export type PasoTour = {
  titulo: string;
  descripcion: string;
  selector?: string;
};

export type TourPagoProps = {
  pasos: PasoTour[];
  abierto: boolean;
  onClose: () => void;
  onAbrir: () => void;
  posicionBotonFlotante?: string;
  mostrarBotonFlotante?: boolean;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function TourPago({
  pasos,
  abierto,
  onClose,
  onAbrir,
  posicionBotonFlotante = "bottom-20 md:bottom-6 right-5 md:right-6",
  mostrarBotonFlotante = true,
}: TourPagoProps) {
  const [pasoActual, setPasoActual] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const paso = pasos[pasoActual] ?? pasos[0];
  const esUltimo = pasoActual === pasos.length - 1;
  const esPrimero = pasoActual === 0;

  // Actualizar coordenadas del elemento a resaltar
  const actualizarRect = useCallback(() => {
    if (!abierto || !paso?.selector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(paso.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    });
  }, [abierto, paso?.selector]);

  // Manejar cambio de paso y scroll hacia el elemento
  useEffect(() => {
    if (!abierto) return;

    if (paso?.selector) {
      const el = document.querySelector(paso.selector);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }

    // Pequeño timeout para dar tiempo a que termine el smooth scroll
    const timer = setTimeout(() => {
      actualizarRect();
    }, 150);

    const onScrollResize = () => {
      actualizarRect();
    };

    window.addEventListener("scroll", onScrollResize, { passive: true });
    window.addEventListener("resize", onScrollResize, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScrollResize);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [abierto, pasoActual, paso?.selector, actualizarRect]);

  // Tecla Escape para cerrar
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (!esUltimo) setPasoActual((p) => p + 1);
      } else if (e.key === "ArrowLeft") {
        if (!esPrimero) setPasoActual((p) => p - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, esUltimo, esPrimero, onClose]);

  const avanzar = () => {
    if (esUltimo) {
      onClose();
      setPasoActual(0);
    } else {
      setPasoActual((p) => Math.min(pasos.length - 1, p + 1));
    }
  };

  const retroceder = () => {
    setPasoActual((p) => Math.max(0, p - 1));
  };

  const handleCerrar = () => {
    onClose();
    setPasoActual(0);
  };

  const handleAbrir = () => {
    setPasoActual(0);
    onAbrir();
  };

  // Determinar si la tarjeta debe ir arriba o abajo para no tapar el objetivo
  const tarjetaArriba =
    !targetRect ||
    targetRect.top + targetRect.height / 2 > (typeof window !== "undefined" ? window.innerHeight / 2 : 400);

  return (
    <>
      {/* Botón flotante '?' */}
      {mostrarBotonFlotante && !abierto ? (
        <button
          type="button"
          onClick={handleAbrir}
          aria-label="Abrir guía de pago"
          title="Ayuda / Guía de pago (?)"
          className={`fixed ${posicionBotonFlotante} z-40 flex size-11 items-center justify-center rounded-full border border-rule bg-paper-2 font-display text-base font-bold text-ink shadow-lg backdrop-blur transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:border-ink hover:bg-paper-3 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30`}
        >
          <span aria-hidden className="select-none">?</span>
        </button>
      ) : null}

      {/* Overlay & Tour Modal */}
      {abierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Guía de pago: ${paso.titulo}`}
          className="fixed inset-0 z-50 animate-fade-in"
        >
          {/* Spotlight SVG Mask */}
          {targetRect ? (
            <svg
              className="pointer-events-none fixed inset-0 size-full"
              style={{ zIndex: 50 }}
            >
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={Math.max(0, targetRect.left - 6)}
                    y={Math.max(0, targetRect.top - 6)}
                    width={targetRect.width + 12}
                    height={targetRect.height + 12}
                    rx={10}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="var(--scrim, rgba(4,7,12,0.72))"
                mask="url(#tour-spotlight-mask)"
              />
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx={10}
                fill="none"
                stroke="var(--accent, var(--volt, #10e7a0))"
                strokeWidth={2}
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            </svg>
          ) : (
            <div
              className="fixed inset-0 bg-[color:var(--scrim)]/60 backdrop-blur-[1px]"
              style={{ zIndex: 50 }}
            />
          )}

          {/* Clic fuera cierra el tour */}
          <div
            onClick={handleCerrar}
            className="fixed inset-0 cursor-default"
            style={{ zIndex: 51 }}
          />

          {/* Burbuja / Tarjeta del paso */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 52 }}
            className={`fixed inset-x-4 max-w-sm mx-auto transition-all duration-200 [transition-timing-function:var(--ease-out)] ${
              tarjetaArriba ? "top-4 sm:top-6" : "bottom-4 sm:bottom-6"
            }`}
          >
            <div className="rounded-[14px] border border-rule bg-paper p-5 shadow-2xl animate-scale-up">
              {/* Encabezado: 3 burbujas numeradas + Cerrar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {pasos.map((_, idx) => {
                    const activo = idx === pasoActual;
                    const completado = idx < pasoActual;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPasoActual(idx)}
                        aria-label={`Ir al paso ${idx + 1}`}
                        className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-150 [transition-timing-function:var(--ease-out)] ${
                          activo
                            ? "bg-volt font-bold text-volt-ink shadow-sm ring-2 ring-volt/30"
                            : completado
                              ? "bg-paper-3 text-ink hover:bg-paper-2"
                              : "border border-rule bg-paper-2 text-ink-soft hover:text-ink"
                        }`}
                      >
                        {completado ? (
                          <Check aria-hidden strokeWidth={2.5} className="size-3" />
                        ) : (
                          idx + 1
                        )}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
                    {pasoActual + 1} de {pasos.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCerrar}
                  aria-label="Cerrar guía"
                  className="grid size-7 place-items-center rounded-[5px] text-ink-soft transition-transform duration-150 hover:bg-paper-2 hover:text-ink active:scale-90"
                >
                  <X aria-hidden strokeWidth={2} className="size-4" />
                </button>
              </div>

              {/* Contenido del paso */}
              <div className="mt-3">
                <h3 className="font-display text-base font-semibold text-ink leading-tight">
                  {paso.titulo}
                </h3>
                <p className="mt-1 text-sm leading-snug text-ink-soft">
                  {paso.descripcion}
                </p>
              </div>

              {/* Botones de navegación */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-rule/70 pt-3">
                <button
                  type="button"
                  onClick={handleCerrar}
                  className="text-xs text-ink-soft underline decoration-transparent underline-offset-2 transition-colors duration-150 hover:text-ink hover:decoration-rule"
                >
                  Cerrar
                </button>

                <div className="flex items-center gap-2">
                  {!esPrimero ? (
                    <button
                      type="button"
                      onClick={retroceder}
                      className="inline-flex h-9 items-center gap-1 rounded-[6px] border border-rule bg-paper-2 px-3 text-xs font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:scale-95"
                    >
                      <ChevronLeft aria-hidden strokeWidth={2} className="size-3.5" />
                      Atrás
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={avanzar}
                    className="inline-flex h-9 items-center gap-1 rounded-[6px] bg-ink px-3.5 text-xs font-semibold text-paper transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-125 active:scale-95"
                  >
                    <span>{esUltimo ? "Entendido" : "Siguiente"}</span>
                    {!esUltimo ? (
                      <ChevronRight aria-hidden strokeWidth={2} className="size-3.5" />
                    ) : null}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
