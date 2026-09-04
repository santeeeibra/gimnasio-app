"use client";

import { useActionState, useEffect, useState } from "react";
import { generarPagoPlan, type PagoState } from "./actions";
import { Button } from "@/components/ui";
import {
  type TipoPago,
  TIPO_PAGO_LABEL,
  TIPO_PAGO_DESC,
  CARGO_SETUP_ARS,
  CARGO_PREMIUM_ARS,
  EARLY_BIRD_PCT,
  aplicarDescuento,
  tipoAdmiteEarlyBird,
} from "@/lib/plataforma/precios";

type EstadoPorTipo = Record<TipoPago, "pendiente" | "aprobado" | null>;

const ars = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

export function PagoForm({
  alias,
  titular,
  planNombre,
  planPrecio,
  earlyBird,
  estadoPorTipo,
}: {
  alias: string | null;
  titular: string | null;
  planNombre: string | null;
  /** precio mensual del plan asignado, null si no tiene. */
  planPrecio: number | null;
  /** true si el gimnasio está en la ventana early-bird (primeros 3 días). */
  earlyBird: boolean;
  estadoPorTipo: EstadoPorTipo;
}) {
  const [state, formAction, pending] = useActionState<PagoState | null, FormData>(
    generarPagoPlan,
    null,
  );

  // Monto base por tipo (el mensual sale del plan asignado).
  const montoBase: Record<TipoPago, number> = {
    plan_mensual: planPrecio ?? 0,
    setup: CARGO_SETUP_ARS,
    premium: CARGO_PREMIUM_ARS,
  };

  const opciones = Object.keys(TIPO_PAGO_LABEL) as TipoPago[];
  const disponibles = opciones.filter((t) => estadoPorTipo[t] == null);
  const [tipo, setTipo] = useState<TipoPago>(disponibles[0] ?? "plan_mensual");

  useEffect(() => {
    if (state?.redirect) window.location.href = state.redirect;
  }, [state?.redirect]);

  // — Estado de éxito: instrucciones paso a paso —
  if (state?.ok && !state.redirect) {
    const conDesc = (state.descuentoPct ?? 0) > 0;
    const montoFmt =
      state.montoARS != null && state.montoARS > 0 ? ars(state.montoARS) : null;

    return (
      <div className="space-y-4 text-sm">
        <p className="font-medium text-ok">✓ Pago registrado</p>

        {state.tipo && state.tipo !== "plan_mensual" ? (
          <p className="text-ink-soft">
            Concepto:{" "}
            <span className="text-ink">{TIPO_PAGO_LABEL[state.tipo]}</span>{" "}
            (cargo único).
          </p>
        ) : null}

        {conDesc && state.montoOriginalARS != null ? (
          <p className="text-ink-soft">
            <span className="line-through">{ars(state.montoOriginalARS)}</span>{" "}
            <span className="font-semibold text-ink">
              {ars(state.montoARS ?? 0)}
            </span>{" "}
            <span className="rounded bg-[color:var(--ok-weak,transparent)] text-ok">
              early-bird −{state.descuentoPct}%
            </span>
          </p>
        ) : null}

        <ol className="list-decimal space-y-2 pl-5 text-ink marker:text-ink-soft">
          <li>Abrí tu app de banco o homebanking.</li>
          <li>
            Transferí{" "}
            {montoFmt ? (
              <span className="font-semibold">{montoFmt}</span>
            ) : (
              "el monto indicado por soporte"
            )}{" "}
            al alias{" "}
            {alias ? (
              <span className="inline-flex items-center gap-1.5">
                <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[13px] font-semibold">
                  {alias}
                </code>
                <CopyBtn text={alias} />
              </span>
            ) : (
              <span className="text-ink-soft">(consultá con soporte)</span>
            )}
            {titular ? (
              <>
                {" "}
                a nombre de <span className="font-medium">{titular}</span>
              </>
            ) : null}
            .
          </li>
          <li>
            Volvé acá. Tu pago queda{" "}
            <span className="font-medium text-ink-soft">
              pendiente de confirmación
            </span>{" "}
            hasta que soporte lo verifique{" "}
            <span className="text-ink-soft">
              (en general dentro de las 24 hs hábiles)
            </span>
            .
          </li>
        </ol>

        <p className="text-xs text-ink-soft">
          No necesitás generar otro pago.
          {state.tipo === "plan_mensual" || !state.tipo
            ? " Cuando soporte lo confirme, tu plan se renueva automáticamente y te avisamos por notificación."
            : " Cuando soporte lo confirme, te avisamos por notificación."}
        </p>
      </div>
    );
  }

  if (disponibles.length === 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-ink-soft">
          Ya tenés un pago pendiente de confirmación por cada concepto.
        </p>
        {alias ? (
          <p className="text-ink-soft">
            Si todavía no transferiste, hacelo a{" "}
            <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[13px] font-semibold text-ink">
              {alias}
            </code>
            {titular ? (
              <>
                {" "}
                (<span className="text-ink">{titular}</span>)
              </>
            ) : null}
            .
          </p>
        ) : null}
        <p className="text-xs text-ink-soft">
          Cuando soporte lo confirme, se aplica automáticamente.
        </p>
      </div>
    );
  }

  const base = montoBase[tipo];
  const aplicaDesc = earlyBird && tipoAdmiteEarlyBird(tipo) && base > 0;
  const montoFinal = aplicaDesc ? aplicarDescuento(base, EARLY_BIRD_PCT) : base;

  // — Formulario para generar pago —
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tipo" value={tipo} />

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-[13px] font-medium text-ink-soft">
          ¿Qué querés pagar?
        </legend>
        {opciones.map((t) => {
          const estado = estadoPorTipo[t];
          const bloqueado = estado != null;
          const b = montoBase[t];
          const desc = earlyBird && tipoAdmiteEarlyBird(t) && b > 0;
          const final = desc ? aplicarDescuento(b, EARLY_BIRD_PCT) : b;
          return (
            <label
              key={t}
              className={`flex cursor-pointer gap-3 rounded-[6px] border p-3 transition-[border-color,background-color] duration-150 [transition-timing-function:var(--ease-out)] ${
                tipo === t && !bloqueado
                  ? "border-ink bg-paper"
                  : "border-rule"
              } ${bloqueado ? "cursor-not-allowed opacity-55" : "hover:border-ink-soft"}`}
            >
              <input
                type="radio"
                name="tipo_radio"
                className="mt-0.5"
                checked={tipo === t}
                disabled={bloqueado}
                onChange={() => setTipo(t)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="font-medium text-ink">
                    {TIPO_PAGO_LABEL[t]}
                    {t !== "plan_mensual" ? (
                      <span className="ml-1.5 text-xs font-normal text-ink-soft">
                        cargo único
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm">
                    {b > 0 ? (
                      desc ? (
                        <>
                          <span className="text-ink-soft line-through">
                            {ars(b)}
                          </span>{" "}
                          <span className="font-semibold text-ink">
                            {ars(final)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-ink">{ars(b)}</span>
                      )
                    ) : (
                      <span className="text-ink-soft">sin precio</span>
                    )}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t === "plan_mensual" && planNombre
                    ? `${planNombre} · `
                    : ""}
                  {TIPO_PAGO_DESC[t]}
                </span>
                {bloqueado ? (
                  <span className="mt-1 block text-xs text-ink-soft">
                    {estado === "aprobado"
                      ? "Ya abonado."
                      : "Pendiente de confirmación."}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {earlyBird ? (
        <p className="rounded-[6px] border border-rule bg-paper px-3 py-2 text-xs text-ink-soft">
          <span className="font-medium text-ink">Descuento early-bird −{EARLY_BIRD_PCT}%</span>{" "}
          aplicado al plan mensual y al setup por comprar en los primeros días de
          tu prueba.
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">
          Nota (opcional)
        </span>
        <textarea
          name="nota"
          rows={2}
          placeholder="Comprobante, referencia de la transferencia, etc."
          className="w-full rounded-[5px] border border-rule bg-paper p-3 text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink"
        />
      </label>

      {state?.msg && !state.ok ? (
        <p className="text-sm text-danger">{state.msg}</p>
      ) : null}

      <Button type="submit" loading={pending}>
        {pending
          ? "Generando…"
          : montoFinal > 0
            ? `Generar pago · ${ars(montoFinal)}`
            : "Generar pago"}
      </Button>
    </form>
  );
}

// ─── Botón copiar al portapapeles ───
function CopyBtn({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
      }}
      className="inline-flex size-6 items-center justify-center rounded text-ink-soft transition-colors hover:bg-paper hover:text-ink"
      title="Copiar"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-3.5"
      >
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
        <path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5" />
      </svg>
    </button>
  );
}
