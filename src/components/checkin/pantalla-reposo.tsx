"use client";

/**
 * Pantalla de reposo del modo check-in (kiosko). Tras X segundos sin toques
 * cubre la pantalla con un fondo ambiental oscuro (identidad "Futurista":
 * acento `--volt`, hora en `--font-hero` / Orbitron). Cualquier toque, tecla o
 * rueda la cierra y vuelve a enfocar el input de DNI.
 *
 * Config del dueño en `/panel/ajustes` (`gimnasios.tema.reposoCheckin`).
 * Solo anima transform/opacity. Respeta `prefers-reduced-motion` y el modo
 * "Estático" (sin capas en movimiento). Ver contex-sysgym.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReposoCheckin } from "@/lib/tema";

const EVENTOS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

export function PantallaReposo({
  config,
  nombre,
  logoUrl,
}: {
  config: ReposoCheckin;
  nombre: string;
  logoUrl: string | null;
}) {
  const [dormido, setDormido] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const programar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setDormido(true),
      Math.min(Math.max(config.segundos, 15), 600) * 1000,
    );
  }, [config.segundos]);

  useEffect(() => {
    if (!config.activo) return;

    const despertar = () => {
      setDormido((estaba) => {
        if (estaba) {
          // Al volver, dejamos el cursor listo en el DNI.
          const dni = document.querySelector<HTMLInputElement>(
            'input[name="dni"]',
          );
          dni?.focus();
        }
        return false;
      });
      programar();
    };

    programar();
    for (const ev of EVENTOS)
      window.addEventListener(ev, despertar, { passive: true });
    const onVis = () => {
      if (document.visibilityState === "visible") despertar();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      for (const ev of EVENTOS) window.removeEventListener(ev, despertar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [config.activo, programar]);

  if (!config.activo || !dormido) return null;

  return <Overlay config={config} nombre={nombre} logoUrl={logoUrl} />;
}

function Overlay({
  config,
  nombre,
  logoUrl,
}: {
  config: ReposoCheckin;
  nombre: string;
  logoUrl: string | null;
}) {
  const [hora, setHora] = useState("");
  const mov = config.intensidad;

  useEffect(() => {
    if (!config.mostrarReloj) return;
    const tick = () =>
      setHora(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [config.mostrarReloj]);

  const anilloCls = [
    "reposo-anillo",
    mov !== "estatico" && "reposo-anillo--vivo",
    mov === "normal" && "reposo-anillo--gira",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Tocá para volver al check-in"
      className="reposo-overlay fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {mov !== "estatico" ? (
        <span
          aria-hidden
          className={`reposo-haze reposo-haze-a ${
            mov === "normal" ? "reposo-haze--full" : ""
          }`}
        />
      ) : null}
      {mov === "normal" ? (
        <>
          <span aria-hidden className="reposo-haze reposo-haze-b" />
          <span aria-hidden className="reposo-scan" />
        </>
      ) : null}
      <span aria-hidden className="reposo-vignette" />

      <div className="relative grid place-items-center">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className={anilloCls}
          aria-hidden
        >
          <circle
            cx="110"
            cy="110"
            r="96"
            fill="none"
            stroke="color-mix(in srgb, var(--accent) 20%, transparent)"
            strokeWidth="1.5"
          />
          <circle
            cx="110"
            cy="110"
            r="96"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="118 480"
          />
        </svg>
        {config.mostrarReloj && hora ? (
          <span
            className="absolute text-4xl tracking-[0.12em] tabular-nums"
            style={{ fontFamily: "var(--font-hero)" }}
          >
            {hora}
          </span>
        ) : null}
      </div>

      {config.mostrarLogo && logoUrl ? (
        <span className="reposo-logo-box mt-8 size-12 overflow-hidden rounded-[8px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-contain"
            decoding="async"
          />
        </span>
      ) : null}

      <p className="reposo-mensaje mt-6 max-w-[22rem] px-8 text-center text-lg">
        {config.mensaje}
      </p>
      {nombre ? (
        <p className="reposo-marca mt-1 text-[11px] uppercase tracking-[0.18em]">
          {nombre}
        </p>
      ) : null}
    </div>
  );
}
