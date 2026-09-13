"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hapticoTimerFin, hapticoImpactoMedio } from "@/lib/ui/hapticos";

const PRESETS = [
  { label: "30s", segundos: 30 },
  { label: "1min", segundos: 60 },
  { label: "90s", segundos: 90 },
  { label: "2min", segundos: 120 },
];

type Estado = "detenido" | "corriendo" | "pausado";

// ATP Recovery Engine Adaptativo: sugiere el descanso según la proximidad al
// fallo (RIR) reportada por la serie recién completada. A menor RIR (más
// cerca del fallo), más tiempo necesita el sistema fosfágeno para recuperar
// potencia.
function sugerirDescansoPorRir(rir: number): number {
  if (rir <= 0) return 180; // Fallo muscular / RIR 0
  if (rir <= 2) return 120; // Intenso: RIR 1-2
  return 60; // Liviano: RIR 3+
}

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

// Push diferido: si el alumno bloquea el teléfono entre series, el aviso local
// (beep + vibración) no corre. Registramos un push en el server que dispara un
// cron cuando el descanso termina. Fire-and-forget: nunca frena la UI.
function programarPushDescanso(segundos: number) {
  try {
    fetch("/api/rutina/timer-push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segundos }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sin red / SSR: el timer local sigue funcionando */
  }
}

function cancelarPushDescanso() {
  try {
    fetch("/api/rutina/timer-push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cancelar: true }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* idem */
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
  const [hayModalAbierto, setHayModalAbierto] = useState(false);
  const finEnRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);
  const atpBarRef = useRef<HTMLDivElement>(null);

  // Ocultar píldora flotante si hay un modal o diálogo activo en la pantalla
  useEffect(() => {
    if (typeof document === "undefined") return;

    const evaluarModal = () => {
      const modal = document.querySelector('[role="dialog"]');
      setHayModalAbierto(Boolean(modal));
    };

    evaluarModal();
    const observer = new MutationObserver(evaluarModal);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Screen WakeLock: Mantiene la pantalla encendida y previene el bloqueo automático
  // del celular durante el descanso. Se libera apenas el timer termina, pausa o resetea.
  useEffect(() => {
    let activo = true;

    async function solicitarWakeLock() {
      if (
        typeof navigator !== "undefined" &&
        "wakeLock" in navigator &&
        !wakeLockRef.current
      ) {
        try {
          const wl = await (navigator as any).wakeLock.request("screen");
          if (!activo) {
            wl.release().catch(() => {});
            return;
          }
          wakeLockRef.current = wl;
          wl.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        } catch {
          /* batería baja o permiso restringido por el SO: no bloquear */
        }
      }
    }

    function soltarWakeLock() {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }

    if (estado === "corriendo") {
      solicitarWakeLock();
    } else {
      soltarWakeLock();
    }

    const handleVisibilidad = () => {
      if (document.visibilityState === "visible" && estado === "corriendo") {
        solicitarWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilidad);

    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", handleVisibilidad);
      soltarWakeLock();
    };
  }, [estado]);

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

  // Escuchar evento global "timer:iniciar" para sincronizar el cronómetro automáticamente.
  // Si viene `rir` (proximidad al fallo de la serie recién completada), el
  // ATP Recovery Engine sugiere el descanso en lugar de usar `segundos` fijo.
  useEffect(() => {
    const handleTimerIniciar = (e: CustomEvent<{ segundos?: number; rir?: number }>) => {
      const rir = e.detail?.rir;
      const segs =
        typeof rir === "number" ? sugerirDescansoPorRir(rir) : e.detail?.segundos || 60;
      if (segs > 0) {
        setPresetSeg(segs);
        finEnRef.current = Date.now() + segs * 1000;
        setSegundosRestantes(segs);
        setEstado("corriendo");
        setAlertFinalizado(false);
        setJustStarted(true);
        programarPushDescanso(segs);
        hapticoImpactoMedio();
        setTimeout(() => setJustStarted(false), 500);
      }
    };

    window.addEventListener("timer:iniciar", handleTimerIniciar as EventListener);
    return () => {
      window.removeEventListener("timer:iniciar", handleTimerIniciar as EventListener);
    };
  }, []);

  // Countdown: el valor sale siempre de `finEnRef` (reloj real), así no hay
  // drift aunque el tab estuviera en segundo plano.
  const ultimoBeepRef = useRef<number | null>(null);

  useEffect(() => {
    if (estado !== "corriendo") return;

    const tick = () => {
      const fin = finEnRef.current;
      if (fin == null) return;
      const rem = Math.round((fin - Date.now()) / 1000);

      // Beeps de aviso previo en los últimos 3 segundos (3, 2, 1)
      if (rem <= 3 && rem >= 1 && ultimoBeepRef.current !== rem) {
        ultimoBeepRef.current = rem;
        reproducirBeepCountdown(rem);
      }

      if (rem <= 0) {
        ultimoBeepRef.current = null;
        setEstado("detenido");
        finEnRef.current = null;
        if (intervalRef.current) clearInterval(intervalRef.current);
        cancelarPushDescanso(); // el aviso local ya sonó; no dupliques por push
        reproducirAlarmaFinal();
        vibrarFinalizado();
        dispararNotificacionLocal();
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

  function reproducirBeepCountdown(seg: number) {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Frecuencias ascendentes: 3 -> 440Hz, 2 -> 494Hz, 1 -> 587Hz
      const freq = seg === 3 ? 440 : seg === 2 ? 493.88 : 587.33;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = "sine";

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    } catch (err) {
      console.warn("No se pudo reproducir beep countdown:", err);
    }
  }

  function reproducirAlarmaFinal() {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      // Doble tono triunfal tipo campana de boxeo / timer de gym: 880Hz -> 1046.5Hz
      const notas = [880, 1046.5];
      notas.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + idx * 0.15;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.start(startTime);
        osc.stop(startTime + 0.46);
      });
    } catch (err) {
      console.warn("No se pudo reproducir alarma final:", err);
    }
  }

  function vibrarFinalizado() {
    hapticoTimerFin();
    if ("vibrate" in navigator) {
      navigator.vibrate([150, 70, 150]);
    }
  }

  function dispararNotificacionLocal() {
    try {
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.showNotification("¡Descanso terminado! 💪", {
                body: "A darle a la siguiente serie",
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: "timer-descanso",
                vibrate: [150, 70, 150],
              } as any);
            })
            .catch(() => {});
        } else {
          new Notification("¡Descanso terminado! 💪", {
            body: "A darle a la siguiente serie",
            icon: "/icon-192.png",
            tag: "timer-descanso",
          });
        }
      }
    } catch {
      /* Notificaciones bloqueadas o sin soporte: no interferir con el timer */
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
    programarPushDescanso(segundosRestantes);
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
    cancelarPushDescanso();
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function reanudar() {
    finEnRef.current = Date.now() + segundosRestantes * 1000;
    setEstado("corriendo");
    setJustStarted(true);
    setAlertFinalizado(false);
    programarPushDescanso(segundosRestantes);
    vibrarInicio();
    setTimeout(() => setJustStarted(false), 500);
  }

  function resetear() {
    finEnRef.current = null;
    setEstado("detenido");
    setAlertFinalizado(false);
    cancelarPushDescanso();
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
      cancelarPushDescanso();
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

  // Barra "ATP Recovery": snapea sin transición cuando el timer no corre
  // (detenido/pausado/reset) para reflejar el % ya recuperado en ese instante.
  useEffect(() => {
    const el = atpBarRef.current;
    if (!el || estado === "corriendo") return;
    const pctRecuperado = 100 - pctRestante;
    el.style.transition = "none";
    el.style.transform = `scaleX(${Math.max(0, Math.min(100, pctRecuperado)) / 100})`;
  }, [estado, pctRestante]);

  // Barra "ATP Recovery": al iniciar/reanudar dispara UNA transición CSS
  // lineal de duración exacta hasta scaleX(1) — compositor-only (transform),
  // 60fps sin re-renders por frame ni animación JS.
  useEffect(() => {
    const el = atpBarRef.current;
    if (!el || estado !== "corriendo" || !finEnRef.current) return;
    const remainingMs = Math.max(0, finEnRef.current - Date.now());
    const pctYaRecuperado =
      presetSeg > 0
        ? Math.max(0, Math.min(100, 100 - (remainingMs / 1000 / presetSeg) * 100))
        : 0;
    el.style.transition = "none";
    el.style.transform = `scaleX(${pctYaRecuperado / 100})`;
    // Forzar reflow para que el siguiente cambio sí dispare la transición.
    void el.offsetHeight;
    el.style.transition = `transform ${remainingMs}ms linear`;
    el.style.transform = "scaleX(1)";
  }, [estado]);

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
        const elemWidth = 160;
        const elemHeight = 48;
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
  }, []);

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

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== undefined && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("input")) {
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elemX: pos?.x ?? 16,
      elemY: pos?.y ?? 100,
      hasMoved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const dx = e.clientX - dragInfoRef.current.startX;
    const dy = e.clientY - dragInfoRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragInfoRef.current.hasMoved = true;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const elemWidth = containerRef.current?.offsetWidth || 160;
    const elemHeight = containerRef.current?.offsetHeight || 48;
    const margin = 8;
    const bottomNavHeight = 70;
    const topMargin = 10;

    let nextX = dragInfoRef.current.elemX + dx;
    let nextY = dragInfoRef.current.elemY + dy;

    nextX = Math.max(margin, Math.min(w - elemWidth - margin, nextX));
    nextY = Math.max(topMargin, Math.min(h - bottomNavHeight - elemHeight - margin, nextY));

    setPos({ x: nextX, y: nextY });
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (dragInfoRef.current.hasMoved) {
      setPos((latest) => {
        if (!latest) return latest;
        snapToClosestEdge(latest.x, latest.y);
        return latest;
      });
    } else {
      setColapsado(false);
    }
  }

  if (!pos || typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Modo Colapsado: Píldora táctil ergonómica arrastrable */}
      {colapsado && !hayModalAbierto && (
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            touchAction: "none",
          }}
          className={`fixed top-0 left-0 z-30 select-none ${
            snapping
              ? "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.9,0.3,1.2)]"
              : isDragging
              ? "cursor-grabbing opacity-95 scale-105"
              : "cursor-grab"
          }`}
        >
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
        </div>
      )}

      {/* Modo Expandido: Modal centrado con Backdrop estilo iOS */}
      {!colapsado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setColapsado(true)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Descanso entre series"
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full max-w-[320px] rounded-[20px] border bg-paper p-5 shadow-2xl backdrop-blur-xl animate-fade-in transition-[border-color,box-shadow] duration-200 ${
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
                onClick={() => setColapsado(true)}
                className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 hover:text-ink"
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

                {/* Barra "ATP Recovery": recuperación estimada de potencia (0%→100%),
                    animada con transform:scaleX (compositor-only, 60fps). */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-rule bg-paper-2">
                  <div
                    ref={atpBarRef}
                    className={`h-full w-full origin-left will-change-transform ${
                      alertFinalizado
                        ? "bg-accent"
                        : corriendo
                        ? "bg-accent"
                        : "bg-ink-soft/40"
                    }`}
                    style={{ transform: `scaleX(${alertFinalizado ? 1 : (100 - pctRestante) / 100})` }}
                  />
                </div>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
                  Recuperación ATP · {alertFinalizado ? 100 : 100 - pctRestante}%
                </span>
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
        </div>
      )}
    </>,
    document.body,
  );
}
