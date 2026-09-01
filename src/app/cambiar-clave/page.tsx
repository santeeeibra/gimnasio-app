"use client";

import { useActionState } from "react";
import { cambiarClave, type State } from "./actions";
import { Button, Field } from "@/components/ui";

export default function CambiarClavePage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    cambiarClave,
    {},
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm">
        <h1 className="text-2xl mb-1">Elegí tu contraseña</h1>
        <p className="text-sm text-ink-soft mb-6">
          Antes de seguir, cambiá la contraseña que te dieron por una tuya.
        </p>

        <div className="space-y-4">
          <Field label="Nueva contraseña" name="nueva" type="password" required />
          <Field label="Repetir" name="repetir" type="password" required />
        </div>

        {state.error ? (
          <p className="mt-4 text-sm text-danger">{state.error}</p>
        ) : null}

        <Button type="submit" className="w-full mt-6" disabled={pending}>
          {pending ? "Guardando…" : "Guardar y entrar"}
        </Button>
      </form>
    </main>
  );
}
