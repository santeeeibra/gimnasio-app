"use client";

import { useActionState, useEffect } from "react";
import { generarPagoPlan, type PagoState } from "./actions";
import { Button } from "@/components/ui";

export function PagoForm({
  alias,
  titular,
  hayPendiente,
}: {
  alias: string | null;
  titular: string | null;
  /** true si ya existe un pago pendiente — se bloquea la generación. */
  hayPendiente: boolean;
}) {
  const [state, formAction, pending] = useActionState<PagoState | null, FormData>(
    generarPagoPlan,
    null,
  );

  useEffect(() => {
    if (state?.redirect) window.location.href = state.redirect;
  }, [state?.redirect]);

  // — Estado de éxito: instrucciones paso a paso —
  if (state?.ok && !state.redirect) {
    const montoFmt =
      state.montoARS != null && state.montoARS > 0
        ? state.montoARS.toLocaleString("es-AR", {
            style: "currency",
            currency: "ARS",
          })
        : null;

    return (
      <div className="space-y-4 text-sm">
        <p className="font-medium text-ok">✓ Pago registrado</p>

        <ol className="list-decimal space-y-2 pl-5 text-ink marker:text-ink-soft">
          <li>
            Abrí tu app de banco o homebanking.
          </li>
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
                a nombre de{" "}
                <span className="font-medium">{titular}</span>
              </>
            ) : null}
            .
          </li>
          <li>
            Volvé acá. Tu pago queda{" "}
            <span className="font-medium text-ink-soft">pendiente de confirmación</span>{" "}
            hasta que soporte lo verifique{" "}
            <span className="text-ink-soft">(en general dentro de las 24 hs hábiles)</span>.
          </li>
        </ol>

        <p className="text-xs text-ink-soft">
          No necesitás generar otro pago. Cuando soporte lo confirme, tu plan se
          renueva automáticamente y te avisamos por notificación.
        </p>
      </div>
    );
  }

  // — Pago pendiente existente: bloquear —
  if (hayPendiente) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-ink-soft">
          Ya tenés un pago pendiente de confirmación.
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
          No hace falta generar otro pago. Cuando soporte lo confirme, tu plan
          se renueva automáticamente.
        </p>
      </div>
    );
  }

  // — Formulario para generar pago —
  return (
    <form action={formAction} className="space-y-3">
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
        {pending ? "Generando…" : "Generar pago"}
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
