"use client";

import { useActionState } from "react";
import { editarCliente } from "../actions";
import { Button, Field, Select, linkClasses } from "@/components/ui";
import { SEXOS, SEXO_LABEL, type Sexo } from "@/lib/rutina/tipos";
import { BajaClienteModal } from "./baja-cliente-modal";

export function EditarDatos({
  clienteId,
  nombre,
  dni,
  telefono,
  email,
  sexo,
}: {
  clienteId: string;
  nombre: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  sexo: Sexo | null;
}) {
  const [state, action, pending] = useActionState(editarCliente, {});

  return (
    <div className="border-t border-rule pt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <details className="group flex-1">
          <summary
            className={`w-fit cursor-pointer select-none text-sm ${linkClasses.inline}`}
          >
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
        <Field
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          defaultValue={email ?? ""}
          hint="Para que el socio recupere la contraseña."
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

        <BajaClienteModal clienteId={clienteId} nombre={nombre} dni={dni} />
      </div>
    </div>
  );
}
