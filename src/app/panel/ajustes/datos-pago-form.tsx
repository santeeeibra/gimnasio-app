"use client";

import { useActionState } from "react";
import { actualizarDatosPago } from "./actions";
import { Button, Field } from "@/components/ui";

export function DatosPagoForm({
  gimnasioId,
  alias,
  cbu,
  titular,
}: {
  gimnasioId: string;
  alias: string | null;
  cbu: string | null;
  titular: string | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarDatosPago, {
    error: undefined,
    ok: undefined,
  } as { error?: string; ok?: string });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <Field label="Alias" name="pago_alias" defaultValue={alias ?? ""} placeholder="mi.gimnasio.mp" />
      <Field label="CBU / CVU" name="pago_cbu" inputMode="numeric" defaultValue={cbu ?? ""} placeholder="22 dígitos" />
      <div className="sm:col-span-2">
        <Field
          label="Titular de la cuenta"
          name="pago_titular"
          defaultValue={titular ?? ""}
          placeholder="Nombre y apellido"
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
