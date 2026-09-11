"use client";

import { useActionState, useState } from "react";
import { actualizarDatosAfip } from "./actions";
import { Button, Field, Toggle } from "@/components/ui";

const CONDICIONES_IVA = [
  { value: "monotributo", label: "Monotributo" },
  { value: "responsable_inscripto", label: "Responsable Inscripto" },
  { value: "exento", label: "Exento" },
] as const;

export function AfipForm({
  gimnasioId,
  habilitado,
  cuit,
  razonSocial,
  condicionIva,
  puntoVenta,
}: {
  gimnasioId: string;
  habilitado: boolean;
  cuit: string | null;
  razonSocial: string | null;
  condicionIva: string | null;
  puntoVenta: number | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarDatosAfip, {
    error: undefined,
    ok: undefined,
  } as { error?: string; ok?: string });
  const [activo, setActivo] = useState(habilitado);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <Toggle
        name="afip_habilitado"
        label="Emitir factura electrónica AFIP"
        hint="Opcional. Al activarlo, cada cobro registrado emite un comprobante AFIP a nombre del gimnasio."
        defaultChecked={habilitado}
        onCheckedChange={setActivo}
      />

      {activo ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CUIT" name="afip_cuit" inputMode="numeric" defaultValue={cuit ?? ""} placeholder="20123456789" />
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="afip_condicion_iva">
              Condición frente al IVA
            </label>
            <select
              id="afip_condicion_iva"
              name="afip_condicion_iva"
              defaultValue={condicionIva ?? ""}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
            >
              <option value="" disabled>
                Elegí una opción
              </option>
              {CONDICIONES_IVA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Razón social"
              name="afip_razon_social"
              defaultValue={razonSocial ?? ""}
              placeholder="Nombre legal del gimnasio"
            />
          </div>
          <Field
            label="Punto de venta"
            name="afip_punto_venta"
            inputMode="numeric"
            defaultValue={puntoVenta ?? ""}
            placeholder="Ej: 1"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
