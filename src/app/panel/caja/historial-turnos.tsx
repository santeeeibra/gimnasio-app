"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Clock, User, Calendar, Coins } from "lucide-react";
import type { MovimientoCaja } from "./caja-abierta-view";

export type SesionCajaCerrada = {
  id: string;
  turno_nombre: string;
  abierta_en: string;
  cerrada_en: string | null;
  abierta_por_nombre: string;
  cerrada_por_nombre: string;
  monto_inicial_efectivo: number;
  monto_final_declarado: number | null;
  monto_final_esperado_efectivo: number | null;
  diferencia_efectivo: number | null;
  notas_apertura: string | null;
  notas_cierre: string | null;
  movimientos?: MovimientoCaja[];
};

interface HistorialTurnosProps {
  sesiones: SesionCajaCerrada[];
}

export function HistorialTurnos({ sesiones }: HistorialTurnosProps) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (sesiones.length === 0) {
    return (
      <div className="rounded-[16px] border border-rule bg-paper-2 p-8 text-center text-xs text-ink-soft">
        No hay turnos cerrados archivados todavía.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sesiones.map((s) => {
        const expandido = expandidoId === s.id;
        const fechaInicio = new Date(s.abierta_en).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const horaInicio = new Date(s.abierta_en).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const horaFin = s.cerrada_en
          ? new Date(s.cerrada_en).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";

        const dif = s.diferencia_efectivo ?? 0;
        const esExacto = dif === 0;
        const esSobrante = dif > 0;

        return (
          <div
            key={s.id}
            className="rounded-[16px] border border-rule bg-paper-2 overflow-hidden transition-all shadow-sm"
          >
            {/* Cabecera del turno */}
            <div
              onClick={() => setExpandidoId(expandido ? null : s.id)}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-paper/40 select-none"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h4 className="font-bold text-base text-ink">{s.turno_nombre}</h4>
                  {/* Badge de resultado del arqueo */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      esExacto
                        ? "bg-[#10e7a0]/15 text-[#10e7a0] border border-[#10e7a0]/30"
                        : esSobrante
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {esExacto ? (
                      <>
                        <CheckCircle2 className="size-3" />
                        <span>Exacto ($0)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-3" />
                        <span>
                          {esSobrante ? "Sobrante" : "Faltante"} {esSobrante ? "+" : ""}$
                          {dif.toLocaleString("es-AR")}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3 text-ink-soft" />
                    {fechaInicio} ({horaInicio} a {horaFin} hs)
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <User className="size-3 text-ink-soft" />
                    Cerró: <strong className="text-ink">{s.cerrada_por_nombre}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5">
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-ink-soft">Efectivo Declarado</p>
                  <p className="text-base font-black text-ink">
                    ${(s.monto_final_declarado ?? 0).toLocaleString("es-AR")}
                  </p>
                </div>
                <div className="rounded-full p-1.5 text-ink-soft bg-paper">
                  {expandido ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>
            </div>

            {/* Detalle desplegable */}
            {expandido && (
              <div className="border-t border-rule p-4 sm:p-5 bg-paper/30 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-[10px] bg-paper border border-rule">
                    <p className="text-ink-soft text-[10px]">Fondo Inicial</p>
                    <p className="font-bold text-ink text-sm mt-0.5">
                      ${s.monto_inicial_efectivo.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="p-3 rounded-[10px] bg-paper border border-rule">
                    <p className="text-ink-soft text-[10px]">Efectivo Esperado</p>
                    <p className="font-bold text-ink text-sm mt-0.5">
                      ${(s.monto_final_esperado_efectivo ?? 0).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="p-3 rounded-[10px] bg-paper border border-rule">
                    <p className="text-ink-soft text-[10px]">Efectivo Contado</p>
                    <p className="font-bold text-ink text-sm mt-0.5">
                      ${(s.monto_final_declarado ?? 0).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="p-3 rounded-[10px] bg-paper border border-rule">
                    <p className="text-ink-soft text-[10px]">Diferencia</p>
                    <p
                      className={`font-black text-sm mt-0.5 ${
                        esExacto ? "text-[#10e7a0]" : esSobrante ? "text-blue-400" : "text-rose-400"
                      }`}
                    >
                      {esExacto ? "$0" : `${esSobrante ? "+" : ""}$${dif.toLocaleString("es-AR")}`}
                    </p>
                  </div>
                </div>

                {s.notas_cierre && (
                  <div className="p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    <strong className="block text-[11px] mb-0.5">Notas de Cierre:</strong>
                    <p>{s.notas_cierre}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
