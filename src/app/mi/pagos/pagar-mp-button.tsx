"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { iniciarPagoMercadoPago } from "./actions";

// Sólo se monta si el gimnasio está en Elite y tiene MP vinculado (lo decide
// /mi/pagos/page.tsx). Al tocar, se crea el pago pendiente y se redirige al
// checkout de Mercado Pago.

export function PagarMpButton({ monto, plan }: { monto: number; plan: string }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-[14px] border border-rule bg-paper-2 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Pagar tu cuota
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">
        {monto.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        })}
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">Plan {plan}</p>

      <Button
        variant="volt"
        className="mt-4 w-full"
        loading={pendiente}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await iniciarPagoMercadoPago();
            if (r.url) window.location.href = r.url;
            else setError(r.error ?? "No pudimos iniciar el pago.");
          })
        }
      >
        Pagar con Mercado Pago
      </Button>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <p className="mt-3 text-xs text-ink-soft">
        Al confirmar el pago tu cuota se actualiza sola.
      </p>
    </div>
  );
}
