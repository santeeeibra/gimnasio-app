"use client";

import { useActionState } from "react";
import {
  actualizarCredencialesIndividuales,
  type AjustesState,
} from "./actions";
import { Button, Field } from "@/components/ui";

export function CredencialesIndividualForm({
  telefono,
}: {
  telefono: string | null;
}) {
  const [state, action, pending] = useActionState<AjustesState, FormData>(
    actualizarCredencialesIndividuales,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Tu teléfono"
        name="telefono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={telefono ?? ""}
        placeholder="+54 9 11 1234 5678"
        hint="Para poder loguearte con tu nombre, email o este teléfono."
      />
      <Field
        label="Contraseña de acceso directo"
        name="clave"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        hint="Con esto ya no vas a necesitar tocar 'Ingresar con Google' cada vez."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
