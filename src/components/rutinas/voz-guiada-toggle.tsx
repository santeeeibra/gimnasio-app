"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Toggle } from "@/components/ui";
import { vozHabilitada, setVozHabilitada } from "@/lib/ui/voz";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

/**
 * Preferencia de dispositivo (localStorage, no de cuenta): activa los avisos
 * hablados del timer de descanso ("30 segundos", "Descanso terminado"...).
 * Apagada por default.
 *
 * `variant="card"` (default): tarjeta suelta, para /mi/ajustes.
 * `variant="row"`: fila compacta con ícono, para insertarse dentro de una
 * lista `divide-y` ya existente (p.ej. la sección Ajustes de /mi/perfil).
 */
export function VozGuiadaToggle({
  variant = "card",
}: {
  variant?: "card" | "row";
}) {
  const [activa, setActiva] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setActiva(vozHabilitada());
    setListo(true);
  }, []);

  if (!listo) return null;

  const cambiar = (checked: boolean) => {
    setActiva(checked);
    setVozHabilitada(checked);
    hapticoSeleccion();
  };

  if (variant === "row") {
    return (
      <div className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 shrink-0 rounded-lg bg-paper-3 border border-rule flex items-center justify-center text-ink-soft">
            <Volume2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-ink text-xs">Voz guiada</p>
            <p className="text-[11px] text-ink-soft">
              Avisos hablados durante el descanso
            </p>
          </div>
        </div>
        <Toggle
          checked={activa}
          onCheckedChange={cambiar}
          aria-label="Voz guiada durante el descanso"
        />
      </div>
    );
  }

  return (
    <div className="card-cut border border-rule bg-paper-2 p-4">
      <Toggle
        label="Voz guiada durante el descanso"
        hint="Avisos hablados de cuánto falta y cuándo volver a entrenar."
        checked={activa}
        onCheckedChange={cambiar}
      />
    </div>
  );
}
