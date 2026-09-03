"use client";

import { useActionState } from "react";
import { contactarSoporte, type AjustesState } from "./actions";
import { Button, Field } from "@/components/ui";

export function ContactarSoporteForm() {
  const [state, action, pending] = useActionState<AjustesState, FormData>(
    contactarSoporte,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Asunto" name="asunto" required maxLength={120} />
      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Mensaje
        </span>
        <textarea
          name="mensaje"
          required
          maxLength={2000}
          rows={4}
          className="w-full rounded-[5px] border border-rule bg-paper px-3 py-2 text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
