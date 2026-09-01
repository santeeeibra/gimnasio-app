"use client";

import { useActionState } from "react";
import { registrarPago } from "../actions";
import { Button, Field } from "@/components/ui";

export function PagoForm({
  clienteId,
  planes,
  planActual,
}: {
  clienteId: string;
  planes: { id: string; nombre: string; precio: number }[];
  planActual: string | null;
}) {
  const [state, formAction, pending] = useActionState(registrarPago, {});

  return (
    <form action={formAction} className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Plan pagado
        </span>
        <select
          name="plan_id"
          defaultValue={planActual ?? ""}
          className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink"
        >
          <option value="">Elegir…</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} (${p.precio})
            </option>
          ))}
        </select>
      </label>
      <Field label="Monto recibido" name="monto" inputMode="numeric" placeholder="deja vacío = precio del plan" />
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Registrar pago"}
      </Button>

      {state.error ? (
        <p className="sm:col-span-3 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="sm:col-span-3 text-sm text-ok">{state.ok}</p>
      ) : null}
    </form>
  );
}
