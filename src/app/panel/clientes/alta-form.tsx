"use client";

import { useActionState } from "react";
import { altaCliente, type AltaState } from "./actions";
import { Button, Field, Select } from "@/components/ui";
import { SEXOS, SEXO_LABEL } from "@/lib/rutina/tipos";

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

      <Select label="Sexo" name="sexo" defaultValue="">
        <option value="">Sin especificar todavía</option>
        {SEXOS.filter((s) => s !== "sin_especificar").map((s) => (
          <option key={s} value={s}>
            {SEXO_LABEL[s]}
          </option>
        ))}
      </Select>

      <Select label="Plan" name="plan_id" defaultValue="">
        <option value="">Sin plan por ahora</option>
        {planes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" name="modo" value="completa" disabled={pending}>
          {pending ? "Creando…" : "Dar de alta"}
        </Button>
        <Button
          type="submit"
          name="modo"
          value="prueba"
          variant="ghost"
          disabled={pending}
        >
          1 día de prueba
        </Button>
        {state.error ? (
          <p className="w-full text-sm text-danger">{state.error}</p>
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
