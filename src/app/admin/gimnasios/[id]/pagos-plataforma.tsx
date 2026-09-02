"use client";

import { useActionState } from "react";
import { confirmarPagoPlataforma } from "../../actions";
import { Button } from "@/components/ui";

export type PagoPlataformaRow = {
  id: string;
  monto_ars: number;
  dias: number;
  estado: string;
  proveedor: string;
  nota: string | null;
  creado_at: string;
};

function ConfirmarBtn({ pagoId }: { pagoId: string }) {
  const [state, action, pending] = useActionState(confirmarPagoPlataforma, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="pago_id" value={pagoId} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "…" : "Confirmar"}
      </Button>
      {state?.msg ? (
        <span className={`text-xs ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}

export function PagosPlataforma({ pagos }: { pagos: PagoPlataformaRow[] }) {
  if (pagos.length === 0) {
    return <p className="text-sm text-ink-soft">Sin pagos de plataforma.</p>;
  }
  return (
    <ul className="divide-y divide-rule">
      {pagos.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
        >
          <span className="min-w-0">
            <span className="block">
              {Number(p.monto_ars).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}{" "}
              · {p.dias} días · {p.proveedor}
            </span>
            <span className="block text-xs text-ink-soft">
              {new Date(p.creado_at).toLocaleDateString("es-AR")}
              {p.nota ? ` · ${p.nota}` : ""}
            </span>
          </span>
          {p.estado === "pendiente" ? (
            <ConfirmarBtn pagoId={p.id} />
          ) : (
            <span
              className={`shrink-0 text-xs ${
                p.estado === "aprobado" ? "text-ok" : "text-danger"
              }`}
            >
              {p.estado}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
