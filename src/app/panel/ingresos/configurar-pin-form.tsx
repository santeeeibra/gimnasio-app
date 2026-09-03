"use client";

import { useActionState } from "react";
import { configurarPin } from "./configurar-pin/actions";
import { Button, Field } from "@/components/ui";

export function ConfigurarPinForm({ tienePinActual }: { tienePinActual: boolean }) {
  const [state, formAction, pending] = useActionState(configurarPin, {});

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      {tienePinActual && (
        <Field
          label="PIN actual"
          name="pin_actual"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          required
          autoComplete="off"
        />
      )}

      <Field
        label="Nuevo PIN (4-6 dígitos)"
        name="pin_nuevo"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        required
        autoComplete="off"
      />

      <Field
        label="Confirmar nuevo PIN"
        name="pin_confirmar"
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        required
        autoComplete="off"
      />

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : tienePinActual ? "Cambiar PIN" : "Configurar PIN"}
        </Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
      </div>
    </form>
  );
}
