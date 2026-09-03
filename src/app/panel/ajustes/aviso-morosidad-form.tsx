"use client";

import { useActionState, useState } from "react";
import { actualizarDiasAvisoMorosidad, type AjustesState } from "./actions";
import { Button } from "@/components/ui";

export function AvisoMorosidadForm({
  gimnasioId,
  diasAviso,
}: {
  gimnasioId: string;
  diasAviso: number;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarDiasAvisoMorosidad,
    {},
  );
  const [dias, setDias] = useState(String(diasAviso));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Avisar a los socios cuántos días antes del vencimiento
        </span>
        <input
          type="number"
          name="dias_aviso_morosidad"
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          min={1}
          max={15}
          step={1}
          inputMode="numeric"
          className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink"
        />
        <span className="block text-xs text-ink-soft mt-1">
          Entre 1 y 15 días. Se manda un solo push por ciclo de cuota.
        </span>
      </label>

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
