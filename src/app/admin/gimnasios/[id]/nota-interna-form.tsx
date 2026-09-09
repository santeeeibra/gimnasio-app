"use client";

import { useActionState, useEffect, useRef } from "react";
import { actualizarNotaInterna } from "../../actions";
import { Button } from "@/components/ui";
import { hapticoExito, hapticoError } from "@/lib/ui/hapticos";

export function NotaInternaForm({
  gimnasioId,
  notaActual,
}: {
  gimnasioId: string;
  notaActual: string;
}) {
  const [state, formAction, pending] = useActionState(
    actualizarNotaInterna,
    null,
  );
  const avisado = useRef<typeof state>(null);

  useEffect(() => {
    if (!state || state === avisado.current) return;
    avisado.current = state;
    if (state.ok) hapticoExito();
    else hapticoError();
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <textarea
        name="nota_interna"
        defaultValue={notaActual}
        rows={3}
        maxLength={1000}
        placeholder="Motivo de suspensión, contacto del dueño, recordatorios…"
        className="w-full resize-y rounded-[8px] border border-rule bg-paper px-3 py-2 text-[15px] outline-none focus:border-ink"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar nota"}
        </Button>
        {state?.msg ? (
          <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
            {state.msg}
          </span>
        ) : null}
      </div>
    </form>
  );
}
