"use client";

import { useActionState, useState } from "react";
import { actualizarReposoCheckin, type AjustesState } from "./actions";
import { Radios } from "./radios";
import { Button, Toggle } from "@/components/ui";
import type { ReposoCheckin } from "@/lib/tema";

const INPUT_CLS =
  "w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink";

export function ReposoCheckinForm({
  gimnasioId,
  reposo,
}: {
  gimnasioId: string;
  reposo: ReposoCheckin;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarReposoCheckin,
    {},
  );
  const [activo, setActivo] = useState(reposo.activo);
  const [segundos, setSegundos] = useState(String(reposo.segundos));
  const [mensaje, setMensaje] = useState(reposo.mensaje);
  const [intensidad, setIntensidad] = useState<ReposoCheckin["intensidad"]>(
    reposo.intensidad,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <Toggle
        name="activo"
        checked={activo}
        onCheckedChange={setActivo}
        label="Activar pantalla de reposo"
        hint="Si lo apagás, la pantalla de check-in siempre muestra el DNI."
      />

      <div
        className={`space-y-5 transition-opacity duration-150 [transition-timing-function:var(--ease-out)] ${
          activo ? "" : "opacity-50"
        }`}
      >
        <label className="block">
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Segundos de inactividad antes de entrar en reposo
          </span>
          <input
            type="number"
            name="segundos"
            value={segundos}
            onChange={(e) => setSegundos(e.target.value)}
            min={15}
            max={600}
            step={5}
            inputMode="numeric"
            className={INPUT_CLS}
          />
          <span className="block text-xs text-ink-soft mt-1">
            Entre 15 y 600 (10 minutos). Cualquier toque vuelve al DNI.
          </span>
        </label>

        <label className="block">
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Mensaje en pantalla
          </span>
          <input
            type="text"
            name="mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            maxLength={60}
            className={INPUT_CLS}
          />
          <span className="block text-xs text-ink-soft mt-1">
            {mensaje.length}/60
          </span>
        </label>

        <div className="space-y-2">
          <div className="rounded-[10px] border border-rule bg-paper-2 p-3">
            <Toggle
              name="mostrarReloj"
              defaultChecked={reposo.mostrarReloj}
              label="Mostrar la hora"
              className="items-center"
            />
          </div>
          <div className="rounded-[10px] border border-rule bg-paper-2 p-3">
            <Toggle
              name="mostrarLogo"
              defaultChecked={reposo.mostrarLogo}
              label="Mostrar el logo del gimnasio"
              className="items-center"
            />
          </div>
        </div>

        <Radios
          label="Movimiento del fondo"
          name="intensidad"
          value={intensidad}
          onChange={(v) =>
            setIntensidad(v as ReposoCheckin["intensidad"])
          }
          options={[
            { value: "sutil", label: "Sutil", hint: "Un glow lento, casi quieto" },
            {
              value: "normal",
              label: "Normal",
              hint: "Fondo ambiental con leve deriva",
            },
            {
              value: "estatico",
              label: "Estático",
              hint: "Sin movimiento (equipos lentos)",
            },
          ]}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}

      <Button type="submit" loading={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
