"use client";

import { useActionState, useState } from "react";
import { enviarMensaje, type EnvioState } from "./actions";
import { Button } from "@/components/ui";

type Cliente = { profile_id: string; nombre: string; plan_id: string | null };

export function ComposeForm({
  planes,
  clientes,
}: {
  planes: { id: string; nombre: string }[];
  clientes: Cliente[];
}) {
  const [modo, setModo] = useState<"todos" | "plan" | "individual">("todos");
  const [state, formAction, pending] = useActionState<EnvioState, FormData>(
    enviarMensaje,
    {},
  );

  const selectCls =
    "w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink";

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["todos", "plan", "individual"] as const).map((m) => (
          <label
            key={m}
            className={`px-3 py-2 rounded-[5px] border text-sm cursor-pointer ${
              modo === m
                ? "border-ink bg-ink text-paper"
                : "border-rule hover:bg-paper-2"
            }`}
          >
            <input
              type="radio"
              name="modo"
              value={m}
              checked={modo === m}
              onChange={() => setModo(m)}
              className="sr-only"
            />
            {m === "todos"
              ? "Todos"
              : m === "plan"
                ? "Por plan"
                : "Un cliente"}
          </label>
        ))}
      </div>

      {modo === "plan" ? (
        <select name="plan_id" className={selectCls} defaultValue="">
          <option value="" disabled>
            Elegí el plan…
          </option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      ) : null}

      {modo === "individual" ? (
        <select name="cliente_id" className={selectCls} defaultValue="">
          <option value="" disabled>
            Elegí el cliente…
          </option>
          {clientes.map((c) => (
            <option key={c.profile_id} value={c.profile_id}>
              {c.nombre}
            </option>
          ))}
        </select>
      ) : null}

      <textarea
        name="cuerpo"
        required
        rows={4}
        placeholder="Escribí el aviso…"
        className="w-full px-3 py-2 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink resize-y"
      />

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="respondible" />
        Permitir que respondan (chat)
      </label>

      <div className="flex items-center gap-4">
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
