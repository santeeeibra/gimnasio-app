"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui";
import { vozHabilitada, setVozHabilitada } from "@/lib/ui/voz";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

/**
 * Preferencia de dispositivo (localStorage, no de cuenta): activa los avisos
 * hablados del timer de descanso ("30 segundos", "Descanso terminado"...).
 * Apagada por default.
 */
export function VozGuiadaToggle() {
  const [activa, setActiva] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setActiva(vozHabilitada());
    setListo(true);
  }, []);

  if (!listo) return null;

  return (
    <div className="card-cut border border-rule bg-paper-2 p-4">
      <Toggle
        label="Voz guiada durante el descanso"
        hint="Avisos hablados de cuánto falta y cuándo volver a entrenar."
        checked={activa}
        onCheckedChange={(checked) => {
          setActiva(checked);
          setVozHabilitada(checked);
          hapticoSeleccion();
        }}
      />
    </div>
  );
}
