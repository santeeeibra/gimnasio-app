"use client";

import { useActionState } from "react";
import { altaCliente, type AltaState } from "./actions";
import { Button, Field, Select } from "@/components/ui";
import { SEXOS, SEXO_LABEL } from "@/lib/rutina/tipos";
import { CredencialesCard } from "./credenciales-card";

export function AltaForm({
  planes,
  full = false,
}: {
  planes: { id: string; nombre: string }[];
  full?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AltaState, FormData>(
    altaCliente,
    {},
  );

  return (
    <form action={formAction} className="stagger grid sm:grid-cols-2 gap-4">
      <Field label="Nombre y apellido" name="nombre" required />
      <Field label="DNI" name="dni" inputMode="numeric" required />
      <Field label="Teléfono" name="telefono" inputMode="tel" />

      <Select label="Sexo" name="sexo" defaultValue="">
        <option value="">Sin especificar todavía</option>
        {SEXOS.filter((s) => s !== "sin_especificar").map((s) => (
          <option key={s} value={s}>
            {SEXO_LABEL[s]}
          </option>
        ))}
      </Select>

      <Select label="Plan" name="plan_id" defaultValue="">
        <option value="">Sin plan por ahora</option>
        {planes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>

      <label className="sm:col-span-2 flex items-start gap-2.5 rounded-[6px] border border-rule bg-paper p-3">
        <input
          type="checkbox"
          name="pago_recibido"
          defaultChecked
          className="mt-0.5 size-4 accent-[var(--ink)]"
        />
        <span className="text-sm">
          Pago recibido
          <span className="mt-0.5 block text-xs text-ink-soft">
            Si lo destildás, el socio queda dado de alta pero no puede entrar
            hasta que registres el pago.
          </span>
        </span>
      </label>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        {full ? (
          <p className="w-full text-sm text-danger">
            Alcanzaste el límite de socios de tu plan. Contactá a soporte para
            ampliarlo.
          </p>
        ) : null}
        <Button
          type="submit"
          name="modo"
          value="completa"
          loading={pending}
          disabled={full}
        >
          {pending ? "Creando…" : "Dar de alta"}
        </Button>
        <Button
          type="submit"
          name="modo"
          value="prueba"
          variant="ghost"
          disabled={pending || full}
        >
          1 día de prueba
        </Button>
        {state.error ? (
          <p className="w-full text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="w-full text-sm text-ok">{state.ok}</p>
        ) : null}
        {state.alta ? (
          <div className="w-full">
            <CredencialesCard
              gimnasio={state.alta.gimnasio}
              slug={state.alta.slug}
              dni={state.alta.dni}
              clave={state.alta.clave}
              bloqueado={state.alta.bloqueado}
            />
          </div>
        ) : null}
      </div>
    </form>
  );
}
