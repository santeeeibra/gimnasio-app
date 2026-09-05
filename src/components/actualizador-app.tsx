"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";

export function ActualizadorApp() {
  const [hayActualizacion, setHayActualizacion] = useState(false);
  const [nuevoCommit, setNuevoCommit] = useState<string | null>(null);
  const [actualizando, setActualizando] = useState(false);
  const [descartado, setDescartado] = useState(false);
  const initialCommitRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function verificar() {
      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const commit = data.commit as string;

        if (!initialCommitRef.current) {
          // Primera carga: memorizamos el commit con el que abrió la app
          initialCommitRef.current = commit;
        } else if (commit && commit !== initialCommitRef.current && !cancelado) {
          // El commit cambió (el desarrollador hizo push de una nueva versión)
          setNuevoCommit(commit);
          setHayActualizacion(true);
          setDescartado(false);

          // Háptica suave de notificación
          if ("vibrate" in navigator) {
            navigator.vibrate([60, 40, 60]);
          }
        }
      } catch {
        // Red offline o error temporal: se reintenta en el próximo ciclo
      }
    }

    // Verificación inicial
    verificar();

    // Verificación periódica cada 45 segundos
    const intervalo = setInterval(verificar, 45000);

    // Verificación instantánea cuando el usuario vuelve a abrir la app o cambia de pestaña
    function alVolver() {
      if (document.visibilityState === "visible") {
        verificar();
      }
    }

    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, []);

  function recargar() {
    setActualizando(true);
    // Limpiar caches de Service Worker si hubiera registrados
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    // Forzar recarga completa de la página con bypass de cache
    window.location.reload();
  }

  if (!hayActualizacion || descartado) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[min(24rem,calc(100vw-1.5rem))] animate-slide-up"
    >
      <div className="relative overflow-hidden rounded-[16px] border border-accent/60 bg-paper-2/95 p-3.5 shadow-2xl backdrop-blur-md transition-all">
        {/* Resplandor ambiental de acento */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-accent/20 blur-xl"
          aria-hidden
        />

        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-accent/40 bg-accent/15 text-accent shadow-[0_0_12px_var(--accent)] animate-timer-breathe">
            <Sparkles className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                Actualización lista
              </span>
              <button
                type="button"
                onClick={() => setDescartado(true)}
                aria-label="Descartar aviso por ahora"
                className="-mr-1 -mt-1 grid size-7 place-items-center rounded-[6px] text-ink-soft transition-colors hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <h4 className="mt-0.5 text-sm font-bold text-ink">
              Hay una nueva versión de la app
            </h4>
            <p className="mt-0.5 text-xs leading-snug text-ink-soft">
              {nuevoCommit
                ? `Se subieron cambios recientes (v.${nuevoCommit}). Tocá para actualizar al instante.`
                : "Se subieron mejoras a la app. Tocá para actualizar."}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={recargar}
                disabled={actualizando}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-accent px-4 text-xs font-bold text-accent-ink shadow-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
              >
                <RefreshCw className={`size-3.5 ${actualizando ? "animate-spin" : ""}`} />
                {actualizando ? "Actualizando…" : "Actualizar ahora"}
              </button>
              <button
                type="button"
                onClick={() => setDescartado(true)}
                className="h-11 rounded-[10px] border border-rule bg-paper px-3 text-xs font-semibold text-ink-soft transition-colors hover:text-ink active:scale-95"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
