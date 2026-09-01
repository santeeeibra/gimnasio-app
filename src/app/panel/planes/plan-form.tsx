"use client";

import { useActionState } from "react";
import { crearPlan, type PlanState } from "./actions";
import { Button, Field } from "@/components/ui";

export function PlanForm() {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    crearPlan,
    {},
  );

  return (
    <form action={formAction} className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 items-end">
      <Field label="Nombre" name="nombre" placeholder="Mensual, Trimestral…" required />
      <Field label="Precio" name="precio" inputMode="numeric" />
      <Field label="Días" name="duracion_dias" inputMode="numeric" placeholder="30" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Agregar"}
      </Button>
      {state.error ? (
        <p className="sm:col-span-4 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
