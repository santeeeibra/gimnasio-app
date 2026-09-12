"use client";

import { useActionState, useState } from "react";
import { actualizarAsistenteIa, type AjustesState } from "./actions";
import { Toggle } from "@/components/ui";

export function AsistenteIaForm({
  gimnasioId,
  activo,
  llamadasUsadas,
  techoMensual,
}: {
  gimnasioId: string;
  activo: boolean;
  llamadasUsadas: number;
  techoMensual: number;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarAsistenteIa,
    {},
  );
  const [checked, setChecked] = useState(activo);

  return (
    <form
      action={formAction}
      onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
      className="space-y-4"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <Toggle
        name="activo"
        checked={checked}
        onCheckedChange={setChecked}
        label="Activar asistente IA"
        hint="Avisos de riesgo de abandono, cumpleaños y resumen mensual redactados por IA, orquestados desde n8n."
        disabled={pending}
      />

      <div className="rounded-[10px] border border-rule bg-paper-2 p-3 flex items-center justify-between">
        <span className="text-xs text-ink-soft">Llamadas a la IA este mes</span>
        <span className="text-xs font-mono font-bold text-ink">
          {llamadasUsadas} / {techoMensual}
        </span>
      </div>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
    </form>
  );
}
