"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [
  { label: "30s", segundos: 30 },
  { label: "1min", segundos: 60 },
  { label: "90s", segundos: 90 },
  { label: "2min", segundos: 120 },
];

type Estado = "detenido" | "corriendo" | "pausado";

const LS_KEY = "gym.timer-descanso.v1";

type Persistido = {
  estado: Estado;
  /** Duración elegida (preset activo). */
  presetSeg: number;
  /** Remanente congelado, sólo válido en "detenido" / "pausado". */
  segundosRestantes: number;
  /** Epoch ms del fin, sólo válido en "corriendo". */
  finEn: number | null;
};

function leer(): Persistido | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persistido;
    if (!p || typeof p !== "object") return null;
    return p;
  } catch {
    return null;
  }
}

function guardar(p: Persistido) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* storage bloqueado/lleno: el timer sigue en memoria igual */
  }
}

export function TimerDescanso() {
  const [presetSeg, setPresetSeg] = useState(60);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const [estado, setEstado] = useState<Estado>("detenido");
  const [colapsado, setColapsado] = useState(true);
  const [hidratado, setHidratado] = useState(false);
  const finEnRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Hidratar desde localStorage al montar. Si el descanso corría, recalcula el
  // remanente contra el reloj real (sobrevive navegación entre apartados y
  // reload / reapertura de la PWA).
  useEffect(() => {
    const p = leer();
    if (p) {
      const preset = p.presetSeg > 0 ? p.presetSeg : 60;
      setPresetSeg(preset);
      if (p.estado === "corriendo" && p.finEn) {
        const rem = Math.round((p.finEn - Date.now()) / 1000);
        if (rem > 0) {
          finEnRef.current = p.finEn;
          setSegundosRestantes(rem);
          setEstado("corriendo");
        } else {
          // Terminó mientras no estábamos en pantalla: no suena (el audio
          // necesita gesto del usuario), sólo vuelve al preset.
          setSegundosRestantes(preset);
          setEstado("detenido");
        }
      } else if (p.estado === "pausado") {
        setSegundosRestantes(p.segundosRestantes > 0 ? p.segundosRestantes : preset);
        setEstado("pausado");
      } else {
        setSegundosRestantes(preset);
        setEstado("detenido");
      }
    }
    setHidratado(true);
  }, []);

  // Persistir cambios relevantes (después de hidratar, para no pisar con los
  // valores por defecto del primer render).
  useEffect(() => {
    if (!hidratado) return;
    guardar({
      estado,
      presetSeg,
      segundosRestantes,
      finEn: estado === "corriendo" ? finEnRef.current : null,
    });
  }, [hidratado, estado, presetSeg, segundosRestantes]);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Countdown: el valor sale siempre de `finEnRef` (reloj real), así no hay
  // drift aunque el tab estuviera en segundo plano.
  useEffect(() => {
    if (estado !== "corriendo") return;

    const tick = () => {
      const fin = finEnRef.current;
      if (fin == null) return;
      const rem = Math.round((fin - Date.now()) / 1000);
      if (rem <= 0) {
        setEstado("detenido");
        finEnRef.current = null;
        if (intervalRef.current) clearInterval(intervalRef.current);
        reproducirBeep();
        vibrar();
        setSegundosRestantes(presetSeg);
        return;
      }
      setSegundosRestantes(rem);
    };

    tick(); // inmediato: al volver a la pantalla no espera 1s
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [estado, presetSeg]);

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
    finEnRef.current = Date.now() + segundosRestantes * 1000;
    setEstado("corriendo");
  }

  function pausar() {
    const fin = finEnRef.current;
    if (fin != null) {
      setSegundosRestantes(Math.max(0, Math.round((fin - Date.now()) / 1000)));
    }
    finEnRef.current = null;
    setEstado("pausado");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reanudar() {
    finEnRef.current = Date.now() + segundosRestantes * 1000;
    setEstado("corriendo");
  }

  function resetear() {
    finEnRef.current = null;
    setEstado("detenido");
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSegundosRestantes(presetSeg);
  }

  function seleccionarPreset(seg: number) {
    setPresetSeg(seg);
    setSegundosRestantes(seg);
    finEnRef.current = null;
    if (estado !== "detenido") {
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

  // Mobile: MiBottomNav (~38px + safe-area, z-40) vive en bottom-0. El timer
  // queda sticky en bottom-20 con z-50, separado de las tarjetas de ejercicios.

  // Colapsado: botón flotante circular. Muestra la cuenta regresiva si corre.
  if (colapsado) {
    return (
      <button
        type="button"
        onClick={() => setColapsado(false)}
        aria-label="Abrir descanso entre series"
        className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full border border-rule bg-paper/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 md:bottom-4"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-5 text-ink"
          aria-hidden
        >
          <path d="M9 2h6M12 8v5l3 2" />
          <circle cx="12" cy="13" r="8" />
        </svg>
        {corriendo || pausado ? (
          <span className="font-display text-sm tabular-nums text-ink">
            {display}
          </span>
        ) : (
          <span className="text-sm font-medium text-ink">Descanso</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 inset-x-0 z-50 border-y border-rule bg-paper/95 backdrop-blur-sm md:bottom-4 md:inset-x-auto md:left-4 md:right-auto md:w-80 md:rounded-[8px] md:border md:shadow-lg">
      <div className="px-4 py-3">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-ink">Descanso entre series</h3>
          <button
            type="button"
            onClick={() => setColapsado(true)}
            className="size-6 shrink-0 grid place-items-center text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90"
            aria-label="Cerrar timer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {(
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
                    presetSeg === p.segundos && detenido
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
