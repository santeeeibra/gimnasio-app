"use client";

import { useActionState } from "react";
import { confirmarPagoPlataforma } from "../../actions";
import { Button } from "@/components/ui";
import { type TipoPago, TIPO_PAGO_LABEL } from "@/lib/plataforma/precios";

export type PagoPlataformaRow = {
  id: string;
  tipo: TipoPago;
  monto_ars: number;
  monto_original_ars: number | null;
  descuento_pct: number;
  dias: number;
  estado: string;
  proveedor: string;
  nota: string | null;
  creado_at: string;
};

function ConfirmarBtn({
  pagoId,
  monto,
  tipo,
}: {
  pagoId: string;
  monto: number;
  tipo: TipoPago;
}) {
  const [state, action, pending] = useActionState(confirmarPagoPlataforma, null);
  return (
    <form
      action={action}
      className="flex items-center gap-2"
      onSubmit={(e) => {
        const montoFmt = monto.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
        });
        const efecto =
          tipo === "plan_mensual"
            ? `Esto renueva el plan del gimnasio por 30 días y lo deja en estado "activo".`
            : `Es un cargo único (${TIPO_PAGO_LABEL[tipo]}): NO renueva el plan ni cambia el estado del gimnasio.`;
        if (
          !window.confirm(
            `¿Confirmar este pago de ${montoFmt}?\n\n${efecto}\nNo se puede deshacer.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pago_id" value={pagoId} />
      <Button type="submit" variant="ghost" loading={pending}>
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
              · {TIPO_PAGO_LABEL[p.tipo]}
              {p.tipo === "plan_mensual" ? ` · ${p.dias} días` : " · cargo único"}{" "}
              · {p.proveedor}
            </span>
            <span className="block text-xs text-ink-soft">
              {new Date(p.creado_at).toLocaleDateString("es-AR")}
              {p.descuento_pct > 0 ? ` · early-bird −${p.descuento_pct}%` : ""}
              {p.nota ? ` · ${p.nota}` : ""}
            </span>
          </span>
          {p.estado === "pendiente" ? (
            <ConfirmarBtn
              pagoId={p.id}
              monto={Number(p.monto_ars)}
              tipo={p.tipo}
            />
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
