"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { desconectarMercadoPago } from "./mp-actions";

type Props = {
  elite: boolean;
  vinculado: boolean;
  userId: string | null;
  vinculadoAt: string | null;
  configurado: boolean;
  aviso?: string | null;
};

const AVISOS: Record<string, { texto: string; error?: boolean }> = {
  vinculado: { texto: "Tu cuenta de Mercado Pago quedó conectada con éxito." },
  error: {
    texto: "No se pudo conectar la cuenta. Probá de nuevo.",
    error: true,
  },
  state_invalido: {
    texto: "La solicitud de conexión venció. Volvé a intentar.",
    error: true,
  },
  no_elite: {
    texto: "El cobro automático es un beneficio exclusivo del plan Elite.",
    error: true,
  },
  no_configurado: {
    texto: "Falta configurar Mercado Pago en la plataforma.",
    error: true,
  },
};

export function MercadoPagoAjustesCard({
  elite,
  vinculado,
  userId,
  vinculadoAt,
  configurado,
  aviso,
}: Props) {
  const [pendiente, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  // Si no es Elite y no tiene cuenta vinculada, no se muestra nada (gating)
  if (!elite && !vinculado) {
    return null;
  }

  const avisoInicial = aviso ? AVISOS[aviso] : undefined;
  const esDowngrade = !elite && vinculado;

  return (
    <div className="card-cut card-cut-lg mt-6 border border-rule bg-paper-2 p-6">
      <h2 className="text-lg mb-1">Cobro automático con Mercado Pago</h2>
      <p className="text-sm text-ink-soft mb-4">
        Permite a tus socios adherirse al débito automático mensual de su cuota.
        La plata entra directo a tu cuenta de Mercado Pago.
      </p>

      {avisoInicial ? (
        <p
          className={`mb-4 text-sm ${avisoInicial.error ? "text-danger" : "text-ok"}`}
        >
          {avisoInicial.texto}
        </p>
      ) : null}

      {msg ? <p className="mb-4 text-sm text-ok">{msg}</p> : null}

      {esDowngrade ? (
        <div className="mb-4 rounded-[8px] border border-warn/30 bg-warn/10 p-3.5 text-sm text-warn">
          Tu plan ya no incluye cobro automático; las suscripciones activas
          siguen funcionando pero no podés crear nuevas.
        </div>
      ) : null}

      {!configurado ? (
        <p className="text-sm text-ink-soft">
          El servicio todavía no está configurado en la plataforma. Escribinos a
          soporte para activarlo.
        </p>
      ) : vinculado ? (
        <div className="space-y-4">
          <dl className="divide-y divide-rule text-sm">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-ink-soft">Estado</dt>
              <dd className="text-ok font-medium">Conectado</dd>
            </div>
            {userId ? (
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-ink-soft">Cuenta MP</dt>
                <dd className="tabular-nums">Conectado como {userId}</dd>
              </div>
            ) : null}
            {vinculadoAt ? (
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-ink-soft">Conectado desde</dt>
                <dd>{new Date(vinculadoAt).toLocaleDateString("es-AR")}</dd>
              </div>
            ) : null}
          </dl>

          {confirmar ? (
            <div className="space-y-3 rounded-[8px] border border-rule bg-paper p-3.5">
              <p className="text-sm text-ink-soft">
                Si desconectás tu cuenta, no podrás recibir nuevos cobros automáticos.
                Las suscripciones activas en Mercado Pago seguirán cobrando hasta que
                las canceles en tu panel de Mercado Pago.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  loading={pendiente}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await desconectarMercadoPago();
                      setConfirmar(false);
                      setMsg(r.ok ?? r.error ?? null);
                    })
                  }
                >
                  Sí, desconectar
                </Button>
                <Button variant="ghost" onClick={() => setConfirmar(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmar(true)}>
              Desconectar cuenta
            </Button>
          )}
        </div>
      ) : (
        <div>
          <a
            href="/api/mercadopago/iniciar"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[5px] bg-ink px-5 text-sm font-medium text-paper transition-[transform,filter] duration-150 hover:brightness-125 active:scale-[0.97]"
          >
            Conectar Mercado Pago
          </a>
        </div>
      )}
    </div>
  );
}
