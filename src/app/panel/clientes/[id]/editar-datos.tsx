"use client";

import { useActionState } from "react";
import { editarCliente } from "../actions";
import { Button, Field, Select } from "@/components/ui";
import { SEXOS, SEXO_LABEL, type Sexo } from "@/lib/rutina/tipos";

export function EditarDatos({
  clienteId,
  nombre,
  dni,
  telefono,
  sexo,
}: {
  clienteId: string;
  nombre: string;
  dni: string;
  telefono: string | null;
  sexo: Sexo | null;
}) {
  const [state, action, pending] = useActionState(editarCliente, {});

  return (
    <details className="group border-t border-rule pt-4">
      <summary className="w-fit cursor-pointer select-none text-sm text-ink-soft underline underline-offset-2">
        Editar datos del socio
      </summary>

      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <Field
          label="Nombre y apellido"
          name="nombre"
          defaultValue={nombre}
          required
        />
        <Field
          label="DNI"
          name="dni"
          inputMode="numeric"
          defaultValue={dni}
          hint="Es el usuario con el que el socio inicia sesión."
          required
        />
        <Field
          label="Teléfono"
          name="telefono"
          inputMode="tel"
          defaultValue={telefono ?? ""}
        />
        <Select label="Sexo" name="sexo" defaultValue={sexo ?? ""}>
          <option value="">Sin especificar</option>
          {SEXOS.filter((s) => s !== "sin_especificar").map((s) => (
            <option key={s} value={s}>
              {SEXO_LABEL[s]}
            </option>
          ))}
        </Select>

        <div className="sm:col-span-2">
          <Field
            label="Nueva contraseña (opcional)"
            name="clave"
            type="text"
            autoComplete="off"
            hint="Dejala vacía para no cambiarla. Si la cambiás, el socio deberá elegir una nueva al ingresar."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          {state.error ? (
            <p className="w-full text-sm text-danger">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="w-full text-sm text-ok">
              {state.ok}
              {state.clave ? (
                <>
                  {" "}
                  Nueva contraseña:{" "}
                  <span className="font-display">{state.clave}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </form>
    </details>
  );
}
