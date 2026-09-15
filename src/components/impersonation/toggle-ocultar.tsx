"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui";
import { OCULTO_KEY } from "./controles-flotantes";

// Mismo switch que el botón flotante de soporte, pero embebido en Ajustes
// para poder esconderlo sin buscar el botón (útil antes de grabar un video).
export function ToggleOcultarControlesImpersonacion() {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    try {
      setOculto(localStorage.getItem(OCULTO_KEY) === "1");
    } catch {}
  }, []);

  const cambiar = (checked: boolean) => {
    setOculto(checked);
    try {
      localStorage.setItem(OCULTO_KEY, checked ? "1" : "0");
    } catch {}
  };

  return (
    <Toggle
      label="Ocultar controles de soporte"
      hint="Esconde el switch Dueño/Socio flotante — útil para grabar un video sin que se vea la UI de soporte."
      checked={oculto}
      onCheckedChange={cambiar}
    />
  );
}
