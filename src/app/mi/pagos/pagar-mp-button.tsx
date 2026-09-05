"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { crearSuscripcionMP } from "./actions";
import { MercadoPagoLogo } from "@/components/ui/mercadopago-logo";

type Props = {
  monto: number;
  plan: string;
  clienteId?: string;
  email?: string | null;
  suscrito?: boolean;
};

export function PagarMpButton({
  monto,
  plan,
  clienteId,
  email: emailInicial,
  suscrito,
}: Props) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(emailInicial ?? "");
  const [pedirEmail, setPedirEmail] = useState(!emailInicial);

  if (suscrito) {
    return (
      <div className="rounded-[14px] border border-rule bg-paper-2 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-ok">
          <span className="size-2 rounded-full bg-ok" />
          <p className="text-sm font-semibold">Débito automático activado</p>
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          Tu cuota de {plan} se debita automáticamente cada mes a través de
          Mercado Pago.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-rule bg-paper-2 p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        Cobro automático con
        <MercadoPagoLogo className="h-4 w-auto shrink-0" />
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">
        {monto.toLocaleString("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        })}
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">Plan {plan} · Mensual</p>

      {pedirEmail ? (
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-medium text-ink-soft">
            Tu email para recibir el comprobante de Mercado Pago
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="socio@ejemplo.com"
            className="w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-ink"
          />
        </div>
      ) : null}

      <Button
        variant="volt"
        className="mt-4 w-full"
        loading={pendiente}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            if (!email.trim() || !email.includes("@")) {
              setPedirEmail(true);
              setError("Ingresá un email válido para continuar.");
              return;
            }
            const r = await crearSuscripcionMP(clienteId, email);
            if (r.url) {
              window.location.href = r.url;
            } else if (r.necesitaEmail) {
              setPedirEmail(true);
              setError(r.error ?? "Ingresá tu email para continuar.");
            } else {
              setError(r.error ?? "No pudimos iniciar el cobro con Mercado Pago.");
            }
          })
        }
      >
        <span className="inline-flex items-center gap-2">
          Pagar con
          <MercadoPagoLogo className="h-4 w-auto shrink-0" />
        </span>
      </Button>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <p className="mt-3 text-xs text-ink-soft">
        Al confirmar en Mercado Pago tu cuota se renovará automáticamente cada mes.
      </p>
    </div>
  );
}

