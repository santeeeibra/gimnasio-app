"use client";

import { useActionState } from "react";
import { solicitarActivacionPlan, type SolicitudState } from "./actions";
import { Button } from "@/components/ui";

export function SolicitarForm() {
  const [state, formAction, pending] = useActionState<SolicitudState | null, FormData>(
    solicitarActivacionPlan,
    null,
  );

  if (state?.ok) {
    return <p className="text-sm text-ok">{state.msg}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Nota para soporte (opcional)
        </span>
        <textarea
          name="nota"
          rows={3}
          placeholder="Cuántos socios esperás, qué plan te interesa, etc."
          className="w-full rounded-[5px] border border-rule bg-paper p-3 text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink"
        />
      </label>

      {state?.msg && !state.ok ? (
        <p className="text-sm text-danger">{state.msg}</p>
      ) : null}

      <Button type="submit" loading={pending}>
        {pending ? "Enviando…" : "Solicitar activación"}
      </Button>
    </form>
  );
}
