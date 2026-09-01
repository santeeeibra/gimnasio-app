"use client";

import { useActionState } from "react";
import { altaCliente, type AltaState } from "./actions";
import { Button, Field } from "@/components/ui";

export function AltaForm({
  planes,
}: {
  planes: { id: string; nombre: string }[];
}) {
  const [state, formAction, pending] = useActionState<AltaState, FormData>(
    altaCliente,
    {},
  );

  return (
    <form action={formAction} className="grid sm:grid-cols-2 gap-4">
      <Field label="Nombre y apellido" name="nombre" required />
      <Field label="DNI" name="dni" inputMode="numeric" required />
      <Field label="Teléfono" name="telefono" inputMode="tel" />
      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Plan
        </span>
        <select
          name="plan_id"
          className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink"
        >
          <option value="">Sin plan por ahora</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2 flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Creando…" : "Dar de alta"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-ok">
            {state.ok} <span className="text-ink-soft">{state.clave}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
