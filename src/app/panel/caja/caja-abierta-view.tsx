"use client";

import { useMemo, useState } from "react";
import { ModalMovimientoCaja } from "./modal-movimiento-caja";
import { ModalCerrarCaja } from "./modal-cerrar-caja";
import { Coins, ArrowDownRight, ArrowUpRight, Clock, User, Banknote, Receipt, Filter } from "lucide-react";

export type MovimientoCaja = {
  id: string;
  tipo: "ingreso" | "egreso";
  categoria: string;
  concepto: string;
  monto: number;
  medio_pago: string;
  comprobante_ref: string | null;
  creado_en: string;
  usuario_nombre?: string;
};

export type SesionCajaAbierta = {
  id: string;
  turno_nombre: string;
  abierta_en: string;
  abierta_por_nombre: string;
  monto_inicial_efectivo: number;
  notas_apertura: string | null;
  movimientos: MovimientoCaja[];
};

interface CajaAbiertaViewProps {
  sesion: SesionCajaAbierta;
  esDueno: boolean;
}

export function CajaAbiertaView({ sesion, esDueno }: CajaAbiertaViewProps) {
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "ingreso" | "egreso">("todos");

  // Cálculos dinámicos de caja
  const { totalIngresos, totalEgresos, ingresosEfectivo, egresosEfectivo, efectivoEnCaja } = useMemo(() => {
    let tIng = 0;
    let tEgr = 0;
    let ingEf = 0;
    let egrEf = 0;

    sesion.movimientos.forEach((m) => {
      const val = Number(m.monto) || 0;
      if (m.tipo === "ingreso") {
        tIng += val;
        if (m.medio_pago === "efectivo") ingEf += val;
      } else {
        tEgr += val;
        if (m.medio_pago === "efectivo") egrEf += val;
      }
    });

    const inicial = Number(sesion.monto_inicial_efectivo) || 0;
    const efCaja = inicial + ingEf - egrEf;

    return {
      totalIngresos: tIng,
      totalEgresos: tEgr,
      ingresosEfectivo: ingEf,
      egresosEfectivo: egrEf,
      efectivoEnCaja: efCaja,
    };
  }, [sesion]);

  const movimientosFiltrados = useMemo(() => {
    if (filtroTipo === "todos") return sesion.movimientos;
    return sesion.movimientos.filter((m) => m.tipo === filtroTipo);
  }, [sesion.movimientos, filtroTipo]);

  const horaApertura = new Date(sesion.abierta_en).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      {/* Banner de Turno Activo */}
      <div className="relative overflow-hidden rounded-[20px] border-2 border-[#10e7a0]/40 bg-paper-2 p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10e7a0]/15 text-[#10e7a0] border border-[#10e7a0]/30 text-xs font-bold uppercase tracking-wider">
              <span className="size-2 rounded-full bg-[#10e7a0] animate-ping" />
              <span>TURNO EN CURSO</span>
            </div>
            <h2 className="text-2xl font-black text-ink">{sesion.turno_nombre}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5 text-[#10e7a0]" />
                Iniciado a las {horaApertura} hs
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5 text-[#10e7a0]" />
                Responsable: <strong className="text-ink">{sesion.abierta_por_nombre}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ModalMovimientoCaja />
            <ModalCerrarCaja turnoNombre={sesion.turno_nombre} />
          </div>
        </div>

        {sesion.notas_apertura && (
          <div className="mt-4 pt-3 border-t border-rule text-xs text-ink-soft italic">
            &ldquo;{sesion.notas_apertura}&rdquo;
          </div>
        )}
      </div>

      {/* 4 Tarjetas de Métricas de Caja */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Fondo Inicial */}
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
          <p className="text-xs font-medium text-ink-soft flex items-center gap-1.5">
            <Coins className="size-3.5 text-ink-soft" />
            <span>Fondo Inicial</span>
          </p>
          <p className="text-xl sm:text-2xl font-black text-ink mt-1">
            ${sesion.monto_inicial_efectivo.toLocaleString("es-AR")}
          </p>
          <p className="text-[10px] text-ink-soft mt-0.5">Efectivo de cambio</p>
        </div>

        {/* Total Ingresos */}
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
          <p className="text-xs font-medium text-[#10e7a0] flex items-center gap-1.5">
            <ArrowUpRight className="size-3.5" />
            <span>Ingresos Turno</span>
          </p>
          <p className="text-xl sm:text-2xl font-black text-ink mt-1">
            ${totalIngresos.toLocaleString("es-AR")}
          </p>
          <p className="text-[10px] text-ink-soft mt-0.5">
            ${ingresosEfectivo.toLocaleString("es-AR")} en ef.
          </p>
        </div>

        {/* Total Egresos */}
        <div className="rounded-[16px] border border-rule bg-paper-2 p-4">
          <p className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
            <ArrowDownRight className="size-3.5" />
            <span>Gastos / Egresos</span>
          </p>
          <p className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
            -${totalEgresos.toLocaleString("es-AR")}
          </p>
          <p className="text-[10px] text-ink-soft mt-0.5">
            ${egresosEfectivo.toLocaleString("es-AR")} en ef.
          </p>
        </div>

        {/* Efectivo Estimado en Caja */}
        <div className="rounded-[16px] border-2 border-[#10e7a0]/40 bg-[#10e7a0]/5 p-4 shadow-[0_4px_20px_rgba(16,231,160,0.1)]">
          <p className="text-xs font-bold text-[#10e7a0] flex items-center gap-1.5">
            <Banknote className="size-3.5" />
            <span>Efectivo en Cajón</span>
          </p>
          <p className="text-xl sm:text-2xl font-black text-ink mt-1">
            ${efectivoEnCaja.toLocaleString("es-AR")}
          </p>
          <p className="text-[10px] text-ink-soft mt-0.5">
            {esDueno ? "Saldo teórico para arqueo" : "Debe cuadrar con el cajón"}
          </p>
        </div>
      </div>

      {/* Lista de Movimientos del Turno */}
      <div className="rounded-[20px] border border-rule bg-paper-2 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-ink">Movimientos del Turno</h3>
            <p className="text-xs text-ink-soft">
              {sesion.movimientos.length} operaciones registradas en esta sesión
            </p>
          </div>

          {/* Filtro rápido */}
          <div className="inline-flex rounded-[10px] p-1 bg-paper border border-rule text-xs">
            <button
              onClick={() => setFiltroTipo("todos")}
              className={`px-3 py-1 rounded-[6px] font-medium transition-colors ${
                filtroTipo === "todos" ? "bg-ink text-paper font-semibold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Todos ({sesion.movimientos.length})
            </button>
            <button
              onClick={() => setFiltroTipo("ingreso")}
              className={`px-3 py-1 rounded-[6px] font-medium transition-colors ${
                filtroTipo === "ingreso" ? "bg-[#10e7a0] text-black font-semibold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setFiltroTipo("egreso")}
              className={`px-3 py-1 rounded-[6px] font-medium transition-colors ${
                filtroTipo === "egreso" ? "bg-rose-500 text-white font-semibold" : "text-ink-soft hover:text-ink"
              }`}
            >
              Gastos
            </button>
          </div>
        </div>

        {movimientosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-ink-soft text-xs">
            No hay movimientos en este turno con el filtro seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-rule overflow-x-auto">
            {movimientosFiltrados.map((m) => {
              const esIngreso = m.tipo === "ingreso";
              const hora = new Date(m.creado_en).toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-3 hover:bg-paper/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-9 shrink-0 rounded-[10px] flex items-center justify-center ${
                        esIngreso ? "bg-[#10e7a0]/15 text-[#10e7a0]" : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {esIngreso ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink truncate">{m.concepto}</span>
                        <span className="inline-block px-2 py-0.5 rounded-[6px] text-[10px] font-medium border border-rule bg-paper text-ink-soft">
                          {m.categoria}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-soft mt-0.5">
                        <span>{hora} hs</span>
                        <span>•</span>
                        <span className="capitalize">{m.medio_pago}</span>
                        {m.comprobante_ref && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">Ref: {m.comprobante_ref}</span>
                          </>
                        )}
                        {m.usuario_nombre && (
                          <>
                            <span>•</span>
                            <span>Por: {m.usuario_nombre}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-black text-sm ${esIngreso ? "text-[#10e7a0]" : "text-rose-400"}`}>
                      {esIngreso ? "+" : "-"}${m.monto.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
