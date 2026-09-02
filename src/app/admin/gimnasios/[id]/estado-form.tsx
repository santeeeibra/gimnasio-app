"use client";

import { useActionState } from "react";
import { cambiarEstadoGimnasio } from "../../actions";
import { Button } from "@/components/ui";

const OPCIONES: { value: string; label: string }[] = [
  { value: "prueba", label: "Prueba" },
  { value: "activo", label: "Activo" },
  { value: "solo_lectura", label: "Solo lectura" },
];

export function EstadoForm({
  gimnasioId,
  estadoActual,
}: {
  gimnasioId: string;
  estadoActual: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    cambiarEstadoGimnasio,
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <select
        name="estado"
        defaultValue={estadoActual ?? "prueba"}
        className="h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-ink"
      >
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar estado"}
      </Button>
      {state?.msg ? (
        <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
