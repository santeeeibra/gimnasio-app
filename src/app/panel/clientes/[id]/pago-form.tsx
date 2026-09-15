"use client";

import { useActionState, useState, useId, useEffect } from "react";
import { registrarPago } from "../actions";
import { Button, Field } from "@/components/ui";
import { hapticoPagoAprobado, hapticoError } from "@/lib/ui/hapticos";

export interface PlanConDescuentos {
  id: string;
  nombre: string;
  precio: number;
  descuentos?: { id: string; nombre: string; porcentaje: number }[];
}

export function PagoForm({
  clienteId,
  planes,
  planActual,
}: {
  clienteId: string;
  planes: PlanConDescuentos[];
  planActual: string | null;
}) {
  const [state, formAction, pending] = useActionState(registrarPago, {});
  const [fechaManual, setFechaManual] = useState(false);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<string>(
    planActual ?? planes[0]?.id ?? "",
  );
  const [montoCustom, setMontoCustom] = useState<string>("");

  useEffect(() => {
    if (state.ok) {
      hapticoPagoAprobado();
    } else if (state.error) {
      hapticoError();
    }
  }, [state]);

  const planSeleccionado = planes.find((p) => p.id === planSeleccionadoId);
  const descuentosActivos = (planSeleccionado?.descuentos ?? []).filter(
    (d) => (d.porcentaje ?? 0) > 0,
  );

  function aplicarDescuento(porcentaje: number) {
    if (!planSeleccionado) return;
    const nuevoMonto = Math.round(
      planSeleccionado.precio * (1 - porcentaje / 100),
    );
    setMontoCustom(String(nuevoMonto));
  }

  const selectId = useId();

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <div>
          <label htmlFor={selectId} className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Plan pagado
          </label>
          <select
            id={selectId}
            name="plan_id"
            value={planSeleccionadoId}
            onChange={(e) => {
              setPlanSeleccionadoId(e.target.value);
              setMontoCustom("");
            }}
            className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink"
          >
            <option value="">Elegir…</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (${p.precio.toLocaleString("es-AR")})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Field
            label="Monto recibido ($)"
            name="monto"
            value={montoCustom}
            onChange={(e) => setMontoCustom(e.target.value)}
            inputMode="numeric"
            placeholder={
              planSeleccionado
                ? `Por defecto: $${planSeleccionado.precio.toLocaleString("es-AR")}`
                : "deja vacío = precio del plan"
            }
          />
        </div>

        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>

      {/* SELECTOR RÁPIDO DE DESCUENTOS SI EL PLAN LOS TIENE */}
      {descuentosActivos.length > 0 && planSeleccionado ? (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-paper-2 border border-rule p-2 rounded-[5px]">
          <span className="text-ink-soft font-medium">Aplicar tarifa:</span>
          <button
            type="button"
            onClick={() => setMontoCustom(String(planSeleccionado.precio))}
            className="px-2 py-1 rounded bg-paper border border-rule hover:border-ink text-ink font-mono"
          >
            General (${planSeleccionado.precio.toLocaleString("es-AR")})
          </button>
          {descuentosActivos.map((d) => {
            const precioDesc = Math.round(
              planSeleccionado.precio * (1 - d.porcentaje / 100),
            );
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => aplicarDescuento(d.porcentaje)}
                className="px-2 py-1 rounded bg-ok/10 text-ok border border-ok/25 hover:bg-ok/20 font-medium transition-colors"
              >
                {d.nombre} -{d.porcentaje}% (${precioDesc.toLocaleString("es-AR")})
              </button>
            );
          })}
        </div>
      ) : null}

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
        <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={fechaManual}
            onChange={(e) => setFechaManual(e.target.checked)}
            className="size-4 accent-ink"
          />
          Elegir fecha de vencimiento manualmente (por defecto: 30 días corridos / 1 mes)
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
