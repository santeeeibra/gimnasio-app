"use client";

/**
 * Splash de arranque en frío (cold start). Cubre la pantalla con la mascota
 * feliz + el nombre "SysGym" sobre el fondo del tema del gimnasio, y hace
 * fade al contenido real después de ~1s.
 *
 * Sólo se ve una vez por sesión: un flag en `sessionStorage` evita que
 * reaparezca en cada navegación interna (SPA) o re-render de layout. Al abrir
 * la app de cero (pestaña/PWA nueva) el flag no existe → se muestra.
 *
 * Fondo y texto usan tokens de tema (`--paper` / `--ink` / `--app-font-display`).
 * La mascota tiene color de marca fijo.
 */

import { useEffect, useState } from "react";

const FLAG = "sysgym:splash:v1";
const VISIBLE_MS = 1000;
const FADE_MS = 400;

type Fase = "idle" | "visible" | "saliendo";

export function SplashScreen() {
  const [fase, setFase] = useState<Fase>("idle");

  useEffect(() => {
    let yaVisto = true;
    try {
      yaVisto = sessionStorage.getItem(FLAG) === "1";
    } catch {
      yaVisto = false;
    }
    if (yaVisto) return;

    try {
      sessionStorage.setItem(FLAG, "1");
    } catch {
      /* modo privado: se mostrará de nuevo, no es crítico */
    }

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const visibleMs = reduce ? 500 : VISIBLE_MS;

    setFase("visible");
    const tSalida = window.setTimeout(() => setFase("saliendo"), visibleMs);
    const tFin = window.setTimeout(
      () => setFase("idle"),
      visibleMs + FADE_MS,
    );
    return () => {
      window.clearTimeout(tSalida);
      window.clearTimeout(tFin);
    };
  }, []);

  if (fase === "idle") return null;

  return (
    <div
      className="splash-screen"
      data-leaving={fase === "saliendo"}
      role="status"
      aria-label="Abriendo SysGym"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascota/expresiones/01_feliz.png"
        alt=""
        className="splash-screen__mascota"
        decoding="async"
        draggable={false}
      />
      <span className="splash-screen__nombre">SysGym</span>
    </div>
  );
}

export default SplashScreen;
