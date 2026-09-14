"use client";

// Markup deliberadamente simple (tabla plana, sin animaciones/haptics): el
// rediseño de esta vista se hace en Antigravity. Esto es solo la capa
// funcional pedida: listar, exportar CSV, marcar pagado.

import { useState, useTransition } from "react";
import { marcarPayoutAction } from "../partner/actions";

export type PayoutPendienteRow = {
  id: string;
  partnerNombre: string;
  partnerEmail: string | null;
  montoArs: number;
  cbuCvu: string | null;
  aliasMp: string | null;
  nota: string | null;
  solicitadoAt: string;
};

function exportarCsv(rows: PayoutPendienteRow[]) {
  const encabezado = ["Partner", "Email", "Monto ARS", "CBU/CVU", "Alias MP", "Solicitado"];
  const lineas = rows.map((r) =>
    [
      r.partnerNombre,
      r.partnerEmail ?? "",
      r.montoArs.toString(),
      r.cbuCvu ?? "",
      r.aliasMp ?? "",
      new Date(r.solicitadoAt).toLocaleDateString("es-AR"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [encabezado.join(","), ...lineas].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payouts-pendientes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PayoutsAdminClient({ payouts }: { payouts: PayoutPendienteRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleMarcarPagado = (row: PayoutPendienteRow) => {
    const comprobante = window.prompt(
      `Confirmar pago de $${row.montoArs.toLocaleString("es-AR")} ARS a ${row.partnerNombre}.\n\nOpcional: número de comprobante/referencia de la transferencia.`,
    );
    if (comprobante === null) return; // canceló el prompt

    setProcesandoId(row.id);
    setMsg(null);
    startTransition(async () => {
      const res = await marcarPayoutAction(row.id, "pagado", comprobante || undefined);
      setMsg({ ok: res.ok, text: res.msg });
      setProcesandoId(null);
    });
  };

  const totalPendiente = payouts.reduce((acc, r) => acc + r.montoArs, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-ink-soft">
          {payouts.length} solicitud{payouts.length === 1 ? "" : "es"} pendiente{payouts.length === 1 ? "" : "s"} · total $
          {totalPendiente.toLocaleString("es-AR")} ARS
        </span>
        <button
          type="button"
          onClick={() => exportarCsv(payouts)}
          disabled={payouts.length === 0}
          className="h-8 px-3 rounded-[6px] border border-rule bg-paper text-xs font-semibold text-ink hover:border-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Exportar a CSV
        </button>
      </div>

      {msg && (
        <div
          className={`text-xs px-3 py-2 rounded-[6px] border ${
            msg.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </div>
      )}

      {payouts.length === 0 ? (
        <div className="text-xs text-ink-soft border border-rule rounded-[8px] p-6 text-center">
          No hay retiros pendientes de liquidar.
        </div>
      ) : (
        <div className="overflow-x-auto border border-rule rounded-[8px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-rule bg-paper-2 text-ink-soft">
                <th className="p-2.5 font-semibold">Partner</th>
                <th className="p-2.5 font-semibold">Monto</th>
                <th className="p-2.5 font-semibold">Datos de cobro</th>
                <th className="p-2.5 font-semibold">Solicitado</th>
                <th className="p-2.5 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((r) => {
                const datoCobro = r.cbuCvu || r.aliasMp || "—";
                const procesando = isPending && procesandoId === r.id;
                return (
                  <tr key={r.id} className="border-b border-rule last:border-0">
                    <td className="p-2.5">
                      <div className="font-semibold text-ink">{r.partnerNombre}</div>
                      {r.partnerEmail && <div className="text-[10px] text-ink-soft">{r.partnerEmail}</div>}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-ink">
                      ${r.montoArs.toLocaleString("es-AR")}
                    </td>
                    <td className="p-2.5 font-mono">{datoCobro}</td>
                    <td className="p-2.5 text-ink-soft">
                      {new Date(r.solicitadoAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="p-2.5">
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() => handleMarcarPagado(r)}
                        className="h-7 px-2.5 rounded-[6px] bg-ok text-paper text-[11px] font-bold disabled:opacity-50"
                      >
                        {procesando ? "Procesando…" : "Marcar Pagado"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
