"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Spinner, pillClasses } from "@/components/ui";
import { KeyRound } from "lucide-react";
import { DescargarIngresosPdf } from "@/components/pdf/descargar-ingresos-pdf";
import { DescargarIngresosExcel } from "@/components/pdf/descargar-ingresos-excel";

type Pago = {
  id: string;
  fecha_pago: string;
  monto: number;
  comprobante_ref: string | null;
  cliente_nombre: string;
  plan_nombre: string;
};

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
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [mesFiltro, setMesFiltro] = useState<string>(""); // 'YYYY-MM' o ''

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

  const filtro = norm(q.trim());

  // 1) Filtrar por mes seleccionado
  const pagosFiltradosPorRango = mesFiltro
    ? pagos.filter((p) => p.fecha_pago.startsWith(mesFiltro))
    : pagos;

  // 2) Filtrar por nombre sobre el resultado anterior
  const pagosFiltrados = filtro
    ? pagosFiltradosPorRango.filter((p) => norm(p.cliente_nombre).includes(filtro))
    : pagosFiltradosPorRango;

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

  // Agrupación por días para el gráfico Sparkline de tendencia
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...pagosFiltrados].sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago));
    sorted.forEach((p) => {
      map.set(p.fecha_pago, (map.get(p.fecha_pago) || 0) + p.monto);
    });
    return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
  }, [pagosFiltrados]);

  const sparklineSvg = useMemo(() => {
    if (dailyData.length === 0) return null;
    const width = 300;
    const height = 44;
    const pad = 6;
    const maxVal = Math.max(...dailyData.map((d) => d.total), 1);
    const minVal = 0;

    if (dailyData.length === 1) {
      const y = height / 2;
      return {
        path: `M ${pad} ${y} L ${width - pad} ${y}`,
        area: `M ${pad} ${height - pad} L ${pad} ${y} L ${width - pad} ${y} L ${width - pad} ${height - pad} Z`,
        points: [{ x: width / 2, y, total: dailyData[0].total }],
      };
    }

    const pts = dailyData.map((d, i) => {
      const x = pad + (i / (dailyData.length - 1)) * (width - 2 * pad);
      const y = height - pad - ((d.total - minVal) / (maxVal - minVal || 1)) * (height - 2 * pad);
      return { x, y, total: d.total };
    });

    const pathStr = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`), "");
    const areaStr = `${pathStr} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

    return { path: pathStr, area: areaStr, points: pts };
  }, [dailyData]);

  return (
    <div className="space-y-6">
      {/* Tarjeta de Resumen con Sparkline de Tendencia */}
      <div className="card-cut border border-rule bg-paper-2 p-5 rounded-[16px] space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {filtro ? "Total filtrado" : mesFiltro ? `Ingresos ${formatearMes(mesFiltro)}` : "Total general"}
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

        {/* Sparkline SVG Inline */}
        {sparklineSvg && (
          <div className="pt-2 border-t border-rule/50">
            <div className="flex items-center justify-between text-xs text-ink-soft mb-1.5">
              <span className="font-medium text-[11px] uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Tendencia de Ingresos
              </span>
              <span className="font-mono text-[11px]">
                {dailyData.length} {dailyData.length === 1 ? "día registrado" : "días registrados"}
              </span>
            </div>

            <div className="w-full h-12 relative overflow-hidden rounded-[8px] bg-black/20 p-1 border border-rule/30">
              <svg
                viewBox="0 0 300 44"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="ingresosSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10e7a0" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10e7a0" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparklineSvg.area} fill="url(#ingresosSparklineGrad)" />
                <path
                  d={sparklineSvg.path}
                  fill="none"
                  stroke="#10e7a0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {sparklineSvg.points.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="2.5"
                    fill="#10e7a0"
                  />
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
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
