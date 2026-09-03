"use client";

import { useCallback, useEffect, useState } from "react";
import { linkClasses } from "@/components/ui";
import { Overlay } from "./overlay";
import { pasosDueno } from "./pasos-dueno";
import { pasosCliente } from "./pasos-cliente";

const FLAG = {
  dueno: "tutorial_dueno_visto",
  cliente: "tutorial_cliente_visto",
} as const;

export const EVENTO_ABRIR_TUTORIAL = "abrir-tutorial";

/**
 * Onboarding de primer uso. Se dispara solo la primera vez que el rol entra
 * (flag en localStorage), se puede saltear en cualquier paso y se relanza con
 * el evento `abrir-tutorial`. No escribe nada en Supabase: todo el contenido
 * son fragmentos de mentira en estado de React.
 */
export function Tutorial({ rol }: { rol: "dueno" | "cliente" }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(FLAG[rol]) !== "1") setAbierto(true);
    } catch {
      // localStorage no disponible: no forzamos el tutorial.
    }
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_TUTORIAL, abrir);
  }, [rol]);

  const cerrar = useCallback(() => {
    try {
      localStorage.setItem(FLAG[rol], "1");
    } catch {
      // sin persistencia: igual cerramos el overlay en esta sesión.
    }
    setAbierto(false);
  }, [rol]);

  if (!abierto) return null;

  return (
    <Overlay
      pasos={rol === "dueno" ? pasosDueno : pasosCliente}
      finalLabel={rol === "dueno" ? "Empezar" : "Listo"}
      onClose={cerrar}
    />
  );
}

/** Botón "Ver tutorial de nuevo" para relanzarlo desde el perfil / ajustes. */
export function VerTutorialDeNuevo() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_TUTORIAL))}
      className={`text-xs ${linkClasses.accion}`}
    >
      Ver tutorial de nuevo
    </button>
  );
}
