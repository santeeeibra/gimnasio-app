"use client";

import { useEffect, useRef } from "react";
import {
  ConexionProvider,
  useConexionSupabase,
} from "@/lib/offline/conexion";
import {
  backoffMs,
  pendientes,
  procesarCola,
  suscribir,
} from "@/lib/offline/cola";
import { HANDLERS } from "@/lib/offline/handlers";
import { BannerOffline } from "./banner";

/**
 * Cuando hay conexión y quedan pendientes, procesa la cola y reprograma con
 * backoff exponencial mientras algo siga pendiente. Sin componente visible.
 */
function AutoFlush() {
  const { estado } = useConexionSupabase();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const corriendo = useRef(false);

  useEffect(() => {
    const cancelar = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const tick = async () => {
      if (corriendo.current) return;
      if (estado !== "conectado") return cancelar();
      const cola = pendientes();
      if (cola.length === 0) return cancelar();

      corriendo.current = true;
      const { quedanPendientes } = await procesarCola(HANDLERS);
      corriendo.current = false;

      cancelar();
      if (quedanPendientes && estado === "conectado") {
        const maxIntentos = Math.max(...pendientes().map((i) => i.intentos), 0);
        timer.current = setTimeout(tick, backoffMs(maxIntentos));
      }
    };

    // Corre al montar / al cambiar de estado, y cada vez que cambia la cola.
    void tick();
    const off = suscribir(() => void tick());
    return () => {
      off();
      cancelar();
    };
  }, [estado]);

  return null;
}

export function OfflineProvider({ children }: { children?: React.ReactNode }) {
  return (
    <ConexionProvider>
      <BannerOffline />
      <AutoFlush />
      {children}
    </ConexionProvider>
  );
}
