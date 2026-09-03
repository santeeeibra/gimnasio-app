"use client";

import { useActionState, useEffect } from "react";
import { generarPagoPlan, type PagoState } from "./actions";
import { Button } from "@/components/ui";

export function PagoForm({
  alias,
  titular,
}: {
  alias: string | null;
  titular: string | null;
}) {
  const [state, formAction, pending] = useActionState<PagoState | null, FormData>(
    generarPagoPlan,
    null,
  );

  useEffect(() => {
    if (state?.redirect) window.location.href = state.redirect;
  }, [state?.redirect]);

  if (state?.ok && !state.redirect) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-ok">{state.msg}</p>
        {alias ? (
          <p className="text-ink-soft">
            Transferí a <span className="text-ink">{alias}</span>
            {titular ? (
              <>
                {" "}
                (<span className="text-ink">{titular}</span>)
              </>
            ) : null}
            .
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Nota (opcional)
        </span>
        <textarea
          name="nota"
          rows={2}
          placeholder="Comprobante, referencia de la transferencia, etc."
          className="w-full rounded-[5px] border border-rule bg-paper p-3 text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink"
        />
      </label>

      {state?.msg && !state.ok ? (
        <p className="text-sm text-danger">{state.msg}</p>
      ) : null}

      <Button type="submit" loading={pending}>
        {pending ? "Generando…" : "Generar pago"}
      </Button>
    </form>
  );
}
