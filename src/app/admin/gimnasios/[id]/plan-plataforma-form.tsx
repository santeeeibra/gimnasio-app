"use client";

import { useActionState } from "react";
import { asignarPlanPlataforma } from "../../actions";
import { Button } from "@/components/ui";

type Opcion = { id: string; nombre: string; max_socios: number | null };

export function PlanPlataformaForm({
  gimnasioId,
  planes,
  planActualId,
  venceElActual,
}: {
  gimnasioId: string;
  planes: Opcion[];
  planActualId: string | null;
  venceElActual: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    asignarPlanPlataforma,
    null,
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Plan</span>
        <select
          name="plan_id"
          defaultValue={planActualId ?? ""}
          className="h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-ink"
        >
          <option value="">— Sin plan —</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.max_socios == null ? "∞" : p.max_socios})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Vence el</span>
        <input
          type="date"
          name="vence_el"
          defaultValue={venceElActual ?? ""}
          className="h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-ink"
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar plan"}
      </Button>

      {state?.msg ? (
        <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
