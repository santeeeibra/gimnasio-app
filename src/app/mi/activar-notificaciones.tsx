"use client";

import { useEffect, useState, useTransition } from "react";
import {
  estadoActual,
  suscribir,
  desuscribir,
  type EstadoPush,
} from "@/lib/push/cliente";
import { guardarSuscripcion, borrarSuscripcion } from "./push-actions";

export function ActivarNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    estadoActual().then(setEstado);
  }, []);

  if (estado === null || estado === "no-soportado") return null;

  const activar = () =>
    start(async () => {
      setError(null);
      try {
        const sub = await suscribir();
        const res = await guardarSuscripcion(sub);
        if (res.error) throw new Error(res.error);
        setEstado("suscrito");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo activar.");
        setEstado(await estadoActual());
      }
    });

  const desactivar = () =>
    start(async () => {
      setError(null);
      try {
        const endpoint = await desuscribir();
        if (endpoint) await borrarSuscripcion(endpoint);
        setEstado("sin-suscribir");
      } catch {
        setError("No se pudo desactivar.");
      }
    });

  const spinner = (
    <span className="size-4 rounded-full border-2 border-current/30 border-t-current spin-fast" />
  );

  return (
    <div className="border border-rule rounded-[6px] bg-paper px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">Notificaciones</p>
          <p className="mt-1 text-xs text-ink-soft leading-snug">
            {estado === "denegado"
              ? "Bloqueadas en el navegador. Activalas desde los ajustes del sitio."
              : estado === "suscrito"
                ? "Recibís avisos de mensajes y de tu cuota por vencer."
                : "Activá los avisos de mensajes y cuota por vencer."}
          </p>
        </div>

        {estado === "suscrito" ? (
          <button
            onClick={desactivar}
            disabled={pending}
            className="shrink-0 inline-flex items-center gap-2 h-8 px-2.5 text-xs font-medium rounded-[5px] border border-rule text-ink-soft transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            {pending ? spinner : null}
            Desactivar
          </button>
        ) : estado === "sin-suscribir" ? (
          <button
            onClick={activar}
            disabled={pending}
            className="animate-cta-halo shrink-0 inline-flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-[5px] bg-volt text-volt-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            {pending ? spinner : null}
            Activar
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
