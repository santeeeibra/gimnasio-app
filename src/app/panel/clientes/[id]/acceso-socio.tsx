"use client";

import { useActionState } from "react";
import { regenerarClave } from "../actions";
import { CredencialesCard } from "../credenciales-card";

export function AccesoSocio({
  clienteId,
  gimnasio,
  slug,
  dni,
  claveInicial,
  yaCambio,
  bloqueado = false,
}: {
  clienteId: string;
  gimnasio: string;
  slug: string;
  dni: string;
  /** contraseña inicial derivada del DNI (gym + últimos 4). */
  claveInicial: string;
  /** true = el socio ya cambió su contraseña; no la conocemos. */
  yaCambio: boolean;
  bloqueado?: boolean;
}) {
  const [state, action, pending] = useActionState(regenerarClave, {});

  // Si se acaba de regenerar, mostramos esa; si no, la inicial (salvo que ya la
  // haya cambiado el socio).
  const clave = state.clave ?? (yaCambio ? null : claveInicial);

  return (
    <div className="space-y-3">
      <CredencialesCard
        gimnasio={gimnasio}
        slug={slug}
        dni={dni}
        clave={clave}
        bloqueado={bloqueado}
      />

      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-[5px] border border-rule bg-paper px-3 text-sm font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
        >
          {pending ? "Regenerando…" : "Regenerar contraseña"}
        </button>
        {state.error ? (
          <span className="text-sm text-danger">{state.error}</span>
        ) : null}
        {state.ok ? (
          <span className="text-sm text-ok">
            Nueva contraseña: <span className="font-display">{state.clave}</span>
          </span>
        ) : null}
      </form>
    </div>
  );
}
