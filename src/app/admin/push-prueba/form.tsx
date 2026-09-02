"use client";

import { useActionState } from "react";
import { enviarPushPrueba } from "../actions";
import { Button } from "@/components/ui";

export function PushPruebaForm() {
  const [state, formAction, pending] = useActionState(enviarPushPrueba, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Título
        </span>
        <input
          name="title"
          defaultValue="Prueba"
          className="h-11 w-full rounded-[5px] border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Cuerpo
        </span>
        <input
          name="body"
          defaultValue="Push de prueba desde soporte."
          className="h-11 w-full rounded-[5px] border border-rule bg-paper px-3 text-[16px] outline-none focus:border-ink"
        />
      </label>

      {state?.msg ? (
        <p className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar a mis dispositivos"}
      </Button>
    </form>
  );
}
