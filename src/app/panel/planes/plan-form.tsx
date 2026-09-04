"use client";

import { useActionState, useState } from "react";
import { crearPlan, type PlanState } from "./actions";
import { Button, Field } from "@/components/ui";

export function PlanForm() {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    crearPlan,
    {},
  );
  const [personalizado, setPersonalizado] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <div
        className={`grid gap-4 items-end ${
          personalizado
            ? "sm:grid-cols-[1fr_auto_auto_auto]"
            : "sm:grid-cols-[1fr_auto_auto]"
        }`}
      >
        <Field label="Nombre" name="nombre" placeholder="Mensual, Trimestral…" required />
        <Field label="Precio" name="precio" inputMode="numeric" />
        {personalizado ? (
          <Field label="Días" name="duracion_dias" inputMode="numeric" placeholder="30" required />
        ) : (
          <input type="hidden" name="duracion_dias" value={30} />
        )}
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Agregar"}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={personalizado}
          onChange={(e) => setPersonalizado(e.target.checked)}
          className="size-4 accent-ink"
        />
        Personalizar duración (por defecto: 1 mes / 30 días)
      </label>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
