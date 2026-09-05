"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function BotonInstalarApp({
  variant = "card",
  className = "",
}: {
  variant?: "card" | "button" | "banner";
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);

    // 1. Detectar si ya está instalada / abierta como PWA independiente
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    // 2. Detectar iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent;
    const esApple =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIsIOS(esApple);

    // 3. Capturar evento de instalación nativo (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  if (!montado) return null;

  // Si ya está ejecutándose como aplicación en pantalla de inicio:
  if (isStandalone) {
    if (variant === "banner") return null;
    return (
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-ok/10 border border-ok/20 text-ok text-xs font-medium ${className}`}
      >
        <CheckCircle2 className="size-4 shrink-0" />
        <span>Aplicación ya agregada a tu pantalla de inicio</span>
      </div>
    );
  }

  const handleInstalarClick = async () => {
    // Si tenemos el prompt nativo de Android / Chrome:
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // En caso de fallo inesperado, abrir modal con pasos
      }
    }

    // En iOS o navegadores que requieren pasos manuales:
    setModalAbierto(true);
  };

  return (
    <>
      {/* ── Variante TARJETA (Ideal para Ajustes o Panel) ── */}
      {variant === "card" && (
        <div
          className={`card-cut border border-rule bg-paper-2 p-5 rounded-2xl relative overflow-hidden group shadow-sm ${className}`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-volt/20 border border-volt/35 text-volt-ink dark:text-volt grid place-items-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <Smartphone className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink leading-tight">
                    Instalar en tu celular
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-volt/25 text-volt-ink dark:text-volt">
                    <Sparkles className="size-2.5" /> App
                  </span>
                </div>
                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                  {isIOS
                    ? "Agregá el acceso directo en iPhone para abrir en pantalla completa sin Safari."
                    : "Instalá la aplicación en tu inicio con 1 toque, sin pasar por tiendas."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstalarClick}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-ink text-paper hover:brightness-125 active:scale-[0.98] text-xs font-semibold shrink-0 transition-all shadow-sm w-full sm:w-auto"
            >
              <Download className="size-3.5" />
              <span>Agregar a inicio</span>
              <ArrowRight className="size-3.5 opacity-60" />
            </button>
          </div>
        </div>
      )}

      {/* ── Variante BOTÓN SUELTO (Para barras o headers) ── */}
      {variant === "button" && (
        <button
          type="button"
          onClick={handleInstalarClick}
          className={`inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/40 text-xs font-semibold text-ink transition-all active:scale-95 shadow-sm ${className}`}
        >
          <Smartphone className="size-4 text-volt" />
          <span>Agregar a inicio</span>
        </button>
      )}

      {/* ── Variante BANNER COMPACTO ── */}
      {variant === "banner" && (
        <div
          className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-rule bg-paper-2 shadow-sm ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="size-4 text-volt shrink-0" />
            <span className="text-xs text-ink font-medium truncate">
              Usá la app desde tu pantalla de inicio
            </span>
          </div>
          <button
            type="button"
            onClick={handleInstalarClick}
            className="text-xs font-bold text-ink underline underline-offset-2 shrink-0 px-2 py-1 hover:text-ink/80 transition-colors"
          >
            Instalar
          </button>
        </div>
      )}

      {/* ── MODAL DE GUÍA PASO A PASO (Especialmente para iOS Safari) ── */}
      {modalAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalAbierto(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[22px] border border-rule bg-paper p-5 shadow-2xl flex flex-col gap-4 text-ink overflow-hidden animate-slide-up"
          >
            {/* Header del modal */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-ink text-paper grid place-items-center shrink-0">
                  <Smartphone className="size-5 text-volt" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink leading-tight">
                    {isIOS ? "Instalar en tu iPhone" : "Instalar en tu inicio"}
                  </h3>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Acceso directo rápido y sin barra del navegador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="size-8 rounded-lg border border-rule bg-paper-2 text-ink-soft hover:text-ink grid place-items-center active:scale-90 transition-all"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Pasos según la plataforma */}
            {isIOS ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-2 border border-rule">
                  <div className="size-8 rounded-lg bg-blue-500/15 text-blue-500 grid place-items-center shrink-0">
                    <Share className="size-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink block">
                      1. Toca Compartir
                    </span>
                    <span className="text-ink-soft">
                      En la barra inferior de Safari (ícono del cuadrado con la
                      flecha hacia arriba).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-2 border border-rule">
                  <div className="size-8 rounded-lg bg-volt/20 text-volt-ink dark:text-volt grid place-items-center shrink-0">
                    <PlusSquare className="size-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink block">
                      2. &quot;Agregar a inicio&quot;
                    </span>
                    <span className="text-ink-soft">
                      Desplázate hacia abajo en el menú de opciones y
                      selecciónalo.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-2 border border-rule">
                  <div className="size-8 rounded-lg bg-ok/15 text-ok grid place-items-center shrink-0">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink block">
                      3. Toca &quot;Agregar&quot;
                    </span>
                    <span className="text-ink-soft">
                      Arriba a la derecha. ¡Listo! Ya tenés el ícono en tu pantalla
                      de inicio.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-2 border border-rule">
                  <div className="size-8 rounded-lg bg-blue-500/15 text-blue-500 font-bold grid place-items-center shrink-0 text-xs">
                    ⋮
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink block">
                      1. Menú del navegador
                    </span>
                    <span className="text-ink-soft">
                      Toca los 3 puntos en la esquina superior de Chrome.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-2 border border-rule">
                  <div className="size-8 rounded-lg bg-volt/20 text-volt-ink dark:text-volt grid place-items-center shrink-0">
                    <Download className="size-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-ink block">
                      2. Instalar aplicación
                    </span>
                    <span className="text-ink-soft">
                      Selecciona &quot;Instalar app&quot; o &quot;Agregar a la pantalla
                      principal&quot;.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de cerrar / entendido */}
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="w-full h-11 rounded-xl bg-ink text-paper text-xs font-semibold hover:brightness-125 active:scale-[0.98] transition-all shadow-sm mt-1"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
