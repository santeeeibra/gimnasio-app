"use client";

import { useActionState } from "react";
import { actualizarEmailRecuperacion, type AjustesState } from "./actions";
import { Button, Field } from "@/components/ui";

export function EmailRecuperacionForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState<AjustesState, FormData>(
    actualizarEmailRecuperacion,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Tu email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={email ?? ""}
        placeholder="vos@email.com"
        hint="No cambia tu forma de entrar (seguís con DNI y clave). Solo se usa para el enlace de recuperación."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar email"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
