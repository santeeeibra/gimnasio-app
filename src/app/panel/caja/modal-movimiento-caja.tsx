"use client";

import { useState, useTransition } from "react";
import { registrarMovimientoCaja } from "./actions";
import { Spinner } from "@/components/ui";
import { hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";
import { ArrowDownRight, ArrowUpRight, Plus, X, Receipt, Banknote, Check, Tag } from "lucide-react";

const CATEGORIAS_EGRESO = [
  "Artículos de Limpieza",
  "Mantenimiento / Reparación",
  "Insumos / Kiosco",
  "Servicios / Impuestos",
  "Adelanto / Sueldo Profe",
  "Retiro del Dueño",
  "Otro",
];

const CATEGORIAS_INGRESO = [
  "Kiosco / Bebidas",
  "Suplementos / Snacks",
  "Pases y Clases",
  "Matrícula / Inscripción",
  "Indumentaria / Merch",
  "Otro",
];

interface ItemRapido {
  id: string;
  label: string;
  emoji: string;
  precioDefault?: number;
  categoria: string;
}

const PRODUCTOS_RAPIDOS_INGRESO: ItemRapido[] = [
  { id: "agua", label: "Agua Mineral 500ml", emoji: "💧", precioDefault: 1200, categoria: "Kiosco / Bebidas" },
  { id: "gatorade", label: "Gatorade / Isotónica", emoji: "⚡", precioDefault: 2500, categoria: "Kiosco / Bebidas" },
  { id: "energizante", label: "Energizante (Monster/Speed)", emoji: "🔋", precioDefault: 3000, categoria: "Kiosco / Bebidas" },
  { id: "barra", label: "Barra de Proteína", emoji: "🍫", precioDefault: 2200, categoria: "Suplementos / Snacks" },
  { id: "batido", label: "Batido Whey / Scoop", emoji: "🥤", precioDefault: 3500, categoria: "Suplementos / Snacks" },
  { id: "creatina", label: "Scoop Creatina", emoji: "💪", precioDefault: 1500, categoria: "Suplementos / Snacks" },
  { id: "cafe", label: "Café Express", emoji: "☕", precioDefault: 1500, categoria: "Kiosco / Bebidas" },
  { id: "pase_dia", label: "Pase Diario / Clase", emoji: "🎟️", precioDefault: 5000, categoria: "Pases y Clases" },
  { id: "alquiler_toalla", label: "Alquiler Toalla / Candado", emoji: "🔑", precioDefault: 1500, categoria: "Otro" },
  { id: "remera", label: "Remera / Merch Gym", emoji: "👕", precioDefault: 18000, categoria: "Indumentaria / Merch" },
];

const ITEMS_RAPIDOS_EGRESO: ItemRapido[] = [
  { id: "limpieza_gral", label: "Lavandina / Desinfectante", emoji: "🧹", categoria: "Artículos de Limpieza" },
  { id: "papel", label: "Papel Higiénico / Rollos", emoji: "🧻", categoria: "Artículos de Limpieza" },
  { id: "bolsas", label: "Bolsas de Residuo / Trapos", emoji: "🗑️", categoria: "Artículos de Limpieza" },
  { id: "reparacion", label: "Arreglo Máquina / Repuestos", emoji: "🔧", categoria: "Mantenimiento / Reparación" },
  { id: "electricidad", label: "Focos / Enchufe / Cables", emoji: "💡", categoria: "Mantenimiento / Reparación" },
  { id: "refrigerio", label: "Café / Refrigerio Staff", emoji: "🍕", categoria: "Insumos / Kiosco" },
  { id: "flete", label: "Flete / Encomienda", emoji: "🚚", categoria: "Servicios / Impuestos" },
  { id: "adelanto_profe", label: "Adelanto Sueldo a Profe", emoji: "💵", categoria: "Adelanto / Sueldo Profe" },
  { id: "retiro_dueno", label: "Retiro Efectivo Dueño", emoji: "🏦", categoria: "Retiro del Dueño" },
];

interface ModalMovimientoCajaProps {
  tipoInicial?: "egreso" | "ingreso";
}

export function ModalMovimientoCaja({ tipoInicial = "egreso" }: ModalMovimientoCajaProps) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">(tipoInicial);
  
  // Categorías seleccionadas (soporta múltiples o única)
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([
    tipoInicial === "egreso" ? "Artículos de Limpieza" : "Kiosco / Bebidas",
  ]);

  // Ítems rápidos seleccionados para motivo/detalle
  const [itemsSeleccionados, setItemsSeleccionados] = useState<string[]>([]);

  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [comprobanteRef, setComprobanteRef] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAbrir = (tipoSeleccionado: "ingreso" | "egreso") => {
    hapticoSeleccion();
    setTipo(tipoSeleccionado);
    setCategoriasSeleccionadas([
      tipoSeleccionado === "egreso" ? "Artículos de Limpieza" : "Kiosco / Bebidas",
    ]);
    setItemsSeleccionados([]);
    setConcepto("");
    setMonto("");
    setAbierto(true);
  };

  const handleCerrar = () => {
    if (isPending) return;
    setAbierto(false);
    setErrorMsg(null);
  };

  const handleCambiarTipo = (nuevoTipo: "ingreso" | "egreso") => {
    hapticoSeleccion();
    setTipo(nuevoTipo);
    setCategoriasSeleccionadas([
      nuevoTipo === "egreso" ? "Artículos de Limpieza" : "Kiosco / Bebidas",
    ]);
    setItemsSeleccionados([]);
    setConcepto("");
    setMonto("");
  };

  // Toggle de categoría (checklist táctil)
  const toggleCategoria = (cat: string) => {
    hapticoSeleccion();
    setCategoriasSeleccionadas((prev) => {
      if (prev.includes(cat)) {
        const filtrado = prev.filter((c) => c !== cat);
        return filtrado.length > 0 ? filtrado : [cat];
      } else {
        return [...prev, cat];
      }
    });
  };

  // Toggle de producto rápido / motivo
  const toggleItemRapido = (item: ItemRapido) => {
    hapticoSeleccion();
    const listaCatalogo = tipo === "ingreso" ? PRODUCTOS_RAPIDOS_INGRESO : ITEMS_RAPIDOS_EGRESO;
    const yaEsta = itemsSeleccionados.includes(item.id);
    const nuevosItems = yaEsta
      ? itemsSeleccionados.filter((id) => id !== item.id)
      : [...itemsSeleccionados, item.id];

    setItemsSeleccionados(nuevosItems);

    // Auto-completar motivo/concepto con los nombres de los productos seleccionados
    const nombres = nuevosItems
      .map((id) => listaCatalogo.find((it) => it.id === id)?.label)
      .filter(Boolean);
    setConcepto(nombres.join(", "));

    // Auto-vincular categoría si no estaba
    if (!yaEsta && item.categoria && !categoriasSeleccionadas.includes(item.categoria)) {
      setCategoriasSeleccionadas((prev) => [...prev, item.categoria]);
    }

    // Si es ingreso y tiene precio sugerido, calcular suma sugerida
    if (tipo === "ingreso") {
      const sumaPrecios = nuevosItems.reduce((acc, id) => {
        const it = listaCatalogo.find((p) => p.id === id);
        return acc + (it?.precioDefault ?? 0);
      }, 0);
      if (sumaPrecios > 0) {
        setMonto(String(sumaPrecios));
      } else if (nuevosItems.length === 0) {
        setMonto("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("tipo", tipo);
    formData.set("categoria", categoriasSeleccionadas.join(", ") || "Otro");
    formData.set("concepto", concepto.trim());
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
        setItemsSeleccionados([]);
      }
    });
  };

  const listaCategorias = tipo === "egreso" ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO;
  const listaProductos = tipo === "ingreso" ? PRODUCTOS_RAPIDOS_INGRESO : ITEMS_RAPIDOS_EGRESO;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-[22px] border border-rule bg-paper-2 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header con tabs táctiles */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-rule bg-paper/60 backdrop-blur-sm shrink-0">
              <div className="flex rounded-[12px] p-1 bg-paper border border-rule">
                <button
                  type="button"
                  onClick={() => handleCambiarTipo("egreso")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${
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
                  onClick={() => handleCambiarTipo("ingreso")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all ${
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
                className="rounded-full p-2 text-ink-soft hover:bg-paper hover:text-ink active:scale-95 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Contenido scrolleable táctil */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {errorMsg && (
                <div className="rounded-[10px] border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  {errorMsg}
                </div>
              )}

              <form id="form-movimiento-caja" onSubmit={handleSubmit} className="space-y-5">
                {/* Monto principal */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Monto {tipo === "egreso" ? "del Gasto" : "del Ingreso"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-ink-soft">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="0"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className="w-full h-13 pl-10 pr-4 rounded-[14px] border border-rule bg-paper text-2xl font-bold text-ink placeholder:text-ink-soft/30 focus:outline-none focus:border-[#10e7a0] focus:ring-1 focus:ring-[#10e7a0]"
                      required
                    />
                  </div>
                </div>

                {/* 1. SELECCIÓN DE CATEGORÍA (CHECKLIST TÁCTIL / CHIPS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ink-soft flex items-center gap-1.5">
                      <Tag className="size-3.5" />
                      <span>Categorías (seleccioná una o varias)</span>
                    </label>
                    <span className="text-[11px] font-mono text-ink-soft">
                      {categoriasSeleccionadas.length} seleccionada{categoriasSeleccionadas.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {listaCategorias.map((cat) => {
                      const seleccionada = categoriasSeleccionadas.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategoria(cat)}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-medium border transition-all active:scale-95 ${
                            seleccionada
                              ? tipo === "egreso"
                                ? "bg-rose-500/15 border-rose-500 text-rose-400 font-semibold"
                                : "bg-[#10e7a0]/15 border-[#10e7a0] text-[#10e7a0] font-semibold"
                              : "bg-paper border-rule text-ink-soft hover:border-ink-soft/40"
                          }`}
                        >
                          <div
                            className={`size-3.5 rounded-[4px] flex items-center justify-center border text-[9px] transition-colors ${
                              seleccionada
                                ? tipo === "egreso"
                                  ? "bg-rose-500 border-rose-500 text-white"
                                  : "bg-[#10e7a0] border-[#10e7a0] text-black"
                                : "border-ink-soft/40 bg-transparent"
                            }`}
                          >
                            {seleccionada && <Check className="size-2.5 stroke-[3]" />}
                          </div>
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CATÁLOGO VISUAL DE PRODUCTOS / MOTIVOS TÁCTILES A MANO */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-soft">
                    {tipo === "ingreso" ? "Selección rápida de Productos / Kiosco" : "Conceptos frecuentes de Gasto"}
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {listaProductos.map((p) => {
                      const activo = itemsSeleccionados.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleItemRapido(p)}
                          className={`p-2.5 rounded-[12px] border text-left flex items-start gap-2.5 transition-all active:scale-[0.97] ${
                            activo
                              ? tipo === "egreso"
                                ? "border-rose-500/80 bg-rose-500/10 ring-1 ring-rose-500"
                                : "border-[#10e7a0] bg-[#10e7a0]/10 ring-1 ring-[#10e7a0]"
                              : "border-rule bg-paper hover:border-ink-soft/30"
                          }`}
                        >
                          <span className="text-xl shrink-0 select-none">{p.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-snug text-ink truncate">
                              {p.label}
                            </p>
                            {p.precioDefault ? (
                              <p className="text-[11px] font-mono font-semibold text-[#10e7a0] mt-0.5">
                                +${p.precioDefault.toLocaleString("es-AR")}
                              </p>
                            ) : (
                              <p className="text-[10px] text-ink-soft truncate mt-0.5">
                                {p.categoria}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Campo de texto libre para detalle manual */}
                  <div className="pt-1">
                    <input
                      type="text"
                      placeholder={
                        tipo === "egreso"
                          ? "O escribí el detalle a mano (ej: 2 trapos de piso y lavandina)"
                          : "O escribí el detalle a mano (ej: Venta de 2 aguas y 1 barra)"
                      }
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-[12px] border border-rule bg-paper text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0]"
                      required
                    />
                  </div>
                </div>

                {/* 3. MEDIO DE PAGO */}
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">
                    Medio de Pago
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className={`h-11 px-2.5 rounded-[12px] border text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            activo
                              ? "border-[#10e7a0] bg-[#10e7a0]/15 text-ink ring-1 ring-[#10e7a0] font-semibold"
                              : "border-rule bg-paper text-ink-soft hover:border-ink-soft/30"
                          }`}
                        >
                          <mp.icon className="size-3.5 shrink-0" />
                          <span className="truncate">{mp.label}</span>
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
                    className="w-full h-10 px-3.5 rounded-[12px] border border-rule bg-paper text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-[#10e7a0]"
                  />
                </div>
              </form>
            </div>

            {/* Footer con botones fijos */}
            <div className="flex items-center gap-2.5 p-4 sm:p-5 border-t border-rule bg-paper/80 backdrop-blur-sm shrink-0">
              <button
                type="button"
                onClick={handleCerrar}
                disabled={isPending}
                className="flex-1 h-11 rounded-[12px] border border-rule text-sm font-medium text-ink hover:bg-paper active:scale-98 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-movimiento-caja"
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
          </div>
        </div>
      )}
    </>
  );
}
