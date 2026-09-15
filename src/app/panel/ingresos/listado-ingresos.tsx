"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Spinner, pillClasses } from "@/components/ui";
import { KeyRound, CalendarDays, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { DescargarIngresosPdf } from "@/components/pdf/descargar-ingresos-pdf";
import { DescargarIngresosExcel } from "@/components/pdf/descargar-ingresos-excel";
import { hapticoImpactoSuave, hapticoModalAbrir, hapticoModalCerrar } from "@/lib/ui/hapticos";
import { GraficoIngresos } from "./grafico-ingresos";

type Pago = {
  id: string;
  fecha_pago: string;
  monto: number;
  comprobante_ref: string | null;
  medio_pago: string;
  cliente_nombre: string;
  plan_nombre: string;
};

const MEDIOS_PAGO: { value: string; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mercadopago", label: "Mercado Pago" },
];

type PagosPorMes = {
  [mesAno: string]: {
    pagos: Pago[];
    total: number;
  };
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function ListadoIngresos({
  gimnasioNombre,
  logoUrl,
  pinRequerido = true,
}: {
  gimnasioNombre: string;
  logoUrl: string | null;
  pinRequerido?: boolean;
}) {
  const [verificado, setVerificado] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pendientes, setPendientes] = useState<{ monto: number; cantidad: number }>({ monto: 0, cantidad: 0 });
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [mesFiltro, setMesFiltro] = useState<string>(""); // 'YYYY-MM' o ''
  const [diaFiltro, setDiaFiltro] = useState<string>(""); // 'YYYY-MM-DD' o ''
  const [medioPagoFiltro, setMedioPagoFiltro] = useState<string>(""); // '' = todos
  const [desdeFiltro, setDesdeFiltro] = useState<string>(""); // 'YYYY-MM-DD' o ''
  const [hastaFiltro, setHastaFiltro] = useState<string>(""); // 'YYYY-MM-DD' o ''
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [mesCalendario, setMesCalendario] = useState<Date>(new Date());
  const calendarioRef = useRef<HTMLDivElement>(null);

  // Cerrar el mini calendario al hacer click afuera
  useEffect(() => {
    if (!calendarioAbierto) return;
    const onClick = (e: MouseEvent) => {
      if (calendarioRef.current && !calendarioRef.current.contains(e.target as Node)) {
        setCalendarioAbierto(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [calendarioAbierto]);

  // Verificar si el PIN fue ingresado (o entrar directo si no se requiere PIN)
  useEffect(() => {
    if (!pinRequerido) {
      setVerificado(true);
      cargarPagos();
      return;
    }
    const verificadoSession = sessionStorage.getItem("pin_ingresos_verificado");
    if (verificadoSession === "true") {
      setVerificado(true);
      cargarPagos();
    }
  }, [pinRequerido]);

  const cargarPagos = async () => {
    try {
      const res = await fetch("/api/panel/ingresos");
      if (res.ok) {
        const data = await res.json();
        setPagos(data.pagos || []);
        setPendientes(data.pendientes || { monto: 0, cantidad: 0 });
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  // Meses disponibles desde los pagos cargados (para el selector)
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    pagos.forEach((p) => {
      const [y, m] = p.fecha_pago.split("-");
      set.add(`${y}-${m}`);
    });
    return [...set].sort((a, b) => b.localeCompare(a)); // desc
  }, [pagos]);

  const filtro = norm(q.trim());

  // 1) Filtrar por mes seleccionado
  const pagosFiltradosPorRango = mesFiltro
    ? pagos.filter((p) => p.fecha_pago.startsWith(mesFiltro))
    : pagos;

  // 2) Filtrar por día exacto (si se eligió uno en el mini calendario)
  const pagosFiltradosPorDia = diaFiltro
    ? pagosFiltradosPorRango.filter((p) => p.fecha_pago.startsWith(diaFiltro))
    : pagosFiltradosPorRango;

  // 3) Filtrar por rango de fechas custom (desde/hasta)
  const pagosFiltradosPorRangoCustom = pagosFiltradosPorDia.filter((p) => {
    const fecha = p.fecha_pago.slice(0, 10);
    if (desdeFiltro && fecha < desdeFiltro) return false;
    if (hastaFiltro && fecha > hastaFiltro) return false;
    return true;
  });

  // 4) Filtrar por método de pago
  const pagosFiltradosPorMedio = medioPagoFiltro
    ? pagosFiltradosPorRangoCustom.filter((p) => p.medio_pago === medioPagoFiltro)
    : pagosFiltradosPorRangoCustom;

  // 5) Filtrar por nombre sobre el resultado anterior
  const pagosFiltrados = filtro
    ? pagosFiltradosPorMedio.filter((p) => norm(p.cliente_nombre).includes(filtro))
    : pagosFiltradosPorMedio;

  // Días con al menos un pago (para marcarlos con un punto en el calendario)
  const diasConPago = useMemo(() => {
    const set = new Set<string>();
    pagos.forEach((p) => set.add(p.fecha_pago.slice(0, 10)));
    return set;
  }, [pagos]);

  // Agrupación por días para el gráfico Sparkline de tendencia.
  // Estos dos useMemo deben ejecutarse siempre en el mismo orden en cada
  // render (Reglas de Hooks) — por eso van antes de los early return de
  // abajo (!verificado / cargando / sin pagos), nunca después.
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...pagosFiltrados].sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago));
    sorted.forEach((p) => {
      const fechaCorta = p.fecha_pago.slice(0, 10);
      map.set(fechaCorta, (map.get(fechaCorta) || 0) + p.monto);
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [pagosFiltrados]);

  // Comparativa mes actual vs mes anterior (sobre el total de pagos, sin filtros)
  const comparativaMeses = useMemo(() => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    const mesAnteriorDate = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const mesAnterior = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}`;

    const totalActual = pagos.filter((p) => p.fecha_pago.startsWith(mesActual)).reduce((s, p) => s + p.monto, 0);
    const totalAnterior = pagos.filter((p) => p.fecha_pago.startsWith(mesAnterior)).reduce((s, p) => s + p.monto, 0);
    const variacionPct = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : null;

    return { mesActual, mesAnterior, totalActual, totalAnterior, variacionPct };
  }, [pagos]);

  if (!verificado) {
    return null; // El modal maneja la verificación
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Spinner />
        Cargando ingresos…
      </p>
    );
  }

  if (pagos.length === 0) {
    return (
      <div className="rounded-[6px] border border-rule bg-paper-2 p-6 text-center">
        <p className="text-sm text-ink-soft">
          No hay pagos registrados todavía.
        </p>
      </div>
    );
  }

  // Agrupar por mes/año
  const pagosPorMes: PagosPorMes = {};
  let totalGeneral = 0;

  pagosFiltrados.forEach((pago) => {
    const fecha = new Date(pago.fecha_pago);
    const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;

    if (!pagosPorMes[mesAno]) {
      pagosPorMes[mesAno] = { pagos: [], total: 0 };
    }

    pagosPorMes[mesAno].pagos.push(pago);
    pagosPorMes[mesAno].total += pago.monto;
    totalGeneral += pago.monto;
  });

  // Ordenar meses descendente
  const mesesOrdenados = Object.keys(pagosPorMes).sort((a, b) => b.localeCompare(a));

  const formatearMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split("-");
    const fecha = new Date(Number(ano), Number(mes) - 1);
    return fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de Resumen con botón PIN */}
      <div className="card-cut border border-rule bg-paper-2 p-5 rounded-[16px] shadow-sm flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            {filtro
              ? "Total filtrado"
              : diaFiltro
              ? `Ingresos ${new Date(diaFiltro + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`
              : mesFiltro
              ? `Ingresos ${formatearMes(mesFiltro)}`
              : "Total general"}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-display text-ink">${totalGeneral.toLocaleString("es-AR")}</p>
            <span className="text-xs text-ink-soft font-mono">
              ({pagosFiltrados.length} {pagosFiltrados.length === 1 ? "pago" : "pagos"})
            </span>
          </div>
        </div>
        <Link
          href="/panel/ingresos/configurar-pin"
          className={pillClasses.neutra}
        >
          <KeyRound aria-hidden strokeWidth={2} className="size-4" />
          PIN
        </Link>
      </div>

      {/* Gráfico de Tendencia de Ingresos Detallado e Interactivo */}
      {dailyData.length > 0 && (
        <GraficoIngresos data={dailyData} totalGeneral={totalGeneral} />
      )}

      <div className="flex items-center gap-2 flex-wrap relative">
        <label className="flex items-center gap-2 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft shrink-0">Período</span>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="h-11 flex-1 min-w-[160px] rounded-[10px] border border-rule bg-paper text-[16px] px-3 outline-none transition-[border-color] duration-150 focus:border-ink"
          >
            <option value="">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{formatearMes(m)}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft shrink-0">Método</span>
          <select
            value={medioPagoFiltro}
            onChange={(e) => setMedioPagoFiltro(e.target.value)}
            className="h-11 min-w-[140px] rounded-[10px] border border-rule bg-paper text-[16px] px-3 outline-none transition-[border-color] duration-150 focus:border-ink"
          >
            <option value="">Todos</option>
            {MEDIOS_PAGO.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        <div className="relative" ref={calendarioRef}>
          <button
            type="button"
            onClick={() => {
              if (!calendarioAbierto) hapticoModalAbrir();
              else hapticoModalCerrar();
              setCalendarioAbierto((v) => !v);
            }}
            aria-label="Ver pagos por día"
            className={`${pillClasses.neutra} h-11 ${diaFiltro ? "border-emerald-400 text-emerald-500" : ""}`}
          >
            <CalendarDays aria-hidden strokeWidth={2} className="size-4" />
          </button>

          {calendarioAbierto ? (
            <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[280px] rounded-[14px] border border-rule bg-paper shadow-lg p-3 card-cut">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => {
                    hapticoImpactoSuave();
                    setMesCalendario((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
                  }}
                  className="size-7 flex items-center justify-center rounded-full hover:bg-paper-2 text-ink-soft"
                  aria-label="Mes anterior"
                >
                  ‹
                </button>
                <p className="text-sm font-medium capitalize">
                  {mesCalendario.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    hapticoImpactoSuave();
                    setMesCalendario((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
                  }}
                  className="size-7 flex items-center justify-center rounded-full hover:bg-paper-2 text-ink-soft"
                  aria-label="Mes siguiente"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-soft mb-1">
                {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const year = mesCalendario.getFullYear();
                  const month = mesCalendario.getMonth();
                  const primerDia = new Date(year, month, 1).getDay();
                  const diasEnMes = new Date(year, month + 1, 0).getDate();
                  const celdas = [];
                  for (let i = 0; i < primerDia; i++) {
                    celdas.push(<span key={`vacio-${i}`} />);
                  }
                  for (let dia = 1; dia <= diasEnMes; dia++) {
                    const fechaStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                    const tienePago = diasConPago.has(fechaStr);
                    const seleccionado = diaFiltro === fechaStr;
                    celdas.push(
                      <button
                        key={fechaStr}
                        type="button"
                        onClick={() => {
                          hapticoImpactoSuave();
                          setDiaFiltro(seleccionado ? "" : fechaStr);
                          setCalendarioAbierto(false);
                        }}
                        disabled={!tienePago}
                        className={`relative h-8 w-8 rounded-full text-xs flex items-center justify-center transition-colors
                          ${seleccionado ? "bg-emerald-400 text-black font-semibold" : tienePago ? "text-ink hover:bg-paper-2" : "text-ink-soft/30 cursor-default"}`}
                      >
                        {dia}
                        {tienePago && !seleccionado ? (
                          <span className="absolute bottom-0.5 size-1 rounded-full bg-emerald-400" />
                        ) : null}
                      </button>
                    );
                  }
                  return celdas;
                })()}
              </div>

              {diaFiltro ? (
                <button
                  type="button"
                  onClick={() => {
                    hapticoImpactoSuave();
                    setDiaFiltro("");
                    setCalendarioAbierto(false);
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-ink-soft hover:text-ink py-1.5"
                >
                  <X aria-hidden className="size-3.5" />
                  Quitar filtro de día
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <DescargarIngresosPdf
          pagos={pagos}
          pagosFiltrados={mesFiltro ? pagosFiltrados : []}
          gimnasioNombre={gimnasioNombre}
          logoUrl={logoUrl}
          rangoLabel={mesFiltro ? formatearMes(mesFiltro) : ''}
        />
        <DescargarIngresosExcel
          gimnasioNombre={gimnasioNombre}
          pagosFiltrados={mesFiltro ? pagosFiltrados : []}
          rangoLabel={mesFiltro ? formatearMes(mesFiltro) : ''}
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft shrink-0">Desde</span>
          <input
            type="date"
            value={desdeFiltro}
            onChange={(e) => setDesdeFiltro(e.target.value)}
            className="h-10 rounded-[10px] border border-rule bg-paper text-sm px-3 outline-none focus:border-ink"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft shrink-0">Hasta</span>
          <input
            type="date"
            value={hastaFiltro}
            onChange={(e) => setHastaFiltro(e.target.value)}
            className="h-10 rounded-[10px] border border-rule bg-paper text-sm px-3 outline-none focus:border-ink"
          />
        </label>
        {(desdeFiltro || hastaFiltro) ? (
          <button
            type="button"
            onClick={() => {
              hapticoImpactoSuave();
              setDesdeFiltro("");
              setHastaFiltro("");
            }}
            className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
            Quitar rango
          </button>
        ) : null}
      </div>

      {/* Opciones avanzadas: comparativas y proyección, colapsadas por defecto */}
      <div className="rounded-[10px] border border-rule bg-paper-2 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            hapticoImpactoSuave();
            setAvanzadoAbierto((v) => !v);
          }}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden strokeWidth={2} className="size-4" />
            Opciones avanzadas
          </span>
          <ChevronDown
            aria-hidden
            strokeWidth={2}
            className={`size-4 transition-transform ${avanzadoAbierto ? "rotate-180" : ""}`}
          />
        </button>

        {avanzadoAbierto ? (
          <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] border border-rule bg-paper p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
                {formatearMes(comparativaMeses.mesActual)} vs {formatearMes(comparativaMeses.mesAnterior)}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-display text-ink">
                  ${comparativaMeses.totalActual.toLocaleString("es-AR")}
                </p>
                {comparativaMeses.variacionPct !== null ? (
                  <span
                    className={`text-xs font-bold font-mono ${
                      comparativaMeses.variacionPct >= 0 ? "text-emerald-500" : "text-danger"
                    }`}
                  >
                    {comparativaMeses.variacionPct >= 0 ? "+" : ""}
                    {comparativaMeses.variacionPct.toFixed(1)}%
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Mes anterior: ${comparativaMeses.totalAnterior.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="rounded-[10px] border border-rule bg-paper p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
                Cobranza pendiente
              </p>
              <p className="text-xl font-display text-ink">
                ${pendientes.monto.toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                {pendientes.cantidad} {pendientes.cantidad === 1 ? "socio" : "socios"} vencido{pendientes.cantidad === 1 ? "" : "s"} o por vencer
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre de socio…"
        className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
      />

      {pagosFiltrados.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Ningún pago de un socio con ese nombre.
        </p>
      ) : null}

      {mesesOrdenados.map((mesAno) => {
        const { pagos: pagosMes, total } = pagosPorMes[mesAno];
        
        return (
          <div key={mesAno} className="rounded-[6px] border border-rule bg-paper overflow-hidden">
            <div className="bg-paper-2 px-4 py-3 border-b border-rule">
              <div className="flex items-center justify-between">
                <h2 className="text-lg capitalize">
                  {formatearMes(mesAno)}
                </h2>
                <p className="text-lg font-display">${total.toLocaleString("es-AR")}</p>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                {pagosMes.length} {pagosMes.length === 1 ? "pago" : "pagos"}
              </p>
            </div>

            <ul className="divide-y divide-rule">
              {pagosMes.map((pago) => {
                const ref = pago.comprobante_ref;
                const esUrl =
                  ref &&
                  (ref.startsWith("http://") || ref.startsWith("https://"));
                return (
                  <li key={pago.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{pago.cliente_nombre}</p>
                      <p className="text-xs text-ink-soft">
                        {pago.plan_nombre} · {new Date(pago.fecha_pago).toLocaleDateString("es-AR")}
                      </p>
                      {ref ? (
                        esUrl ? (
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ink-soft underline underline-offset-2 truncate hover:text-ink"
                          >
                            🔗 Ver comprobante
                          </a>
                        ) : (
                          <p className="text-xs text-ink-soft truncate">Ref: {ref}</p>
                        )
                      ) : null}
                    </div>
                    <p className="text-sm font-medium shrink-0">
                      ${pago.monto.toLocaleString("es-AR")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
