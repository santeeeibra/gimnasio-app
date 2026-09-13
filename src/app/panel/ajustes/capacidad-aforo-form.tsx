"use client";

import { useActionState, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { actualizarCapacidadMaxima, type AjustesState } from "./actions";
import { Button } from "@/components/ui";
import { useHapticos } from "@/lib/ui/hapticos";

const MIN = 1;
const MAX = 2000;

export function CapacidadAforoForm({
  gimnasioId,
  capacidadMaxima,
}: {
  gimnasioId: string;
  capacidadMaxima: number;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarCapacidadMaxima,
    {},
  );
  const [capacidad, setCapacidad] = useState(capacidadMaxima);
  const hapticos = useHapticos();

  useEffect(() => {
    if (state.ok) hapticos.exito();
    else if (state.error) hapticos.error();
  }, [state.ok, state.error, hapticos]);

  function ajustar(delta: number) {
    hapticos.suave();
    setCapacidad((c) => Math.min(MAX, Math.max(MIN, c + delta)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <input type="hidden" name="capacidad_maxima" value={capacidad} />

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
          Capacidad máxima de aforo
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => ajustar(-1)}
            disabled={capacidad <= MIN}
            aria-label="Restar"
            className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>

          <div className="flex h-11 flex-1 items-center justify-center rounded-[8px] border border-rule bg-paper">
            <span className="tabular-nums font-mono text-lg font-bold text-ink">
              {capacidad}
            </span>
          </div>

          <button
            type="button"
            onClick={() => ajustar(1)}
            disabled={capacidad >= MAX}
            aria-label="Sumar"
            className="grid size-11 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <span className="block text-xs text-ink-soft mt-1">
          Personas entrenando a la vez, para calcular el % de aforo que ven tus socios en /mi.
        </span>
      </label>

      <Button type="submit" loading={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
