"use client";

import { useState, useTransition } from "react";
import { marcarPayoutAction } from "../partner/actions";
import { useHapticos } from "@/lib/ui/hapticos";
import { PulpoCard } from "@/components/mascota/pulpo";
import { Download, X } from "lucide-react";

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
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
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
  const haptic = useHapticos();
  const [isPending, startTransition] = useTransition();
  const [modalData, setModalData] = useState<{ row: PayoutPendienteRow; comprobante: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const totalPendiente = payouts.reduce((acc, r) => acc + r.montoArs, 0);

  const handleExportar = () => {
    haptic.suave();
    exportarCsv(payouts);
  };

  const handleAbrirModal = (row: PayoutPendienteRow) => {
    haptic.suave();
    setModalData({ row, comprobante: "" });
  };

  const handleCerrarModal = () => {
    haptic.suave();
    setModalData(null);
  };

  const handleConfirmarPago = () => {
    if (!modalData) return;
    haptic.medio();
    const { row, comprobante } = modalData;
    setMsg(null);
    startTransition(async () => {
      const res = await marcarPayoutAction(row.id, "pagado", comprobante || undefined);
      if (res.ok) {
        haptic.exito();
      } else {
        haptic.error();
      }
      setMsg({ ok: res.ok, text: res.msg });
      setModalData(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Retiros Pendientes</h2>
          <p className="text-xs text-ink-soft">
            {payouts.length} solicitud{payouts.length === 1 ? "" : "es"} · total ${totalPendiente.toLocaleString("es-AR")} ARS
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportar}
          disabled={payouts.length === 0}
          className="flex items-center gap-1.5 h-10 px-4 rounded-[12px] bg-paper-2 text-ink text-sm font-semibold border border-rule active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {msg && (
        <div
          className={`text-sm px-4 py-3 rounded-[12px] border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            msg.ok ? "border-ok/30 bg-ok/10 text-ok" : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          <span className="font-medium">{msg.text}</span>
        </div>
      )}

      {/* Lista / Empty State */}
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[16px] bg-paper-2 border border-rule">
          <PulpoCard size={100} pose="festejo" cardClassName="mb-4" />
          <h3 className="text-sm font-bold text-ink mb-1">Todo al día</h3>
          <p className="text-xs text-ink-soft max-w-[200px]">No hay retiros pendientes de liquidar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {payouts.map((r) => {
            const datoCobro = r.cbuCvu || r.aliasMp || "Sin datos";
            return (
              <div key={r.id} className="p-4 rounded-[16px] bg-paper border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-sm">{r.partnerNombre}</span>
                    <span className="text-[10px] bg-paper-2 text-ink-soft px-1.5 py-0.5 rounded-full border border-rule">
                      {new Date(r.solicitadoAt).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <div className="text-xs text-ink-soft">{r.partnerEmail || "Sin email"}</div>
                  <div className="text-xs font-mono text-ink mt-1 flex items-center gap-1.5">
                    <span className="bg-paper-2 px-1.5 py-0.5 rounded-[4px] border border-rule">CVU/Alias: {datoCobro}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 sm:text-right">
                  <div className="text-lg font-bold text-ink">
                    ${r.montoArs.toLocaleString("es-AR")}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAbrirModal(r)}
                    className="h-10 px-4 rounded-[12px] bg-ok text-paper text-sm font-bold active:scale-95 transition-transform"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Confirmación Pago (iOS Style) */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCerrarModal}
          />
          <div className="relative w-full max-w-sm bg-paper rounded-[24px] overflow-hidden shadow-2xl border border-rule flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-rule bg-paper-2">
              <h3 className="font-bold text-ink text-sm">Confirmar Pago</h3>
              <button 
                onClick={handleCerrarModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-paper border border-rule text-ink-soft active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-center">
                <div className="text-xs text-ink-soft mb-1">Total a transferir a {modalData.row.partnerNombre}</div>
                <div className="text-3xl font-black text-ink tracking-tight">${modalData.row.montoArs.toLocaleString("es-AR")}</div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink ml-1">Comprobante / Referencia (Opcional)</label>
                <input
                  type="text"
                  value={modalData.comprobante}
                  onChange={(e) => setModalData({ ...modalData, comprobante: e.target.value })}
                  placeholder="Ej: TR-123456"
                  className="w-full h-11 px-3 rounded-[12px] bg-paper-2 border border-rule text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-ink transition-colors"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="p-4 pt-2">
              <button
                type="button"
                onClick={handleConfirmarPago}
                disabled={isPending}
                className="w-full h-12 rounded-[14px] bg-ok text-paper font-bold text-base active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <span className="w-5 h-5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                ) : (
                  "Confirmar Pago"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

