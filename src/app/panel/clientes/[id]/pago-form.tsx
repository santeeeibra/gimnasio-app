"use client";

import { useState, useId, useEffect, useRef, useTransition } from "react";
import { registrarPago } from "../actions";
import { Button, Field } from "@/components/ui";
import { hapticoPagoAprobado, hapticoError } from "@/lib/ui/hapticos";
import { encolar } from "@/lib/offline/cola";
import { aplicarPagoLocal, actualizarSocioLocal } from "@/lib/offline/padron";
import { useConexionSupabase } from "@/lib/offline/conexion";

export interface PlanConDescuentos {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias?: number;
  descuentos?: { id: string; nombre: string; porcentaje: number }[];
}

// Corto a propósito: sin red, el pago se resuelve local al instante (ver
// aplicarPagoLocal) en vez de dejar al dueño esperando al server.
const TIMEOUT_MS = 3_000;

function nuevoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function PagoForm({
  clienteId,
  planes,
  planActual,
  fechaVencimiento,
}: {
  clienteId: string;
  planes: PlanConDescuentos[];
  planActual: string | null;
  fechaVencimiento?: string | null;
}) {
  const { estado: estadoConexion } = useConexionSupabase();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ error?: string; ok?: string }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [fechaManual, setFechaManual] = useState(false);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<string>(
    planActual ?? planes[0]?.id ?? "",
  );
  const [montoCustom, setMontoCustom] = useState<string>("");
  const [medioPago, setMedioPago] = useState<"efectivo" | "transferencia">("efectivo");

  // Refresca el padrón local con el vencimiento server-rendered de esta
  // pantalla, así aplicarPagoLocal() parte de un dato fresco aunque el
  // padrón cacheado no se haya actualizado hace rato.
  useEffect(() => {
    if (fechaVencimiento !== undefined) {
      actualizarSocioLocal(clienteId, { fecha_vencimiento: fechaVencimiento });
    }
  }, [clienteId, fechaVencimiento]);

  useEffect(() => {
    if (state.ok) {
      hapticoPagoAprobado();
    } else if (state.error) {
      hapticoError();
    }
  }, [state]);

  const planSeleccionado = planes.find((p) => p.id === planSeleccionadoId);
  const descuentosActivos = (planSeleccionado?.descuentos ?? []).filter(
    (d) => (d.porcentaje ?? 0) > 0,
  );

  function aplicarDescuento(porcentaje: number) {
    if (!planSeleccionado) return;
    const nuevoMonto = Math.round(
      planSeleccionado.precio * (1 - porcentaje / 100),
    );
    setMontoCustom(String(nuevoMonto));
  }

  const selectId = useId();

  function resolverLocal(fd: FormData, idempotencyKey: string) {
    const plan = planes.find((p) => p.id === String(fd.get("plan_id") ?? ""));
    const fechaManualVal = String(fd.get("fecha_vencimiento_manual") ?? "").trim() || null;
    const cubreHasta = aplicarPagoLocal(
      clienteId,
      plan?.duracion_dias ?? 30,
      fechaManualVal,
    );
    encolar("pago_cuota", {
      cliente_id: clienteId,
      plan_id: String(fd.get("plan_id") ?? ""),
      monto: Number(fd.get("monto") ?? 0) || null,
      comprobante_ref: String(fd.get("comprobante_ref") ?? "").trim() || null,
      medio_pago: String(fd.get("medio_pago") ?? "efectivo"),
      fecha_vencimiento_manual: fechaManualVal,
      idempotency_key: idempotencyKey,
    });
    setState({ ok: `Pago registrado (offline). Cuota al día hasta ${cubreHasta}. Se sincroniza al volver la conexión.` });
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!planSeleccionadoId) {
      setState({ error: "Elegí el plan que pagó." });
      return;
    }
    const fd = new FormData(e.currentTarget);
    const idempotencyKey = nuevoId();
    fd.set("idempotency_key", idempotencyKey);

    if (estadoConexion === "desconectado") {
      resolverLocal(fd, idempotencyKey);
      return;
    }

    startTransition(async () => {
      try {
        const res = await Promise.race([
          registrarPago({}, fd),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS),
          ),
        ]);
        setState(res);
      } catch {
        resolverLocal(fd, idempotencyKey);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
        <input type="hidden" name="cliente_id" value={clienteId} />
        <div>
          <label htmlFor={selectId} className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Plan pagado
          </label>
          <select
            id={selectId}
            name="plan_id"
            value={planSeleccionadoId}
            onChange={(e) => {
              setPlanSeleccionadoId(e.target.value);
              setMontoCustom("");
            }}
            className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink"
          >
            <option value="">Elegir…</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (${p.precio.toLocaleString("es-AR")})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Field
            label="Monto recibido ($)"
            name="monto"
            value={montoCustom}
            onChange={(e) => setMontoCustom(e.target.value)}
            inputMode="numeric"
            placeholder={
              planSeleccionado
                ? `Por defecto: $${planSeleccionado.precio.toLocaleString("es-AR")}`
                : "deja vacío = precio del plan"
            }
          />
        </div>

        <Button type="submit" loading={pending} disabled={pending}>
          {pending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>

      {/* SELECTOR RÁPIDO DE DESCUENTOS SI EL PLAN LOS TIENE */}
      {descuentosActivos.length > 0 && planSeleccionado ? (
        <div className="flex items-center gap-2 flex-wrap text-xs bg-paper-2 border border-rule p-2 rounded-[5px]">
          <span className="text-ink-soft font-medium">Aplicar tarifa:</span>
          <button
            type="button"
            onClick={() => setMontoCustom(String(planSeleccionado.precio))}
            className="px-2 py-1 rounded bg-paper border border-rule hover:border-ink text-ink font-mono"
          >
            General (${planSeleccionado.precio.toLocaleString("es-AR")})
          </button>
          {descuentosActivos.map((d) => {
            const precioDesc = Math.round(
              planSeleccionado.precio * (1 - d.porcentaje / 100),
            );
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => aplicarDescuento(d.porcentaje)}
                className="px-2 py-1 rounded bg-ok/10 text-ok border border-ok/25 hover:bg-ok/20 font-medium transition-colors"
              >
                {d.nombre} -{d.porcentaje}% (${precioDesc.toLocaleString("es-AR")})
              </button>
            );
          })}
        </div>
      ) : null}

      <div>
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">Medio de pago</span>
        <input type="hidden" name="medio_pago" value={medioPago} />
        <div className="flex gap-2">
          {(["efectivo", "transferencia"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMedioPago(m)}
              className={`px-3 py-1.5 rounded-[5px] border text-sm capitalize transition-colors ${
                medioPago === m
                  ? "border-ink bg-ink text-paper font-medium"
                  : "border-rule bg-paper text-ink-soft hover:border-ink/40"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Comprobante / referencia{" "}
          <span className="font-normal text-ink-soft/70">(opcional)</span>
        </span>
        <input
          type="text"
          name="comprobante_ref"
          placeholder="Nro. de operación, referencia de transferencia, link de Drive…"
          className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink"
        />
      </label>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={fechaManual}
            onChange={(e) => setFechaManual(e.target.checked)}
            className="size-4 accent-ink"
          />
          Elegir fecha de vencimiento manualmente (por defecto: 30 días corridos / 1 mes)
        </label>
        {fechaManual ? (
          <input
            type="date"
            name="fecha_vencimiento_manual"
            className="h-10 w-full max-w-[200px] rounded-[5px] border border-rule bg-paper px-3 text-sm outline-none focus:border-ink"
          />
        ) : null}
      </div>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-ok">{state.ok}</p>
      ) : null}
    </form>
  );
}
