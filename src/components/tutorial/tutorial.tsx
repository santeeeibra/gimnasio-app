"use client";

import { useCallback, useEffect, useState } from "react";
import { pillClasses } from "@/components/ui";
import { GraduationCap, HelpCircle } from "lucide-react";
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

import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

/** Botón "Ver tutorial de nuevo" para relanzarlo desde el perfil / ajustes. */
export function VerTutorialDeNuevo({
  className,
  label = "Ver tutorial de nuevo",
  variante = "pill",
}: {
  className?: string;
  /** Cabeceras angostas (p. ej. `/mi`) pasan "Tutorial" para no romper el h1. */
  label?: string;
  variante?: "pill" | "icono";
}) {
  const handleClick = () => {
    hapticoImpactoSuave();
    window.dispatchEvent(new Event(EVENTO_ABRIR_TUTORIAL));
  };

  if (variante === "icono") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Ver tutorial"
        aria-label="Ver tutorial"
        className={`inline-flex min-h-9 min-w-9 size-9 items-center justify-center rounded-[8px] text-ink-soft hover:text-ink hover:bg-paper select-none touch-manipulation transition-colors focus-visible:outline-none ${className ?? ""}`}
      >
        {/* HelpCircle en vez de GraduationCap: en un botón sin texto (solo
            visible en hover/title, que en touch nunca se ve) el "?" se
            reconoce de entrada como ayuda; el birrete es más ambiguo. */}
        <HelpCircle aria-hidden strokeWidth={2} className="size-4 shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={className ?? pillClasses.neutra}
    >
      <GraduationCap aria-hidden strokeWidth={2} className="size-4 shrink-0" />
      {label}
    </button>
  );
}
