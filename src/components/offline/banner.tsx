"use client";

import { useEffect, useRef, useState } from "react";
import { useConexionSupabase } from "@/lib/offline/conexion";
import { procesarCola, suscribir, type ItemCola } from "@/lib/offline/cola";
import { HANDLERS } from "@/lib/offline/handlers";

const RECONECTADO_MS = 4_000;

export function BannerOffline() {
  const { estado, probarAhora } = useConexionSupabase();
  const [items, setItems] = useState<ItemCola[]>([]);
  const [mostrarReconectado, setMostrarReconectado] = useState(false);
  const estadoPrevio = useRef(estado);

  useEffect(() => suscribir(setItems), []);

  // Al pasar de desconectado → conectado: banner breve de confirmación.
  useEffect(() => {
    if (estadoPrevio.current === "desconectado" && estado === "conectado") {
      setMostrarReconectado(true);
      const t = setTimeout(() => setMostrarReconectado(false), RECONECTADO_MS);
      estadoPrevio.current = estado;
      return () => clearTimeout(t);
    }
    if (estado !== "probando") estadoPrevio.current = estado;
  }, [estado]);

  const pendientes = items.filter((i) => i.estado === "pendiente").length;
  const sincronizar = () => {
    probarAhora();
    void procesarCola(HANDLERS);
  };

  const desconectado = estado === "desconectado";
  const sincronizandoOnline = !desconectado && pendientes > 0;

  if (!desconectado && !mostrarReconectado && !sincronizandoOnline) return null;

  let tono = "border-l-rule text-ink-soft";
  let texto = "";
  if (desconectado) {
    tono = "border-l-warn text-ink";
    texto = "Sin conexión con el servidor. Podés seguir usando la app, se sincroniza solo.";
  } else if (mostrarReconectado) {
    tono = "border-l-ok text-ink";
    texto = "Conexión restablecida, sincronizando…";
  } else {
    texto = "Sincronizando cambios pendientes…";
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div
        role="status"
        aria-live="polite"
        className={`animate-slide-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[8px] border border-rule border-l-[3px] bg-paper-2 px-3.5 py-2.5 text-[13px] shadow-[0_6px_20px_-8px_rgb(0_0_0_/_0.25)] ${tono}`}
      >
        <span className="min-w-0 flex-1 leading-snug">{texto}</span>

        {pendientes > 0 ? (
          <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {pendientes} pendiente{pendientes === 1 ? "" : "s"}
          </span>
        ) : null}

        {(desconectado || sincronizandoOnline) && pendientes > 0 ? (
          <button
            type="button"
            onClick={sincronizar}
            className="shrink-0 rounded-[5px] border border-rule px-2.5 py-1 text-[12px] font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:scale-[0.97]"
          >
            Sincronizar ahora
          </button>
        ) : null}
      </div>
    </div>
  );
}
