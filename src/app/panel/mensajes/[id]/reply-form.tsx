"use client";

import { useActionState, useRef, useEffect } from "react";
import { responderDueno } from "../actions";
import { Button } from "@/components/ui";

export function ReplyForm({ mensajeId }: { mensajeId: string }) {
  const [state, formAction, pending] = useActionState(responderDueno, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) ref.current?.reset();
  }, [pending, state]);

  return (
    <form action={formAction} ref={ref} className="flex items-start gap-2">
      <input type="hidden" name="mensaje_id" value={mensajeId} />
      <textarea
        name="cuerpo"
        required
        rows={2}
        placeholder="Responder…"
        className="flex-1 px-3 py-2 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink resize-y"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Enviar"}
      </Button>
      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
