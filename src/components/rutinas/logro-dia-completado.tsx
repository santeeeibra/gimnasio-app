"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  hapticoRecordPersonal,
  hapticoImpactoMedio,
  iniciarAudioHaptico,
} from "@/lib/ui/hapticos";
import {
  generarImagenDiaCompletado,
  type ColoresImagen,
} from "@/lib/logros/imagen";
import { descargarDataUrl, linkWhatsAppLogro } from "@/lib/logros/compartir";

interface LogroDiaCompletadoProps {
  abierto: boolean;
  diaTitulo: string;
  totalSeries: number;
  volumenKilos: number;
  tiempoMin: number;
  gimnasioNombre?: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
  onClose: () => void;
}

export function LogroDiaCompletado({
  abierto,
  diaTitulo,
  totalSeries,
  volumenKilos,
  tiempoMin,
  gimnasioNombre,
  logoUrl,
  colores,
  onClose,
}: LogroDiaCompletadoProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [compartiendo, setCompartiendo] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    // Háptica y fanfarria unificada SysGym (iOS Taptic + Android Vibration + Acoustic Haptics)
    hapticoRecordPersonal();
    if ("vibrate" in navigator) {
      navigator.vibrate([80, 50, 80, 50, 220]);
    }

    // Fanfarria sutil de celebración con Web Audio API (acorde C5 - E5 - G5)
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const notas = [523.25, 659.25, 783.99]; // C5, E5, G5
      notas.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const startTime = ctx.currentTime + idx * 0.12;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch (err) {
      console.warn("No se pudo reproducir audio de logro:", err);
    }
  }, [abierto]);

  async function handleCompartir() {
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    setCompartiendo(true);

    try {
      const dataUrl = await generarImagenDiaCompletado({
        diaTitulo,
        totalSeries,
        volumenKilos,
        tiempoMin,
        gimnasioNombre: gimnasioNombre || "SysGym",
        logoUrl,
        colores,
      });

      // Si el navegador soporta Web Share API con archivos (iOS Safari / Android Chrome)
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "entrenamiento-hoy.png", { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "¡Día completado! 💥",
          text: `Hoy completé ${totalSeries} series (~${volumenKilos.toLocaleString("es-AR")} kg) de ${diaTitulo} en ${gimnasioNombre || "SysGym"} 💪`,
        });
        return;
      }

      // Fallback: Descarga directa + abrir WhatsApp
      descargarDataUrl(dataUrl, `entrenamiento-${new Date().toISOString().slice(0, 10)}.png`);
      const textoWa = `¡Terminé mi entrenamiento de hoy en ${gimnasioNombre || "SysGym"}! 💥 ${totalSeries} series y ~${volumenKilos.toLocaleString("es-AR")} kg levantados.`;
      window.open(linkWhatsAppLogro(textoWa), "_blank", "noopener");
    } catch (err) {
      console.warn("No se pudo compartir:", err);
    } finally {
      setCompartiendo(false);
    }
  }

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-logro"
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[color:var(--scrim)] p-4 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-[22px] border border-accent/40 bg-paper-2 p-6 text-center shadow-2xl animate-scale-in"
      >
        {/* Halo de resplandor superior */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-40 rounded-full bg-accent/20 blur-2xl"
          aria-hidden
        />

        {/* Chispas/Partículas decorativas con aceleración GPU */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute size-1.5 rounded-full bg-accent animate-ping"
              style={{
                top: `${20 + (i * 17) % 65}%`,
                left: `${10 + (i * 23) % 80}%`,
                animationDuration: `${1.2 + (i % 3) * 0.4}s`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Trofeo triunfal animado */}
        <div className="relative mx-auto mb-4 grid size-20 place-items-center rounded-full border border-accent/40 bg-accent/15 text-accent shadow-[0_0_24px_var(--accent)] animate-trophy-pop">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-10 animate-trophy-glow"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>

        <span className="inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
          ¡Meta cumplida!
        </span>

        <h2
          id="titulo-logro"
          className="mt-2 text-2xl font-bold tracking-tight text-ink"
        >
          ¡Día completado! 💥
        </h2>
        <p className="mt-1 text-xs leading-snug text-ink-soft">
          Terminaste todas las series de <strong className="text-ink font-semibold">{diaTitulo}</strong>. Tu esfuerzo de hoy ya suma para tu progreso.
        </p>

        {/* Estadísticas finales del día */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[14px] border border-rule bg-paper p-3">
          <div>
            <div
              className="text-base font-bold text-accent"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              {totalSeries}/{totalSeries}
            </div>
            <div className="text-[10px] font-semibold uppercase text-ink-soft">
              Series
            </div>
          </div>
          <div>
            <div
              className="text-base font-bold text-ink"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              ~{volumenKilos.toLocaleString("es-AR")} kg
            </div>
            <div className="text-[10px] font-semibold uppercase text-ink-soft">
              Volumen
            </div>
          </div>
          <div>
            <div
              className="text-base font-bold text-ink"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              ~{tiempoMin}m
            </div>
            <div className="text-[10px] font-semibold uppercase text-ink-soft">
              Tiempo
            </div>
          </div>
        </div>

        {/* Botón principal: Compartir en Historias / WhatsApp */}
        <button
          type="button"
          disabled={compartiendo}
          onClick={handleCompartir}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent text-sm font-bold text-accent-ink shadow-md shadow-accent/20 transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
        >
          {compartiendo ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-accent-ink border-t-transparent" />
              <span>Generando tarjeta...</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>Compartir Historia / WhatsApp</span>
            </>
          )}
        </button>

        {/* Botón secundario: Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-10 w-full items-center justify-center rounded-[10px] text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          A descansar
        </button>
      </div>
    </div>,
    document.body,
  );
}
