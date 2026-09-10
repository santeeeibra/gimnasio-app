"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  hapticoRecordPersonal,
  hapticoImpactoMedio,
  hapticoImpactoSuave,
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setPreviewUrl(null);
      return;
    }

    // Háptica y fanfarria unificada SysGym
    hapticoRecordPersonal();
    if ("vibrate" in navigator) {
      navigator.vibrate([80, 50, 80, 50, 220]);
    }

    // Generar la tarjeta instantáneamente en segundo plano para vista previa
    generarImagenDiaCompletado({
      diaTitulo,
      totalSeries,
      volumenKilos,
      tiempoMin,
      gimnasioNombre: gimnasioNombre || "SysGym",
      logoUrl,
      colores,
    })
      .then((url) => setPreviewUrl(url))
      .catch((err) => console.warn("Error generando preview de logro:", err));

    // Fanfarria armónica con Web Audio API (C5 - E5 - G5)
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
  }, [abierto, diaTitulo, totalSeries, volumenKilos, tiempoMin, gimnasioNombre, logoUrl, colores]);

  async function handleCompartir() {
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    setCompartiendo(true);

    try {
      const dataUrl =
        previewUrl ||
        (await generarImagenDiaCompletado({
          diaTitulo,
          totalSeries,
          volumenKilos,
          tiempoMin,
          gimnasioNombre: gimnasioNombre || "SysGym",
          logoUrl,
          colores,
        }));

      // Si el navegador soporta Web Share API con archivos (iOS Safari / Android Chrome)
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `entrenamiento-${diaTitulo.toLowerCase().replace(/\s+/g, "-")}.png`, {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "¡Día completado en SysGym! 💥",
          text: `Hoy metí ${totalSeries} series (~${volumenKilos.toLocaleString("es-AR")} kg) de ${diaTitulo} 💪 Registrado con SysGym`,
        });
        return;
      }

      // Fallback: Descarga directa + abrir WhatsApp
      descargarDataUrl(dataUrl, `sysgym-${diaTitulo.toLowerCase().replace(/\s+/g, "-")}.png`);
      const textoWa = `¡Terminé mi entrenamiento de hoy! 💥 ${totalSeries} series y ~${volumenKilos.toLocaleString("es-AR")} kg acumulados. Mirá mi tarjeta en historias 🔥`;
      window.open(linkWhatsAppLogro(textoWa), "_blank", "noopener");
    } catch (err) {
      console.warn("No se pudo compartir:", err);
    } finally {
      setCompartiendo(false);
    }
  }

  function handleDescargarDirecta() {
    if (!previewUrl) return;
    hapticoImpactoSuave();
    descargarDataUrl(
      previewUrl,
      `sysgym-${diaTitulo.toLowerCase().replace(/\s+/g, "-")}.png`
    );
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
        className="relative w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-[24px] border border-accent/40 bg-paper-2 p-5 text-center shadow-2xl animate-scale-in"
      >
        {/* Halo de resplandor superior */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-40 rounded-full bg-accent/20 blur-2xl"
          aria-hidden
        />

        {/* Chispas/Partículas decorativas con aceleración GPU */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="absolute size-1.5 rounded-full bg-accent animate-ping"
              style={{
                top: `${15 + (i * 20) % 70}%`,
                left: `${10 + (i * 25) % 80}%`,
                animationDuration: `${1.4 + (i % 3) * 0.3}s`,
                animationDelay: `${i * 0.1}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Badge superior */}
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-accent border border-accent/30">
            <span>⚡</span>
            <span>Meta Cumplida</span>
          </span>
        </div>

        <h2
          id="titulo-logro"
          className="mt-1 text-2xl font-black tracking-tight text-ink"
        >
          ¡Sesión Liquidada! 💥
        </h2>
        <p className="mt-0.5 text-xs text-ink-soft">
          Completaste todas las series de <strong className="text-ink font-semibold">{diaTitulo}</strong>.
        </p>

        {/* Miniatura visual de la historia estilo Instagram Story */}
        <div className="mt-3.5 relative mx-auto w-40 aspect-[9/16] overflow-hidden rounded-[16px] border-2 border-accent/50 bg-[#08090d] shadow-xl group">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Historia para Instagram"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
              <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="mt-2 text-[10px] text-ink-soft">Renderizando HUD...</span>
            </div>
          )}

          {/* Badge flotante sobre la miniatura */}
          <div className="absolute top-2 left-2 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-accent border border-white/10">
            9:16 Story
          </div>
        </div>

        {/* Resumen métrico rápido */}
        <div className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-[12px] border border-rule bg-paper p-2.5">
          <div>
            <div
              className="text-sm font-extrabold text-accent"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              {totalSeries}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
              Series
            </div>
          </div>
          <div>
            <div
              className="text-sm font-extrabold text-ink"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              ~{volumenKilos.toLocaleString("es-AR")} kg
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
              Tonelaje
            </div>
          </div>
          <div>
            <div
              className="text-sm font-extrabold text-ink"
              style={{ fontFamily: "var(--font-hero)" }}
            >
              ~{tiempoMin}m
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-ink-soft">
              Duración
            </div>
          </div>
        </div>

        {/* Botón principal: Compartir directo en Historias de Instagram */}
        <button
          type="button"
          disabled={compartiendo}
          onClick={handleCompartir}
          className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-accent text-sm font-black text-accent-ink shadow-lg shadow-accent/25 transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60 cursor-pointer"
        >
          {compartiendo ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-accent-ink border-t-transparent" />
              <span>Abriendo historias...</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>Subir a Historias de Instagram</span>
            </>
          )}
        </button>

        {/* Botones secundarios: Descargar y Cerrar */}
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDescargarDirecta}
            disabled={!previewUrl}
            className="text-xs font-semibold text-ink-soft hover:text-ink transition-colors flex items-center gap-1 py-1 px-2 rounded-[8px] hover:bg-paper"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Guardar imagen</span>
          </button>
          <span className="text-rule">•</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-ink-soft hover:text-ink transition-colors py-1 px-2 rounded-[8px] hover:bg-paper"
          >
            A descansar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
