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

export type PlanItem = {
  id: string;
  nombre: string;
  max_socios: number | null;
  precio_mensual: number;
  orden: number;
};

type EstadoPorTipo = Record<TipoPago, "pendiente" | "aprobado" | null>;

const ars = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const PLAN_FEATURES: Record<string, string[]> = {
  Básico: [
    "Hasta 30 socios activos",
    "Rutinas y biblioteca de ejercicios",
    "Control de cuotas y transferencias",
    "Notificaciones push a socios",
  ],
  Pro: [
    "Hasta 45 socios activos",
    "Todo lo incluido en Básico",
    "Control de asistencia y reposo",
    "Soporte prioritario",
  ],
  Elite: [
    "Hasta 300 socios activos",
    "Capacidad para alta concurrencia",
    "Métricas y reportes avanzados",
    "Soporte directo de alta prioridad",
  ],
};

function CheckIcon({ className = "size-3.5 shrink-0 text-ok" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

export function PagoForm({
  alias,
  titular,
  planes,
  planActualId,
  sociosActuales,
  earlyBird,
  estadoPorTipo,
}: {
  alias: string | null;
  titular: string | null;
  planes: PlanItem[];
  planActualId: string | null;
  sociosActuales: number;
  /** true si el gimnasio está en la ventana early-bird (primeros 3 días). */
  earlyBird: boolean;
  estadoPorTipo: EstadoPorTipo;
}) {
  const [state, formAction, pending] = useActionState<PagoState | null, FormData>(
    generarPagoPlan,
    null,
  );

  const opciones = Object.keys(TIPO_PAGO_LABEL) as TipoPago[];
  const disponibles = opciones.filter((t) => estadoPorTipo[t] == null);
  const [tipo, setTipo] = useState<TipoPago>(disponibles[0] ?? "plan_mensual");

  // Plan mensual seleccionado: por default el plan asignado, o el primer plan apto según socios
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    if (planActualId && planes.some((p) => p.id === planActualId)) {
      return planActualId;
    }
    const apto = planes.find(
      (p) => p.max_socios == null || p.max_socios >= sociosActuales,
    );
    return apto?.id ?? planes[0]?.id ?? "";
  });

  const selectedPlan =
    planes.find((p) => p.id === selectedPlanId) ?? planes[0] ?? null;

  // Monto base por tipo (el mensual sale del plan seleccionado).
  const montoBase: Record<TipoPago, number> = {
    plan_mensual: selectedPlan?.precio_mensual ?? 0,
    setup: CARGO_SETUP_ARS,
    premium: CARGO_PREMIUM_ARS,
  };

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

        <p className="text-ink-soft">
          Concepto:{" "}
          <span className="text-ink">
            {state.tipo === "plan_mensual"
              ? `Plan ${state.planNombre ?? "mensual"} (30 días)`
              : `${TIPO_PAGO_LABEL[state.tipo ?? "setup"]} (cargo único)`}
          </span>
        </p>

        {conDesc && state.montoOriginalARS != null ? (
          <p className="text-ink-soft">
            <span className="line-through">{ars(state.montoOriginalARS)}</span>{" "}
            <span className="font-semibold text-ink">
              {ars(state.montoARS ?? 0)}
            </span>{" "}
            <span className="rounded bg-[color:var(--ok-weak,transparent)] px-1.5 py-0.5 text-xs text-ok">
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
            ? " Cuando soporte lo confirme, tu plan se activa automáticamente por 30 días y te avisamos por notificación."
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

  const planMensualBloqueado = estadoPorTipo.plan_mensual != null;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tipo" value={tipo} />
      {tipo === "plan_mensual" && selectedPlan ? (
        <input type="hidden" name="plan_id" value={selectedPlan.id} />
      ) : null}

      {/* ── 1. Catálogo de Planes Mensuales ── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <label className="block text-[13px] font-medium text-ink">
            Planes de suscripción mensual
          </label>
          {planMensualBloqueado ? (
            <span className="text-xs text-ink-soft">
              (Pago pendiente de confirmación)
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {planes.map((p) => {
            const esActual = p.id === planActualId;
            const esSeleccionado = tipo === "plan_mensual" && selectedPlanId === p.id;
            const cupoInsuficiente =
              p.max_socios != null && sociosActuales > p.max_socios;
            const bloqueado = planMensualBloqueado || cupoInsuficiente;

            const b = p.precio_mensual;
            const desc = earlyBird && b > 0;
            const final = desc ? aplicarDescuento(b, EARLY_BIRD_PCT) : b;
            const features = PLAN_FEATURES[p.nombre] ?? [
              p.max_socios ? `Hasta ${p.max_socios} socios activos` : "Socios ilimitados",
              "Acceso completo a la plataforma",
            ];

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!bloqueado) {
                    setTipo("plan_mensual");
                    setSelectedPlanId(p.id);
                  }
                }}
                className={`card-cut relative rounded-[6px] border p-4 transition-all duration-150 [transition-timing-function:var(--ease-out)] ${
                  esSeleccionado && !bloqueado
                    ? "border-ink bg-paper shadow-sm ring-1 ring-ink"
                    : "border-rule bg-paper-2 hover:border-ink-soft"
                } ${bloqueado ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="plan_selection"
                      checked={esSeleccionado}
                      disabled={bloqueado}
                      onChange={() => {
                        setTipo("plan_mensual");
                        setSelectedPlanId(p.id);
                      }}
                      className="mt-0.5 size-4 accent-ink"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-semibold text-ink">{p.nombre}</span>
                        {esActual ? (
                          <span className="rounded border border-rule bg-paper px-1.5 py-0.5 text-[10px] font-medium text-ink">
                            Tu plan actual
                          </span>
                        ) : p.nombre === "Pro" ? (
                          <span className="rounded border border-volt/40 bg-volt/15 px-1.5 py-0.5 text-[10px] font-semibold text-volt-ink">
                            Recomendado
                          </span>
                        ) : null}
                        {cupoInsuficiente ? (
                          <span className="rounded border border-danger/30 bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">
                            Cupo insuficiente
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-ink-soft">
                        {p.max_socios == null
                          ? "Socios ilimitados"
                          : `Hasta ${p.max_socios} socios activos`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    {desc ? (
                      <div>
                        <span className="mr-1.5 text-xs text-ink-soft line-through">
                          {ars(b)}
                        </span>
                        <span className="font-bold text-ink">{ars(final)}</span>
                        <span className="block text-[10px] text-ok">
                          early-bird −{EARLY_BIRD_PCT}%
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-ink">{ars(b)}/mes</span>
                    )}
                  </div>
                </div>

                <ul className="mt-3 space-y-1 border-t border-rule/50 pt-2.5 text-xs text-ink-soft">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-center gap-1.5">
                      <CheckIcon />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {cupoInsuficiente ? (
                  <p className="mt-2 text-xs text-danger">
                    Tu gimnasio tiene {sociosActuales} socios activos. Para este plan necesitás reducir socios o elegir un plan de mayor capacidad.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. Servicios adicionales (cargos únicos) ── */}
      <div className="space-y-3 border-t border-rule pt-4">
        <label className="block text-[13px] font-medium text-ink-soft">
          Servicios adicionales (pago único)
        </label>
        <div className="space-y-2">
          {(["setup", "premium"] as const).map((t) => {
            const estado = estadoPorTipo[t];
            const bloqueado = estado != null;
            const b = montoBase[t];
            const desc = earlyBird && tipoAdmiteEarlyBird(t) && b > 0;
            const final = desc ? aplicarDescuento(b, EARLY_BIRD_PCT) : b;
            const esSeleccionado = tipo === t;

            return (
              <label
                key={t}
                className={`flex cursor-pointer gap-3 rounded-[6px] border p-3 transition-[border-color,background-color] duration-150 [transition-timing-function:var(--ease-out)] ${
                  esSeleccionado && !bloqueado
                    ? "border-ink bg-paper ring-1 ring-ink"
                    : "border-rule bg-paper-2"
                } ${bloqueado ? "cursor-not-allowed opacity-55" : "hover:border-ink-soft"}`}
              >
                <input
                  type="radio"
                  name="tipo_radio"
                  className="mt-0.5 size-4 accent-ink"
                  checked={esSeleccionado}
                  disabled={bloqueado}
                  onChange={() => setTipo(t)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-medium text-ink">
                      {TIPO_PAGO_LABEL[t]}
                      <span className="ml-1.5 text-xs font-normal text-ink-soft">
                        cargo único
                      </span>
                    </span>
                    <span className="text-sm">
                      {desc ? (
                        <>
                          <span className="text-ink-soft line-through mr-1 text-xs">
                            {ars(b)}
                          </span>
                          <span className="font-semibold text-ink">
                            {ars(final)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-ink">{ars(b)}</span>
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
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
        </div>
      </div>

      {earlyBird ? (
        <p className="rounded-[6px] border border-rule bg-paper px-3 py-2 text-xs text-ink-soft">
          <span className="font-medium text-ink">Descuento early-bird −{EARLY_BIRD_PCT}%</span>{" "}
          aplicado al plan mensual y al setup por comprar en los primeros días de tu prueba.
        </p>
      ) : null}

      {/* ── 3. Resumen y envío de pago ── */}
      <div className="space-y-4 border-t border-rule pt-4">
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

        <Button
          type="submit"
          loading={pending}
          disabled={estadoPorTipo[tipo] != null}
          className="w-full"
        >
          {pending
            ? "Generando…"
            : tipo === "plan_mensual" && selectedPlan
              ? `Generar pago · Plan ${selectedPlan.nombre} · ${ars(montoFinal)}`
              : `Generar pago · ${TIPO_PAGO_LABEL[tipo]} · ${ars(montoFinal)}`}
        </Button>
      </div>
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
