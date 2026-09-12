"use client";

import { useState, useTransition } from "react";
import { registrarMovimientoCaja } from "./actions";
import { Spinner } from "@/components/ui";
import { hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";
import { ArrowDownRight, ArrowUpRight, Plus, X, Receipt, Banknote } from "lucide-react";

const CATEGORIAS_EGRESO = [
  "Artículos de Limpieza",
  "Mantenimiento / Reparación",
  "Adelanto de Sueldo / Profe",
  "Insumos / Kiosco",
  "Servicios / Impuestos",
  "Retiro del Dueño",
  "Otro",
];

const CATEGORIAS_INGRESO = [
  "Kiosco / Bebidas",
  "Matrícula / Inscripción",
  "Pase Diario",
  "Alquiler de Espacio",
  "Otro",
];

interface ModalMovimientoCajaProps {
  tipoInicial?: "egreso" | "ingreso";
}

export function ModalMovimientoCaja({ tipoInicial = "egreso" }: ModalMovimientoCajaProps) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">(tipoInicial);
  const [categoria, setCategoria] = useState(tipoInicial === "egreso" ? "Artículos de Limpieza" : "Kiosco / Bebidas");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [comprobanteRef, setComprobanteRef] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAbrir = (tipoSeleccionado: "ingreso" | "egreso") => {
    hapticoSeleccion();
    setTipo(tipoSeleccionado);
    setCategoria(tipoSeleccionado === "egreso" ? "Artículos de Limpieza" : "Kiosco / Bebidas");
    setAbierto(true);
  };

  const handleCerrar = () => {
    if (isPending) return;
    setAbierto(false);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("tipo", tipo);
    formData.set("categoria", categoria);
    formData.set("concepto", concepto);
    formData.set("monto", monto);
    formData.set("medio_pago", medioPago);
    formData.set("comprobante_ref", comprobanteRef);

    startTransition(async () => {
      const res = await registrarMovimientoCaja(formData);
      if (res?.error) {
        hapticoError();
        setErrorMsg(res.error);
      } else {
        hapticoExito();
        setAbierto(false);
        setConcepto("");
        setMonto("");
        setComprobanteRef("");
      }
    });
  };

  return (
    <>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleAbrir("egreso")}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[12px] font-medium text-xs border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-[0.98] transition-all"
        >
          <ArrowDownRight className="size-3.5" />
          <span>Registrar Gasto / Egreso</span>
        </button>

        <button
          type="button"
          onClick={() => handleAbrir("ingreso")}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-[12px] font-medium text-xs border border-[#10e7a0]/30 bg-[#10e7a0]/10 text-[#10e7a0] hover:bg-[#10e7a0]/20 active:scale-[0.98] transition-all"
        >
          <ArrowUpRight className="size-3.5" />
          <span>Ingreso Extra / Varios</span>
        </button>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[20px] border border-rule bg-paper-2 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header con tabs */}
            <div className="flex items-center justify-between">
              <div className="flex rounded-[10px] p-1 bg-paper border border-rule">
                <button
                  type="button"
                  onClick={() => {
                    hapticoSeleccion();
                    setTipo("egreso");
                    setCategoria("Artículos de Limpieza");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
                    tipo === "egreso"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <ArrowDownRight className="size-3.5" />
                  <span>Gasto / Egreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticoSeleccion();
                    setTipo("ingreso");
                    setCategoria("Kiosco / Bebidas");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
                    tipo === "ingreso"
                      ? "bg-[#10e7a0] text-black shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <ArrowUpRight className="size-3.5" />
                  <span>Ingreso Extra</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCerrar}
                disabled={isPending}
                className="rounded-full p-1.5 text-ink-soft hover:bg-paper hover:text-ink transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-[10px] border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Monto */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Monto {tipo === "egreso" ? "del Gasto" : "del Ingreso"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-ink-soft">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="0"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full h-12 pl-8 pr-4 rounded-[12px] border border-rule bg-paper text-xl font-bold text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0] focus:ring-1 focus:ring-[#10e7a0]"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Categoría
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full h-11 px-3 rounded-[12px] border border-rule bg-paper text-sm text-ink focus:outline-none focus:border-[#10e7a0]"
                >
                  {(tipo === "egreso" ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concepto / Motivo */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Motivo / Detalle
                </label>
                <input
                  type="text"
                  placeholder={tipo === "egreso" ? "Ej: Lavandina, trapos y bolsas" : "Ej: Venta de 2 aguas y 1 energizante"}
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-[12px] border border-rule bg-paper text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0]"
                  required
                />
              </div>

              {/* Medio de Pago */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  Medio de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "efectivo", label: "Efectivo", icon: Banknote },
                    { id: "transferencia", label: "Transferencia", icon: Receipt },
                    { id: "mercadopago", label: "Mercado Pago", icon: Receipt },
                    { id: "tarjeta", label: "Débito / Crédito", icon: Receipt },
                  ].map((mp) => {
                    const activo = medioPago === mp.id;
                    return (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => {
                          hapticoSeleccion();
                          setMedioPago(mp.id);
                        }}
                        className={`h-10 px-3 rounded-[10px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                          activo
                            ? "border-[#10e7a0] bg-[#10e7a0]/15 text-ink ring-1 ring-[#10e7a0]"
                            : "border-rule bg-paper text-ink-soft hover:border-ink-soft/30"
                        }`}
                      >
                        <span>{mp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Referencia / Comprobante */}
              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                  N° Comprobante / Ticket (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Factura 001-4921 o N° Operación"
                  value={comprobanteRef}
                  onChange={(e) => setComprobanteRef(e.target.value)}
                  className="w-full h-10 px-3 rounded-[10px] border border-rule bg-paper text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0]"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={isPending}
                  className="flex-1 h-11 rounded-[12px] border border-rule text-sm font-medium text-ink hover:bg-paper transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={`flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold text-sm shadow-md active:scale-[0.98] transition-all disabled:opacity-50 ${
                    tipo === "egreso"
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-[#10e7a0] hover:brightness-105 text-black"
                  }`}
                >
                  {isPending ? (
                    <>
                      <Spinner />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      <span>{tipo === "egreso" ? "Guardar Egreso" : "Guardar Ingreso"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
