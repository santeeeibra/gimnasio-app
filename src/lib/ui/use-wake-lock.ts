"use client";

import { useEffect, useRef } from "react";

/**
 * Mantiene la pantalla encendida mientras `activo` es true, usando la Screen
 * Wake Lock API (`navigator.wakeLock.request('screen')`). Pensado para el
 * "Modo Zen / Foco" de /mi/rutina: durante el entrenamiento el celular no
 * debe apagarse ni suspenderse solo.
 *
 * Silencioso en navegadores sin soporte (Safari < 16.4, Firefox desktop) y
 * re-adquiere el lock automáticamente cuando la pestaña vuelve a estar
 * visible (el sistema operativo libera el wake lock al minimizar la app).
 */
export function useWakeLock(activo: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!activo) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelado = false;

    async function pedirLock() {
      try {
        const lock = await (navigator as Navigator).wakeLock.request("screen");
        if (cancelado) {
          // El efecto se desmontó mientras esperábamos la promesa.
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
      } catch {
        // Permiso denegado, pestaña oculta, o API no disponible: no rompe la app.
      }
    }

    pedirLock();

    function onVisibilidad() {
      if (document.visibilityState === "visible" && !lockRef.current) {
        pedirLock();
      }
    }
    document.addEventListener("visibilitychange", onVisibilidad);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", onVisibilidad);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [activo]);
}
