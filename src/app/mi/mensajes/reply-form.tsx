"use client";

import { useActionState, useRef, useEffect } from "react";
import { responderCliente } from "./actions";
import { Button } from "@/components/ui";
import { hapticoMensajeRecibido } from "@/lib/ui/hapticos";

export function ReplyForm({ mensajeId }: { mensajeId: string }) {
  const [state, formAction, pending] = useActionState(responderCliente, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      ref.current?.reset();
      hapticoMensajeRecibido();
    }
  }, [pending, state]);

  return (
    <form action={formAction} ref={ref} className="flex items-start gap-2">
      <input type="hidden" name="mensaje_id" value={mensajeId} />
      <textarea
        name="cuerpo"
        required
        rows={2}
        placeholder="Responder…"
        className="flex-1 px-3 py-2 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink resize-y"
      />
      <Button type="submit" loading={pending}>
        {pending ? "…" : "Enviar"}
      </Button>
      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
