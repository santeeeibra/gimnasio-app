"use client";

import { useActionState, useEffect, useState } from "react";
import { confirmarPagoPlataforma, rechazarPagoPlataforma } from "../../actions";
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
  plan_nombre?: string | null;
};

const MOTIVOS_PRESET = [
  "Transferencia no acreditada en la cuenta bancaria",
  "Monto transferido incorrecto o incompleto",
  "Comprobante inválido o ilegible",
  "Pago duplicado o generado por error",
  "Otro motivo...",
];

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

function RechazarBtn({
  pagoId,
  monto,
  tipo,
}: {
  pagoId: string;
  monto: number;
  tipo: TipoPago;
}) {
  const [abierto, setAbierto] = useState(false);
  const [preset, setPreset] = useState(MOTIVOS_PRESET[0]);
  const [detalle, setDetalle] = useState("");
  const [state, action, pending] = useActionState(rechazarPagoPlataforma, null);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  const motivoFinal =
    preset === "Otro motivo..."
      ? detalle.trim()
      : detalle.trim()
        ? `${preset} (${detalle.trim()})`
        : preset;

  const montoFmt = monto.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setAbierto(true)}
        className="border-danger/30 text-danger hover:border-danger/50 hover:bg-danger/10 hover:text-danger"
      >
        Rechazar
      </Button>

      {abierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rechazar pago de plataforma"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--scrim)] p-4 animate-fade-in sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-lg leading-tight text-ink">
                  Rechazar pago
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  {TIPO_PAGO_LABEL[tipo]} · {montoFmt}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAbierto(false)}
                className="grid size-8 shrink-0 place-items-center rounded-[5px] text-ink-soft transition-transform duration-150 hover:bg-paper-2 active:scale-90"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>

            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="pago_id" value={pagoId} />
              <input type="hidden" name="motivo" value={motivoFinal} />

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">
                  Motivo de rechazo
                </span>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  className="h-10 w-full rounded-[5px] border border-rule bg-paper px-3 text-sm text-ink outline-none focus:border-ink"
                >
                  {MOTIVOS_PRESET.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ink-soft">
                  {preset === "Otro motivo..." ? "Detalle (requerido)" : "Aclaración (opcional)"}
                </span>
                <textarea
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  rows={2}
                  required={preset === "Otro motivo..."}
                  placeholder={
                    preset === "Otro motivo..."
                      ? "Indicá el motivo exacto..."
                      : "Ej: se transfirió $20.000 en vez de $25.000..."
                  }
                  className="w-full rounded-[5px] border border-rule bg-paper p-2.5 text-sm text-ink outline-none focus:border-ink"
                />
              </label>

              <p className="text-[11px] text-ink-soft">
                Al rechazar, se notificará al dueño por push y correo, y podrá generar un nuevo pago desde su panel.
              </p>

              {state?.msg ? (
                <p className={`text-xs ${state.ok ? "text-ok" : "text-danger"}`}>
                  {state.msg}
                </p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  variant="danger"
                  loading={pending}
                  className="flex-1"
                >
                  {pending ? "Rechazando…" : "Confirmar rechazo"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setAbierto(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function PagosPlataforma({ pagos }: { pagos: PagoPlataformaRow[] }) {
  if (pagos.length === 0) {
    return <p className="text-sm text-ink-soft">Sin pagos de plataforma.</p>;
  }
  const primerPendienteId = pagos.find((p) => p.estado === "pendiente")?.id;

  return (
    <ul className="divide-y divide-rule">
      {pagos.map((p) => {
        const esPrimerPendiente = p.id === primerPendienteId;
        return (
          <li
            key={p.id}
            data-tour={esPrimerPendiente ? "admin-pago-pendiente" : undefined}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block">
                {Number(p.monto_ars).toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}{" "}
                · {TIPO_PAGO_LABEL[p.tipo]}
                {p.tipo === "plan_mensual"
                  ? ` (${p.plan_nombre ? `Plan ${p.plan_nombre}` : "plan"} · ${p.dias} días)`
                  : " · cargo único"}{" "}
                · {p.proveedor}
              </span>
              <span className="block text-xs text-ink-soft">
                {new Date(p.creado_at).toLocaleDateString("es-AR")}
                {p.descuento_pct > 0 ? ` · early-bird −${p.descuento_pct}%` : ""}
                {p.nota ? ` · ${p.nota}` : ""}
              </span>
            </span>
            {p.estado === "pendiente" ? (
              <div
                data-tour={esPrimerPendiente ? "admin-pago-confirmar" : undefined}
                className="flex items-center gap-2"
              >
                <ConfirmarBtn
                  pagoId={p.id}
                  monto={Number(p.monto_ars)}
                  tipo={p.tipo}
                />
                <RechazarBtn
                  pagoId={p.id}
                  monto={Number(p.monto_ars)}
                  tipo={p.tipo}
                />
              </div>
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
        );
      })}
    </ul>
  );
}
