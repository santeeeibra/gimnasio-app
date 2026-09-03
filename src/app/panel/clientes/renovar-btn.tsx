"use client";

import { useActionState, useRef, useState } from "react";
import { registrarPago } from "./actions";

/** Renovación de un toque desde la lista: registra un pago con el plan actual
 *  del socio (monto = precio del plan). Pide una confirmación antes de mandar. */
export function RenovarBtn({
  clienteId,
  planId,
}: {
  clienteId: string;
  planId: string;
}) {
  const [state, formAction, pending] = useActionState(registrarPago, {});
  const [armado, setArmado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!armado) {
      e.preventDefault();
      setArmado(true);
      timer.current = setTimeout(() => setArmado(false), 3000);
    }
  }

  if (state.ok) {
    return (
      <span className="flex shrink-0 items-center px-3 text-xs text-ok">
        Renovada ✓
      </span>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      className="flex shrink-0 items-center pr-3"
    >
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="plan_id" value={planId} />
      <button
        type="submit"
        disabled={pending}
        className={`h-9 rounded-[5px] border px-3 text-xs font-medium transition-[transform,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 disabled:opacity-50 ${
          armado
            ? "border-ink bg-ink text-paper"
            : "border-rule bg-paper text-ink hover:bg-paper-2"
        }`}
      >
        {pending ? "…" : armado ? "Confirmar" : "Renovar"}
      </button>
      {state.error ? (
        <span className="ml-2 text-xs text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
