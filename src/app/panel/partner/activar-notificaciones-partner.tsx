"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  estadoActual,
  suscribir,
  desuscribir,
  type EstadoPush,
} from "@/lib/push/cliente";
import {
  guardarSuscripcionPartner,
  borrarSuscripcionPartner,
} from "./push-actions";

export function ActivarNotificacionesPartner() {
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
        const res = await guardarSuscripcionPartner(sub);
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
        if (endpoint) await borrarSuscripcionPartner(endpoint);
        setEstado("sin-suscribir");
      } catch {
        setError("No se pudo desactivar.");
      }
    });

  return (
    <div className="rounded-[14px] border border-rule bg-paper-2/60 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {estado === "suscrito" ? (
          <Bell className="size-4 text-emerald-500 shrink-0" />
        ) : (
          <BellOff className="size-4 text-ink-soft shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink">Notificaciones push</p>
          <p className="text-[11px] text-ink-soft leading-snug">
            {estado === "denegado"
              ? "Bloqueadas en el navegador."
              : estado === "suscrito"
                ? "Recibís avisos y mensajes míos en este dispositivo."
                : "Activalas para enterarte al toque de mensajes y novedades."}
          </p>
        </div>
      </div>

      {estado === "suscrito" ? (
        <button
          onClick={desactivar}
          disabled={pending}
          className="shrink-0 h-8 px-2.5 text-xs font-medium rounded-[8px] border border-rule text-ink-soft hover:bg-paper disabled:opacity-50"
        >
          Desactivar
        </button>
      ) : estado === "sin-suscribir" ? (
        <button
          onClick={activar}
          disabled={pending}
          className="shrink-0 h-8 px-3 text-xs font-bold rounded-[8px] bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Activar
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
