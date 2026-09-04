"use client";

import { useActionState, useState } from "react";
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
  const [fechaManual, setFechaManual] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <label className="block">
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Plan pagado
          </span>
          <select
            name="plan_id"
            defaultValue={planActual ?? ""}
            className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink"
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
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Comprobante / referencia{" "}
          <span className="font-normal text-ink-soft/70">(opcional)</span>
        </span>
        <input
          type="text"
          name="comprobante_ref"
          placeholder="Nro. de operación, referencia de transferencia, link de Drive…"
          className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink"
        />
      </label>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={fechaManual}
            onChange={(e) => setFechaManual(e.target.checked)}
            className="size-4 accent-ink"
          />
          Elegir fecha de vencimiento manualmente (por defecto: 1 mes desde hoy)
        </label>
        {fechaManual ? (
          <input
            type="date"
            name="fecha_vencimiento_manual"
            className="h-10 w-full max-w-[200px] rounded-[5px] border border-rule bg-paper px-3 text-sm outline-none focus:border-ink"
          />
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-ok">{state.ok}</p>
      ) : null}
    </form>
  );
}
