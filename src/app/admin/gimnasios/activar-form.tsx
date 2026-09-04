"use client";

import { useActionState, useState } from "react";
import { activarGimnasioDisponible } from "../actions";
import { Button, Field } from "@/components/ui";

export function ActivarGimnasioForm({
  gimnasioId,
  slugActual,
}: {
  gimnasioId: string;
  slugActual: string;
}) {
  const [state, action, pending] = useActionState(
    activarGimnasioDisponible,
    null,
  );
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setAbierto(true);
        }}
        className="shrink-0 rounded-[6px] border border-rule bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors duration-150 hover:border-ink"
      >
        Activar
      </button>
    );
  }

  return (
    <form
      action={action}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 w-full space-y-2 rounded-[10px] border border-rule bg-paper p-3"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <p className="text-xs text-ink-soft">
        Convierte <span className="font-medium text-ink">{slugActual}</span> en
        el gimnasio real. La clave se genera sola a partir del DNI.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Nombre real del gimnasio" name="nombre_gym" required />
        <Field label="DNI del dueño" name="dni" inputMode="numeric" required />
        <Field label="Nombre del dueño" name="nombre_dueno" required />
        <Field
          label="Nuevo slug (opcional)"
          name="nuevo_slug"
          placeholder={slugActual}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" loading={pending}>
          {pending ? "Activando…" : "Confirmar activación"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
      {state?.msg ? (
        <p className={`text-xs ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </p>
      ) : null}
    </form>
  );
}
