"use client";

import { GenerarRutinaForm } from "@/app/mi/rutina/generar-form";
import type {
  Enfasis,
  Molestia,
  Nivel,
  Objetivo,
  PreferenciaEquipo,
  Sexo,
} from "@/lib/rutina/tipos";
import { generarRutinaCliente } from "../actions";

export function RutinaPanelDueno({
  clienteId,
  tieneRutina,
  clienteSexo,
  defaults,
}: {
  clienteId: string;
  tieneRutina: boolean;
  clienteSexo?: Sexo | null;
  defaults?: {
    objetivo?: Objetivo;
    nivel?: Nivel;
    dias?: number;
    preferencia?: PreferenciaEquipo;
    sexo?: Sexo;
    enfasis?: Enfasis[];
    zonasDolor?: Molestia[];
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
          clienteSexo={clienteSexo}
          defaults={defaults}
        />
      </div>
    </details>
  );
}
