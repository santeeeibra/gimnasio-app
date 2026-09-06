"use client";

import { useEffect, useRef, useState } from "react";
import { hapticoTimerFin, hapticoImpactoMedio } from "@/lib/ui/hapticos";

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
  const [justStarted, setJustStarted] = useState(false);
  const [alertFinalizado, setAlertFinalizado] = useState(false);
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

  // Escuchar evento global "timer:iniciar" para sincronizar el cronómetro automáticamente
  useEffect(() => {
    const handleTimerIniciar = (e: CustomEvent<{ segundos?: number }>) => {
      const segs = e.detail?.segundos || 60;
      if (segs > 0) {
        setColapsado(false);
        setPresetSeg(segs);
        finEnRef.current = Date.now() + segs * 1000;
        setSegundosRestantes(segs);
        setEstado("corriendo");
        hapticoImpactoMedio();
      }
    };

    window.addEventListener("timer:iniciar", handleTimerIniciar as EventListener);
    return () => {
      window.removeEventListener("timer:iniciar", handleTimerIniciar as EventListener);
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
        vibrarFinalizado();
        setAlertFinalizado(true);
        setSegundosRestantes(presetSeg);
        setTimeout(() => setAlertFinalizado(false), 2800);
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
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (err) {
      console.warn("No se pudo reproducir beep:", err);
    }
  }

  function vibrarFinalizado() {
    hapticoTimerFin();
    if ("vibrate" in navigator) {
      navigator.vibrate([150, 70, 150]);
    }
  }

  function vibrarInicio() {
    hapticoImpactoMedio();
    if ("vibrate" in navigator) {
      navigator.vibrate(35);
    }
  }

  function iniciar() {
    finEnRef.current = Date.now() + segundosRestantes * 1000;
    setEstado("corriendo");
    setJustStarted(true);
    setAlertFinalizado(false);
    vibrarInicio();
    setTimeout(() => setJustStarted(false), 500);
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
    setJustStarted(true);
    setAlertFinalizado(false);
    vibrarInicio();
    setTimeout(() => setJustStarted(false), 500);
  }

  function resetear() {
    finEnRef.current = null;
    setEstado("detenido");
    setAlertFinalizado(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSegundosRestantes(presetSeg);
  }

  function seleccionarPreset(seg: number) {
    setPresetSeg(seg);
    setSegundosRestantes(seg);
    setAlertFinalizado(false);
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
  const pctRestante = Math.max(0, Math.min(100, Math.round((segundosRestantes / presetSeg) * 100)));

  // Posición flotante con persistencia en sesión (en memoria de componente / session)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, elemX: 0, elemY: 0, hasMoved: false });

  // Posición inicial por defecto al montar en cliente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Por defecto abajo a la derecha, por encima de la bottom nav (~70px)
    const initX = Math.max(16, w - 170);
    const initY = Math.max(20, h - 130);
    setPos({ x: initX, y: initY });
  }, []);

  // Mantener dentro del viewport al rotar o redimensionar
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (!prev) return prev;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const elemWidth = colapsado ? 160 : 300;
        const elemHeight = colapsado ? 48 : 220;
        const margin = 12;
        const bottomNavHeight = 70;
        const topMargin = 10;

        const maxX = Math.max(margin, w - elemWidth - margin);
        const maxY = Math.max(topMargin, h - bottomNavHeight - elemHeight - margin);

        return {
          x: Math.max(margin, Math.min(maxX, prev.x)),
          y: Math.max(topMargin, Math.min(maxY, prev.y)),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [colapsado]);

  function snapToClosestEdge(currentX: number, currentY: number) {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const elemWidth = containerRef.current?.offsetWidth || 160;
    const elemHeight = containerRef.current?.offsetHeight || 48;
    const margin = 12;
    const bottomNavHeight = 70;
    const topMargin = 10;

    const minX = margin;
    const maxX = Math.max(margin, w - elemWidth - margin);
    const minY = topMargin;
    const maxY = Math.max(topMargin, h - bottomNavHeight - elemHeight - margin);

    const midPointX = w / 2;
    const targetX = currentX + elemWidth / 2 < midPointX ? minX : maxX;
    const targetY = Math.max(minY, Math.min(maxY, currentY));

    setSnapping(true);
    setPos({ x: targetX, y: targetY });
    setTimeout(() => setSnapping(false), 280);
  }

  function onPointerDown(e: React.PointerEvent) {
    // Solo click primario / touch
    if (e.button !== undefined && e.button !== 0) return;
    // Si se hizo click sobre botones o controles internos cuando está expandido, no arrastrar
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }

    setIsDragging(true);
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elemX: pos?.x ?? 16,
      elemY: pos?.y ?? 100,
      hasMoved: false,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragInfoRef.current.startX;
      const dy = moveEvent.clientY - dragInfoRef.current.startY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragInfoRef.current.hasMoved = true;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      const elemWidth = containerRef.current?.offsetWidth || 160;
      const elemHeight = containerRef.current?.offsetHeight || 48;
      const margin = 8;
      const bottomNavHeight = 66;
      const topMargin = 8;

      let nextX = dragInfoRef.current.elemX + dx;
      let nextY = dragInfoRef.current.elemY + dy;

      // Delimitación al viewport visible sin tapar la bottom nav ni salir de pantalla
      nextX = Math.max(margin, Math.min(w - elemWidth - margin, nextX));
      nextY = Math.max(topMargin, Math.min(h - bottomNavHeight - elemHeight - margin, nextY));

      setPos({ x: nextX, y: nextY });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (dragInfoRef.current.hasMoved) {
        // Soltado tras arrastre: snap al borde más próximo si está colapsado
        setPos((latest) => {
          if (!latest) return latest;
          if (colapsado) {
            snapToClosestEdge(latest.x, latest.y);
          }
          return latest;
        });
      } else {
        // Fue un tap limpio sin arrastre: toggle in situ
        // Mismo camino que el botón de cerrar: al expandir hay que reencuadrar
        // el panel para que no quede cortado contra el borde o la bottom nav.
        toggleExpandirInSitu(!colapsado);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  // Ajustar posición al expandirse para que no desborde hacia la derecha o hacia abajo
  function toggleExpandirInSitu(nuevaColapsada: boolean) {
    setColapsado(nuevaColapsada);
    if (!nuevaColapsada && pos && typeof window !== "undefined") {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const panelWidth = Math.min(300, w - 24);
      const panelHeight = 240;
      const margin = 12;
      const bottomNavHeight = 70;
      const topMargin = 10;

      const maxX = Math.max(margin, w - panelWidth - margin);
      const maxY = Math.max(topMargin, h - bottomNavHeight - panelHeight - margin);

      const clampedX = Math.max(margin, Math.min(maxX, pos.x));
      const clampedY = Math.max(topMargin, Math.min(maxY, pos.y));
      setPos({ x: clampedX, y: clampedY });
    }
  }

  if (!pos) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        touchAction: "none",
      }}
      className={`fixed top-0 left-0 z-50 select-none ${
        snapping
          ? "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.9,0.3,1.2)]"
          : isDragging
          ? "cursor-grabbing opacity-95"
          : "cursor-grab"
      }`}
    >
      {colapsado ? (
        /* Modo Colapsado: Píldora táctil ergonómica (mínimo 48px de alto, cumple WCAG §3) */
        <div
          role="button"
          tabIndex={0}
          aria-label={alertFinalizado ? "Descanso terminado. Abrir timer" : "Abrir descanso entre series"}
          className={`flex h-12 min-w-[48px] items-center gap-2.5 rounded-full border bg-paper/95 px-3 py-1.5 shadow-xl backdrop-blur-md transition-[transform,border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            alertFinalizado
              ? "border-accent bg-accent/15 text-accent shadow-[0_0_16px_var(--accent)] animate-timer-alert"
              : corriendo
              ? "border-accent/80 animate-timer-breathe"
              : justStarted
              ? "border-accent animate-timer-ripple"
              : "border-rule"
          }`}
        >
          <div
            className={`relative grid size-8 shrink-0 place-items-center rounded-full border transition-colors ${
              alertFinalizado
                ? "border-accent bg-accent text-accent-ink"
                : corriendo
                ? "border-accent/40 bg-accent text-accent-ink shadow-[0_0_10px_var(--ring)]"
                : "bg-paper-2 text-ink"
            }`}
          >
            {/* Anillo perimetral SVG para cuenta regresiva */}
            {corriendo && (
              <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-rule/40"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={87.96}
                  strokeDashoffset={87.96 - (87.96 * pctRestante) / 100}
                  className="text-accent-ink transition-[stroke-dashoffset] duration-1000 linear"
                />
              </svg>
            )}
            {alertFinalizado ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 animate-pop-in">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`size-4 ${corriendo ? "animate-pulse" : ""}`}
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
          </div>
          <div className="flex flex-col pr-1.5">
            <span
              className={`text-[13.5px] font-bold tabular-nums leading-tight ${
                alertFinalizado
                  ? "text-accent font-extrabold tracking-wide animate-pop-in"
                  : corriendo
                  ? "text-accent"
                  : "text-ink"
              }`}
              style={{ fontFamily: "var(--font-hero)" }}
            >
              {alertFinalizado ? "¡LISTO!" : display}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">
              {alertFinalizado ? "A entrenar" : corriendo ? "Descanso" : pausado ? "Pausado" : "Timer"}
            </span>
          </div>
        </div>
      ) : (
        /* Modo Expandido In-Situ: Panel completo con presets y controles */
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-[290px] max-w-[calc(100vw-24px)] rounded-[16px] border bg-paper/95 p-4 shadow-2xl backdrop-blur-md animate-fade-in transition-[border-color,box-shadow] duration-200 ${
            alertFinalizado
              ? "border-accent ring-2 ring-accent/60 shadow-[0_0_24px_var(--accent)] animate-timer-flash"
              : corriendo
              ? "border-accent/50 shadow-xl"
              : "border-rule"
          }`}
        >
          {/* Header con botón cerrar */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Descanso entre series
            </h3>
            <button
              type="button"
              onClick={() => toggleExpandirInSitu(true)}
              className="size-9 shrink-0 grid place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 hover:text-ink"
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

          <div className="space-y-3">
            {/* Display de tiempo grande monoespaciado */}
            <div className="flex flex-col items-center justify-center py-2">
              {alertFinalizado ? (
                <div className="flex flex-col items-center py-1 animate-pop-in">
                  <span
                    className="text-3xl font-bold tracking-tight text-accent animate-bounce"
                    style={{ fontFamily: "var(--font-hero)" }}
                  >
                    ¡A ENTRENAR!
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-ink-soft">
                    Descanso completado
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center py-1 ${justStarted ? "animate-timer-ripple" : ""}`}>
                  <span
                    className={`text-4xl font-bold tabular-nums tracking-tight transition-colors ${
                      corriendo
                        ? "text-accent drop-shadow-[0_0_12px_var(--ring)]"
                        : pausado
                        ? "text-warn"
                        : "text-ink"
                    }`}
                    style={{ fontFamily: "var(--font-hero)" }}
                  >
                    {display}
                  </span>
                  {corriendo && (
                    <span className="mt-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent animate-pulse">
                      <span className="size-1.5 rounded-full bg-accent" />
                      Descanso en curso
                    </span>
                  )}
                </div>
              )}

              {/* Barra de progreso de descanso */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-rule bg-paper-2">
                <div
                  className={`h-full transition-[width] duration-1000 linear ${
                    alertFinalizado
                      ? "bg-accent w-full"
                      : corriendo
                      ? "bg-accent"
                      : "bg-ink-soft/40"
                  }`}
                  style={{ width: `${alertFinalizado ? 100 : pctRestante}%` }}
                />
              </div>
            </div>

            {/* Presets rápidos (44px de alto para cumplir WCAG §3) */}
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.segundos}
                  type="button"
                  onClick={() => seleccionarPreset(p.segundos)}
                  disabled={corriendo}
                  className={`h-11 rounded-[10px] border text-xs font-bold transition-[transform,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                    presetSeg === p.segundos && detenido
                      ? "border-accent bg-accent text-accent-ink shadow-sm"
                      : "border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper"
                  }`}
                  style={{ fontFamily: "var(--font-hero)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Controles principales (44px) */}
            <div className="flex gap-2 pt-1">
              {detenido && (
                <button
                  type="button"
                  onClick={iniciar}
                  className="flex-1 h-11 rounded-[12px] bg-accent text-accent-ink font-bold text-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 shadow-sm"
                >
                  Iniciar
                </button>
              )}

              {corriendo && (
                <>
                  <button
                    type="button"
                    onClick={pausar}
                    className="flex-1 h-11 rounded-[12px] border border-rule bg-paper-2 text-ink font-semibold text-sm transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    Pausar
                  </button>
                  <button
                    type="button"
                    onClick={resetear}
                    className="flex-1 h-11 rounded-[12px] border border-rule bg-paper-2 text-ink font-semibold text-sm transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
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
                    className="flex-1 h-11 rounded-[12px] bg-accent text-accent-ink font-bold text-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 shadow-sm"
                  >
                    Reanudar
                  </button>
                  <button
                    type="button"
                    onClick={resetear}
                    className="flex-1 h-11 rounded-[12px] border border-rule bg-paper-2 text-ink font-semibold text-sm transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    Resetear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
