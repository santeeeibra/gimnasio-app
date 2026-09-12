"use client";

import { useActionState, useState, useEffect } from "react";
import { actualizarDiasAvisoMorosidad, type AjustesState } from "./actions";
import { Button } from "@/components/ui";
import { useHapticos } from "@/lib/ui/hapticos";

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
  const hapticos = useHapticos();

  useEffect(() => {
    if (state.ok) hapticos.exito();
    else if (state.error) hapticos.error();
  }, [state.ok, state.error, hapticos]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      {state.ok ? (
        <div className="rounded-[10px] border border-ok/40 bg-ok/10 px-3 py-2 text-xs font-semibold text-ok flex items-center gap-2 animate-fade-in">
          <span>✓</span> {state.ok}
        </div>
      ) : null}

      {state.error ? (
        <div className="rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger flex items-center gap-2 animate-fade-in" role="alert">
          <span>⚠</span> {state.error}
        </div>
      ) : null}

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

      <Button type="submit" loading={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
