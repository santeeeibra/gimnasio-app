"use client";

import { GenerarRutinaForm } from "@/app/mi/rutina/generar-form";
import type { Nivel, Objetivo, PreferenciaEquipo } from "@/lib/rutina/tipos";
import { generarRutinaCliente } from "../actions";

export function RutinaPanelDueno({
  clienteId,
  tieneRutina,
  defaults,
}: {
  clienteId: string;
  tieneRutina: boolean;
  defaults?: {
    objetivo?: Objetivo;
    nivel?: Nivel;
    dias?: number;
    preferencia?: PreferenciaEquipo;
  };
}) {
  return (
    <details open={!tieneRutina} className="group">
      <summary className="text-sm text-ink-soft cursor-pointer select-none">
        {tieneRutina ? "Regenerar rutina" : "Generar rutina"}
      </summary>
      <div className="mt-4">
        <GenerarRutinaForm
          action={generarRutinaCliente}
          clienteId={clienteId}
          tieneRutina={tieneRutina}
          defaults={defaults}
        />
      </div>
    </details>
  );
}
