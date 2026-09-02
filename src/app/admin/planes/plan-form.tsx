"use client";

import { useActionState } from "react";
import { guardarPlanPlataforma } from "../actions";
import { Button } from "@/components/ui";

export type PlanRow = {
  id: string;
  nombre: string;
  max_socios: number | null;
  precio_mensual: number;
  activo: boolean;
  orden: number;
};

const inputCls =
  "h-10 w-full rounded-[5px] border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink";

// Sirve para alta (plan undefined) y edición (plan con id oculto).
export function PlanForm({ plan }: { plan?: PlanRow }) {
  const [state, formAction, pending] = useActionState(
    guardarPlanPlataforma,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_7rem_8rem_5rem_auto]">
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Nombre</span>
        <input
          name="nombre"
          defaultValue={plan?.nombre ?? ""}
          required
          className={inputCls}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Máx. socios</span>
        <input
          name="max_socios"
          type="number"
          min={1}
          defaultValue={plan?.max_socios ?? ""}
          placeholder="∞"
          className={`${inputCls} text-center`}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Precio/mes</span>
        <input
          name="precio_mensual"
          type="number"
          min={0}
          step="0.01"
          defaultValue={plan?.precio_mensual ?? 0}
          className={`${inputCls} text-right`}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Orden</span>
        <input
          name="orden"
          type="number"
          defaultValue={plan?.orden ?? 0}
          className={`${inputCls} text-center`}
        />
      </label>

      <div className="flex items-end gap-3">
        <label className="flex h-10 items-center gap-1.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="activo"
            defaultChecked={plan?.activo ?? true}
            className="size-4 accent-ink"
          />
          Activo
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : plan ? "Guardar" : "Crear"}
        </Button>
      </div>

      {state?.msg ? (
        <p
          className={`sm:col-span-full text-sm ${
            state.ok ? "text-ok" : "text-danger"
          }`}
        >
          {state.msg}
        </p>
      ) : null}
    </form>
  );
}
