"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hapticoExito, hapticoImpactoSuave } from "@/lib/ui/hapticos";

/**
 * Pull-to-refresh táctil propio, sin dependencias.
 *
 * Gateado: sólo se activa en PWA instalada (`display-mode: standalone`) y con
 * puntero grueso. En el navegador normal el gesto nativo ya existe y forzar el
 * propio agrega jank en Safari — ahí el hook queda inerte (`activo: false`) y
 * el contenedor se renderiza sin listeners ni transform.
 *
 * Escucha en `window`: los layouts de /mi y /panel scrollean el documento, no
 * un contenedor interno. Sólo dispara si el scroll está arriba de todo.
 */

const UMBRAL = 64; // px de tirón para disparar el refresh
const TOPE = 110; // px máximo que baja el contenido
const RESISTENCIA = 0.42; // damping pasado el umbral

export type FasePull = "idle" | "pulling" | "refreshing";

export function pullGateActivo(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari legacy
    (window.navigator as { standalone?: boolean }).standalone === true;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return Boolean(standalone && coarse);
}

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [activo, setActivo] = useState(false);
  const [fase, setFase] = useState<FasePull>("idle");
  const [distancia, setDistancia] = useState(0);

  const inicioY = useRef<number | null>(null);
  const tirando = useRef(false);
  const cruzoUmbral = useRef(false);
  const faseRef = useRef<FasePull>("idle");
  faseRef.current = fase;
  // Ref espejo de la distancia para leerla dentro de onEnd sin re-suscribir.
  const distanciaRef = useRef(0);
  distanciaRef.current = distancia;

  useEffect(() => {
    setActivo(pullGateActivo());
  }, []);

  const resetear = useCallback(() => {
    inicioY.current = null;
    tirando.current = false;
    cruzoUmbral.current = false;
    setDistancia(0);
  }, []);

  useEffect(() => {
    if (!activo) return;

    const amortiguar = (dy: number) => {
      if (dy <= UMBRAL) return dy;
      return Math.min(TOPE, UMBRAL + (dy - UMBRAL) * RESISTENCIA);
    };

    const onStart = (e: TouchEvent) => {
      if (faseRef.current === "refreshing") return;
      if (e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      inicioY.current = e.touches[0].clientY;
      tirando.current = false;
      cruzoUmbral.current = false;
    };

    const onMove = (e: TouchEvent) => {
      if (inicioY.current == null || faseRef.current === "refreshing") return;
      const dy = e.touches[0].clientY - inicioY.current;
      if (dy <= 0 || window.scrollY > 0) {
        if (tirando.current) {
          tirando.current = false;
          setDistancia(0);
          setFase("idle");
        }
        return;
      }
      // A partir de acá el gesto es nuestro: frenar el rubber-band nativo.
      if (e.cancelable) e.preventDefault();
      tirando.current = true;
      if (faseRef.current !== "pulling") setFase("pulling");

      const d = amortiguar(dy);
      setDistancia(d);

      if (!cruzoUmbral.current && d >= UMBRAL) {
        cruzoUmbral.current = true;
        hapticoImpactoSuave();
      } else if (cruzoUmbral.current && d < UMBRAL) {
        cruzoUmbral.current = false;
      }
    };

    const onEnd = () => {
      if (!tirando.current) {
        resetear();
        return;
      }
      const disparar = distanciaRef.current >= UMBRAL;
      tirando.current = false;
      inicioY.current = null;
      cruzoUmbral.current = false;

      if (!disparar) {
        setDistancia(0);
        setFase("idle");
        return;
      }

      hapticoExito();
      setFase("refreshing");
      setDistancia(UMBRAL);
      Promise.resolve(onRefresh()).finally(() => {
        // Deja ver la mascota un instante para que el refresh no "parpadee".
        window.setTimeout(() => {
          setFase("idle");
          setDistancia(0);
        }, 450);
      });
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
    // onRefresh es estable (useCallback en el consumidor); resetear también.
  }, [activo, onRefresh, resetear]);

  return {
    activo,
    fase,
    distancia,
    /** 0..1 respecto del umbral de disparo. */
    progreso: Math.min(1, distancia / UMBRAL),
    umbral: UMBRAL,
  };
}
