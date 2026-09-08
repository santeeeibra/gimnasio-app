"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { desvincularMercadoPago } from "./mp-connect-actions";
import { MercadoPagoLogo } from "@/components/ui/mercadopago-logo";

// Card "Cobros automáticos con Mercado Pago" en /panel/plan. Sólo se renderiza
// si el gimnasio está en Elite (el gate lo calcula la page con
// estadoCobroAutomatico). Vincular = redirect al OAuth de MP, por eso es un
// <a> a la ruta GET y no una server action.

type Props = {
  vinculado: boolean;
  vinculadoAt: string | null;
  collectorId: string | null;
  configurado: boolean;
  /** ?mp=... con el que volvió el callback. */
  aviso: string | null;
};

const AVISOS: Record<string, { texto: string; error?: boolean }> = {
  vinculado: { texto: "Tu cuenta de Mercado Pago quedó vinculada." },
  error: {
    texto: "No se pudo vincular la cuenta. Probá de nuevo.",
    error: true,
  },
  state_invalido: {
    texto: "El pedido de vinculación venció. Volvé a intentar.",
    error: true,
  },
  no_elite: {
    texto: "El cobro automático es parte del plan Elite.",
    error: true,
  },
  no_configurado: {
    texto: "Falta configurar Mercado Pago del lado de la plataforma.",
    error: true,
  },
};

export function MpConnectCard({
  vinculado,
  vinculadoAt,
  collectorId,
  configurado,
  aviso,
}: Props) {
  const [pendiente, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  const avisoInicial = aviso ? AVISOS[aviso] : undefined;

  return (
    <div className="card-cut border border-rule bg-paper-2 p-5">
      <h2 className="mb-1 text-lg flex flex-wrap items-center gap-2 font-semibold">
        <span>Cobros automáticos con</span>
        <MercadoPagoLogo className="h-5 w-auto shrink-0" showWordmark />
      </h2>
      <p className="mb-4 text-sm text-ink-soft">
        Vinculá tu cuenta de Mercado Pago y tus socios van a poder pagar la
        cuota desde la app. La plata entra directo a tu cuenta y la cuota se
        marca al día sola, sin que cargues nada.
      </p>

      {avisoInicial ? (
        <p
          className={`mb-4 text-sm ${avisoInicial.error ? "text-danger" : "text-ok"}`}
        >
          {avisoInicial.texto}
        </p>
      ) : null}
      {msg ? <p className="mb-4 text-sm text-ok">{msg}</p> : null}

      {!configurado ? (
        <p className="text-sm text-ink-soft">
          Todavía no está habilitado. Escribinos y lo activamos.
        </p>
      ) : vinculado ? (
        <div className="space-y-3">
          <dl className="divide-y divide-rule text-sm">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-ink-soft">Estado</dt>
              <dd className="text-ok">Vinculada</dd>
            </div>
            {collectorId ? (
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-ink-soft">Cuenta MP</dt>
                <dd className="tabular-nums">{collectorId}</dd>
              </div>
            ) : null}
            {vinculadoAt ? (
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-ink-soft">Desde</dt>
                <dd>{new Date(vinculadoAt).toLocaleDateString("es-AR")}</dd>
              </div>
            ) : null}
          </dl>

          {confirmar ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Si desvinculás, tus socios vuelven a pagarte por transferencia y
                vas a tener que cargar los pagos a mano.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  loading={pendiente}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await desvincularMercadoPago();
                      setConfirmar(false);
                      setMsg(r.ok ?? r.error ?? null);
                    })
                  }
                >
                  Sí, desvincular
                </Button>
                <Button variant="ghost" onClick={() => setConfirmar(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmar(true)}>
              Desvincular cuenta
            </Button>
          )}
        </div>
      ) : (
        <a
          href="/api/mp-connect/iniciar"
          className="inline-flex h-11 items-center justify-center gap-2.5 rounded-[10px] bg-ink px-5 text-sm font-semibold text-paper transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-125 active:scale-[0.97]"
        >
          <span>Vincular</span>
          <MercadoPagoLogo className="h-4 w-auto shrink-0" />
        </a>
      )}
    </div>
  );
}
