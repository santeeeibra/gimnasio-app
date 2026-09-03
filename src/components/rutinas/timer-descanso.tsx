"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [
  { label: "30s", segundos: 30 },
  { label: "1min", segundos: 60 },
  { label: "90s", segundos: 90 },
  { label: "2min", segundos: 120 },
];

type Estado = "detenido" | "corriendo" | "pausado";

export function TimerDescanso() {
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [estado, setEstado] = useState<Estado>("detenido");
  const [colapsado, setColapsado] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Countdown
  useEffect(() => {
    if (estado !== "corriendo") return;

    intervalRef.current = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          // Llegó a 0
          setEstado("detenido");
          if (intervalRef.current) clearInterval(intervalRef.current);
          reproducirBeep();
          vibrar();
          return 60; // reset
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [estado]);

  function reproducirBeep() {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 880; // A5
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (err) {
      console.warn("No se pudo reproducir beep:", err);
    }
  }

  function vibrar() {
    if ("vibrate" in navigator) {
      navigator.vibrate(200);
    }
  }

  function iniciar() {
    setEstado("corriendo");
    setColapsado(false);
  }

  function pausar() {
    setEstado("pausado");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reanudar() {
    setEstado("corriendo");
  }

  function resetear() {
    setEstado("detenido");
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSegundosRestantes(60);
  }

  function seleccionarPreset(seg: number) {
    setSegundosRestantes(seg);
    if (estado === "corriendo" || estado === "pausado") {
      setEstado("detenido");
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }

  const minutos = Math.floor(segundosRestantes / 60);
  const segs = segundosRestantes % 60;
  const display = `${minutos}:${segs.toString().padStart(2, "0")}`;

  const corriendo = estado === "corriendo";
  const pausado = estado === "pausado";
  const detenido = estado === "detenido";

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-rule bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] md:bottom-4 md:left-4 md:right-auto md:w-80 md:rounded-[8px] md:border md:shadow-lg md:pb-0">
      <div className="px-4 py-3">
        {/* Header con toggle collapse */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-ink">Descanso entre series</h3>
          <button
            type="button"
            onClick={() => setColapsado(!colapsado)}
            className="size-6 grid place-items-center text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90"
            aria-label={colapsado ? "Expandir timer" : "Colapsar timer"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`size-4 transition-transform duration-200 ${colapsado ? "rotate-180" : ""}`}
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        </div>

        {!colapsado && (
          <div className="space-y-3 animate-fade-in">
            {/* Display del tiempo */}
            <div className="flex items-center justify-center">
              <span className="font-display text-5xl tabular-nums text-ink">
                {display}
              </span>
            </div>

            {/* Botones rápidos */}
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.segundos}
                  type="button"
                  onClick={() => seleccionarPreset(p.segundos)}
                  disabled={corriendo}
                  className={`flex-1 h-9 rounded-[5px] border text-sm font-medium transition-[transform,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                    segundosRestantes === p.segundos && detenido
                      ? "border-volt bg-volt text-volt-ink"
                      : "border-rule bg-paper text-ink hover:bg-paper-2"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Controles principales */}
            <div className="flex gap-2">
              {detenido && (
                <button
                  type="button"
                  onClick={iniciar}
                  className="flex-1 h-11 rounded-[5px] bg-volt text-volt-ink font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  Iniciar
                </button>
              )}

              {corriendo && (
                <>
                  <button
                    type="button"
                    onClick={pausar}
                    className="flex-1 h-11 rounded-[5px] border border-rule bg-paper text-ink font-medium transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    Pausar
                  </button>
                  <button
                    type="button"
                    onClick={resetear}
                    className="flex-1 h-11 rounded-[5px] border border-rule bg-paper text-ink font-medium transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    Resetear
                  </button>
                </>
              )}

              {pausado && (
                <>
                  <button
                    type="button"
                    onClick={reanudar}
                    className="flex-1 h-11 rounded-[5px] bg-volt text-volt-ink font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    Reanudar
                  </button>
                  <button
                    type="button"
                    onClick={resetear}
                    className="flex-1 h-11 rounded-[5px] border border-rule bg-paper text-ink font-medium transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                  >
                    Resetear
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

