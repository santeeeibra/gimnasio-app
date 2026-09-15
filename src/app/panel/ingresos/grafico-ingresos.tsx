"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Maximize2, Minimize2, TrendingUp, TrendingDown, Calendar, Award, RotateCcw, ZoomIn, ShieldAlert } from "lucide-react";
import { hapticoImpactoSuave, hapticoImpactoMedio, hapticoSeleccion } from "@/lib/ui/hapticos";

export type PuntoIngreso = {
  date: string; // YYYY-MM-DD
  total: number; // Puede ser positivo (ingresos) o negativo (pérdidas/egresos)
};

interface GraficoIngresosProps {
  data: PuntoIngreso[];
  totalGeneral: number;
}

export function GraficoIngresos({ data, totalGeneral }: GraficoIngresosProps) {
  const [expandido, setExpandido] = useState(false);
  const [indiceHover, setIndiceHover] = useState<number | null>(null);

  // Rango de zoom activo: null significa sin zoom (muestra todo)
  const [zoomDomain, setZoomDomain] = useState<{ startIdx: number; endIdx: number } | null>(null);

  // Estado para arrastrar recuadro de zoom (Mouse Drag)
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Estado para pellizcar (Touch Pinch)
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartDomainRef = useRef<{ startIdx: number; endIdx: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Reset zoom when data prop changes
  useEffect(() => {
    setZoomDomain(null);
  }, [data]);

  // Toggle expand button with haptic feedback
  const toggleExpand = () => {
    hapticoImpactoSuave();
    setExpandido((prev) => !prev);
  };

  // Reset Zoom
  const resetZoom = () => {
    hapticoImpactoSuave();
    setZoomDomain(null);
  };

  // Basic validation
  if (!data || data.length === 0) return null;

  // Filtrado de datos por el rango de zoom activo
  const visibleData = useMemo(() => {
    if (!zoomDomain) return data;
    const start = Math.max(0, zoomDomain.startIdx);
    const end = Math.min(data.length - 1, zoomDomain.endIdx);
    if (start >= end) return data;
    return data.slice(start, end + 1);
  }, [data, zoomDomain]);

  // CÁLCULO DE LÍMITES Y RANGOS (Soporta números positivos y negativos)
  const minValRaw = Math.min(...visibleData.map((d) => d.total));
  const maxValRaw = Math.max(...visibleData.map((d) => d.total));

  // Asegura que la línea de base $0 siempre esté contenida en el gráfico
  const minVal = Math.min(0, minValRaw);
  const maxVal = Math.max(1, maxValRaw);
  const range = maxVal - minVal || 1;

  // Promedio y récords
  const promedioDiario = Math.round(totalGeneral / Math.max(data.length, 1));
  const diaPico = data.reduce((max, cur) => (cur.total > max.total ? cur : max), data[0]);
  const perdidasData = data.filter((d) => d.total < 0);
  const diaMayorPerdida = perdidasData.length > 0
    ? perdidasData.reduce((min, cur) => (cur.total < min.total ? cur : min), perdidasData[0])
    : null;

  // Dimensions
  const svgWidth = 700;
  const svgHeight = expandido ? 300 : 180;
  const padLeft = 84;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 38;
  const drawWidth = svgWidth - padLeft - padRight;
  const drawHeight = svgHeight - padTop - padBottom;

  // Posición Y exacta de la Línea de Base $0
  const yZero = padTop + drawHeight - ((0 - minVal) / range) * drawHeight;

  // Grid Y-Axis levels (Incluye siempre la Línea de Base $0)
  const yLevels = useMemo(() => {
    if (minVal >= 0) {
      return [
        { label: `$${Math.round(maxVal).toLocaleString("es-AR")}`, val: maxVal, isZero: false },
        { label: `$${Math.round(maxVal * 0.66).toLocaleString("es-AR")}`, val: maxVal * 0.66, isZero: false },
        { label: `$${Math.round(maxVal * 0.33).toLocaleString("es-AR")}`, val: maxVal * 0.33, isZero: false },
        { label: "$0 BASE", val: 0, isZero: true },
      ];
    }
    return [
      { label: `$${Math.round(maxVal).toLocaleString("es-AR")}`, val: maxVal, isZero: false },
      { label: `$${Math.round(maxVal / 2).toLocaleString("es-AR")}`, val: maxVal / 2, isZero: false },
      { label: "$0 BASE", val: 0, isZero: true },
      { label: `-$${Math.abs(Math.round(minVal / 2)).toLocaleString("es-AR")}`, val: minVal / 2, isZero: false },
      { label: `-$${Math.abs(Math.round(minVal)).toLocaleString("es-AR")}`, val: minVal, isZero: false },
    ];
  }, [maxVal, minVal]);

  // Coordenadas para puntos (isLoss es true ÚNICAMENTE cuando total < 0, por debajo de la base)
  const points = useMemo(() => {
    if (visibleData.length === 1) {
      const x = padLeft + drawWidth / 2;
      const y = padTop + drawHeight - ((visibleData[0].total - minVal) / range) * drawHeight;
      return [{ x, y, date: visibleData[0].date, total: visibleData[0].total, isLoss: visibleData[0].total < 0 }];
    }
    return visibleData.map((d, i) => {
      const x = padLeft + (i / (visibleData.length - 1)) * drawWidth;
      const y = padTop + drawHeight - ((d.total - minVal) / range) * drawHeight;
      const isLoss = d.total < 0; // SOLO CUANDO BAJE DE $0
      return { x, y, date: d.date, total: d.total, isLoss };
    });
  }, [visibleData, maxVal, minVal, range, drawWidth, drawHeight, padLeft, padTop]);

  // Segmentos de línea con división exacta en el punto de cruce con la línea $0
  const segments = useMemo(() => {
    if (points.length <= 1) return [];
    const segs = [];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Verificamos si el segmento cruza la línea $0 (de positivo a negativo o viceversa)
      if ((prev.total >= 0 && curr.total < 0) || (prev.total < 0 && curr.total >= 0)) {
        const t = (0 - prev.total) / (curr.total - prev.total);
        const crossX = prev.x + t * (curr.x - prev.x);
        const crossY = yZero;

        // Subsegmento 1 (prev al cruce de 0)
        const isLoss1 = prev.total < 0;
        segs.push({
          x1: prev.x, y1: prev.y,
          x2: crossX, y2: crossY,
          isLoss: isLoss1,
          color: isLoss1 ? "#ef4444" : "#10e7a0",
          filter: isLoss1 ? "url(#glowRed)" : "url(#glowGreen)",
        });

        // Subsegmento 2 (cruce de 0 a curr)
        const isLoss2 = curr.total < 0;
        segs.push({
          x1: crossX, y1: crossY,
          x2: curr.x, y2: curr.y,
          isLoss: isLoss2,
          color: isLoss2 ? "#ef4444" : "#10e7a0",
          filter: isLoss2 ? "url(#glowRed)" : "url(#glowGreen)",
        });
      } else {
        const isLoss = curr.total < 0 || prev.total < 0;
        segs.push({
          x1: prev.x, y1: prev.y,
          x2: curr.x, y2: curr.y,
          isLoss,
          color: isLoss ? "#ef4444" : "#10e7a0",
          filter: isLoss ? "url(#glowRed)" : "url(#glowGreen)",
        });
      }
    }
    return segs;
  }, [points, yZero]);

  // Área por encima de la línea $0 (Verde) y por debajo de $0 (Roja)
  const areaPaths = useMemo(() => {
    if (points.length <= 1) return { greenArea: "", redArea: "" };

    const pathStr = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
      ""
    );
    const last = points[points.length - 1];
    const first = points[0];

    const areaStr = `${pathStr} L ${last.x.toFixed(1)} ${yZero.toFixed(1)} L ${first.x.toFixed(1)} ${yZero.toFixed(1)} Z`;
    return { areaStr };
  }, [points, yZero]);

  // X-Axis Date ticks selection (max 6 ticks)
  const xTicks = useMemo(() => {
    if (points.length <= 6) return points;
    const step = (points.length - 1) / 5;
    const result = [];
    for (let i = 0; i < 6; i++) {
      const idx = Math.min(Math.round(i * step), points.length - 1);
      result.push(points[idx]);
    }
    return result;
  }, [points]);

  // Helper para convertir posición de pantalla a X de SVG
  const getSvgX = (e: { clientX: number }) => {
    if (!svgRef.current) return padLeft;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * svgWidth;
    return Math.max(padLeft, Math.min(svgWidth - padRight, x));
  };

  // Pointer Down (Drag selection)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const x = getSvgX(e);
    setDragStart(x);
    setDragCurrent(x);
    setIsDragging(true);
  };

  // Pointer Move (Hover tooltip or Drag box update)
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const mouseX = getSvgX(e);

    if (isDragging && dragStart !== null) {
      setDragCurrent(mouseX);
    } else {
      let closestIdx = 0;
      let minDistance = Infinity;
      points.forEach((pt, i) => {
        const dist = Math.abs(pt.x - mouseX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      });

      if (indiceHover !== closestIdx) {
        setIndiceHover(closestIdx);
        hapticoSeleccion();
      }
    }
  };

  // Pointer Up (Apply Drag Zoom)
  const handlePointerUp = () => {
    if (isDragging && dragStart !== null && dragCurrent !== null) {
      const minX = Math.min(dragStart, dragCurrent);
      const maxX = Math.max(dragStart, dragCurrent);
      const distance = maxX - minX;

      if (distance > 15) {
        const ratioStart = Math.max(0, (minX - padLeft) / drawWidth);
        const ratioEnd = Math.min(1, (maxX - padLeft) / drawWidth);

        const currentStartIdx = zoomDomain ? zoomDomain.startIdx : 0;
        const currentEndIdx = zoomDomain ? zoomDomain.endIdx : data.length - 1;
        const currentRange = currentEndIdx - currentStartIdx;

        const newStartIdx = currentStartIdx + Math.floor(ratioStart * currentRange);
        const newEndIdx = currentStartIdx + Math.ceil(ratioEnd * currentRange);

        if (newEndIdx - newStartIdx >= 1) {
          setZoomDomain({ startIdx: newStartIdx, endIdx: newEndIdx });
          hapticoImpactoMedio();
        }
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handlePointerLeave = () => {
    if (isDragging) {
      handlePointerUp();
    }
    setIndiceHover(null);
  };

  // Touch Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartDomainRef.current = zoomDomain || { startIdx: 0, endIdx: data.length - 1 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current && pinchStartDomainRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      const scale = pinchStartDistRef.current / currentDist;
      const baseStart = pinchStartDomainRef.current.startIdx;
      const baseEnd = pinchStartDomainRef.current.endIdx;
      const baseLen = baseEnd - baseStart + 1;

      const newLen = Math.max(2, Math.min(data.length, Math.round(baseLen * scale)));
      const centerIdx = Math.round((baseStart + baseEnd) / 2);
      const halfLen = Math.floor(newLen / 2);

      let newStart = Math.max(0, centerIdx - halfLen);
      let newEnd = Math.min(data.length - 1, newStart + newLen - 1);

      if (newEnd - newStart + 1 < newLen) {
        newStart = Math.max(0, newEnd - newLen + 1);
      }

      if (newStart === 0 && newEnd === data.length - 1) {
        setZoomDomain(null);
      } else {
        setZoomDomain({ startIdx: newStart, endIdx: newEnd });
      }
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
    pinchStartDomainRef.current = null;
  };

  // Formatters
  const formatearFechaCorta = (fechaStr: string) => {
    if (!fechaStr) return "";
    const parts = fechaStr.split("-");
    if (parts.length < 3) return fechaStr;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return fechaStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
  };

  const formatearFechaLarga = (fechaStr: string) => {
    if (!fechaStr) return "";
    const parts = fechaStr.split("-");
    if (parts.length < 3) return fechaStr;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return fechaStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "long" });
  };

  const puntoActivo = indiceHover !== null ? points[indiceHover] : null;
  const estaZoomActivo = zoomDomain !== null && (zoomDomain.startIdx > 0 || zoomDomain.endIdx < data.length - 1);

  return (
    <div className={`card-cut border border-rule/60 bg-paper/60 backdrop-blur-md rounded-[16px] transition-all duration-300 ${expandido ? "p-5 sm:p-6 shadow-md" : "p-4 shadow-sm"}`}>
      {/* Header con Título, Estado de Zoom y Botones */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
            Balance / Tendencia de Ingresos
          </h3>
          <span className="text-[11px] font-mono text-ink-soft bg-paper border border-rule px-2 py-0.5 rounded-full">
            {visibleData.length} {visibleData.length === 1 ? "día" : "días"} {estaZoomActivo ? "(Zoom)" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {estaZoomActivo && (
            <button
              type="button"
              onClick={resetZoom}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-[10px] transition-colors"
              title="Restablecer zoom a vista completa"
            >
              <RotateCcw className="size-3.5" />
              <span>Restablecer Zoom</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleExpand}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink bg-paper hover:bg-paper-2 border border-rule px-2.5 py-1.5 rounded-[10px] transition-colors"
            title={expandido ? "Reducir gráfico" : "Ampliar gráfico"}
          >
            {expandido ? (
              <>
                <Minimize2 className="size-3.5 text-emerald-500" />
                <span>Reducir</span>
              </>
            ) : (
              <>
                <Maximize2 className="size-3.5 text-emerald-500" />
                <span>Ampliar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tooltip Header / Active Point Highlight */}
      <div className="min-h-[38px] mb-3 px-3.5 py-2 rounded-[10px] bg-paper/90 border border-rule/60 flex items-center justify-between text-xs transition-colors">
        {puntoActivo ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink capitalize">
                📅 {formatearFechaLarga(puntoActivo.date)}
              </span>
              <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                puntoActivo.isLoss 
                  ? "bg-red-500/15 text-red-500 border border-red-500/30" 
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              }`}>
                {puntoActivo.isLoss ? (
                  <>
                    <TrendingDown className="size-3 text-red-500" />
                    Pérdida Neto (Bajo $0)
                  </>
                ) : (
                  <>
                    <TrendingUp className="size-3 text-emerald-400" />
                    Ingreso Neto (Sobre $0)
                  </>
                )}
              </span>
            </div>
            <span className={`font-bold font-mono text-base ${puntoActivo.isLoss ? "text-red-500" : "text-emerald-400"}`}>
              {puntoActivo.total < 0 ? `-$${Math.abs(puntoActivo.total).toLocaleString("es-AR")}` : `$${puntoActivo.total.toLocaleString("es-AR")}`}
            </span>
          </>
        ) : (
          <span className="text-ink-soft text-[11px] italic flex items-center gap-1">
            <ZoomIn className="size-3 text-emerald-500 shrink-0" />
            {estaZoomActivo
              ? "Línea de Base ámbar en $0. Los valores por debajo de $0 se muestran en ROJO (pérdidas)."
              : "Línea de Base ámbar en $0. Arrastra recuadro o pellizca para hacer ZOOM. Pérdidas en ROJO."}
          </span>
        )}
      </div>

      {/* Main SVG Area con Fondo Limpio Transparente */}
      <div className="relative w-full overflow-hidden rounded-[12px] bg-paper/20 p-2 border border-rule/30 backdrop-blur-xs">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible touch-none select-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <defs>
            {/* Gradiente Verde (Sobre $0) */}
            <linearGradient id="ingresosGradienteVerde" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10e7a0" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10e7a0" stopOpacity="0.0" />
            </linearGradient>

            {/* Filtro Resplandor Verde */}
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10e7a0" floodOpacity="0.5" />
            </filter>

            {/* Filtro Resplandor Rojo (Pérdidas bajo $0) */}
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Horizontal Reference Lines (Y-Axis) */}
          {yLevels.map((lvl, idx) => {
            const y = padTop + drawHeight - ((lvl.val - minVal) / range) * drawHeight;
            if (lvl.isZero) return null; // La línea de base en $0 se dibuja resaltada aparte abajo
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-ink-soft/15"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="text-[12px] font-mono fill-ink-soft opacity-90"
                >
                  {lvl.label}
                </text>
              </g>
            );
          })}

          {/* Vertical Dates Labels (X-Axis) */}
          {xTicks.map((pt, idx) => (
            <g key={idx}>
              <line
                x1={pt.x}
                y1={padTop + drawHeight}
                x2={pt.x}
                y2={padTop + drawHeight + 4}
                stroke="currentColor"
                className="text-ink-soft/20"
                strokeWidth="1"
              />
              <text
                x={pt.x}
                y={svgHeight - 10}
                textAnchor="middle"
                fill="currentColor"
                className="text-[11px] font-medium fill-ink-soft uppercase"
              >
                {formatearFechaCorta(pt.date)}
              </text>
            </g>
          ))}

          {/* LÍNEA DE BASE EN $0 (Resaltada en Ámbar / Gold) */}
          <g>
            <line
              x1={padLeft}
              y1={yZero}
              x2={svgWidth - padRight}
              y2={yZero}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity="0.8"
            />
            <rect
              x={padLeft - 68}
              y={yZero - 9}
              width="60"
              height="18"
              rx="4"
              fill="#f59e0b"
              fillOpacity="0.2"
              stroke="#f59e0b"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={yZero + 4}
              textAnchor="end"
              fill="#f59e0b"
              className="text-[10px] font-bold font-mono"
            >
              BASE $0
            </text>
          </g>

          {/* Area Fill */}
          {areaPaths.areaStr && <path d={areaPaths.areaStr} fill="url(#ingresosGradienteVerde)" />}

          {/* Segmentos de Línea Coloreados Dinámicamente (Verde sobre $0, ROJO únicamente cuando cae bajo $0) */}
          {segments.map((seg, idx) => (
            <line
              key={idx}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={seg.color}
              strokeWidth={expandido ? "3.5" : "2.5"}
              strokeLinecap="round"
              filter={seg.filter}
            />
          ))}

          {/* Puntos en la línea (Rojo ÚNICAMENTE cuando cae por debajo de $0) */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={expandido ? "3.5" : "2.5"}
              fill={pt.isLoss ? "#ef4444" : "#10e7a0"}
              className="transition-transform duration-150"
            />
          ))}

          {/* Recuadro de Selección Zoom al Arrastrar */}
          {isDragging && dragStart !== null && dragCurrent !== null && Math.abs(dragCurrent - dragStart) > 4 && (
            <g>
              <rect
                x={Math.min(dragStart, dragCurrent)}
                y={padTop}
                width={Math.abs(dragCurrent - dragStart)}
                height={drawHeight}
                fill="#10e7a0"
                fillOpacity="0.2"
                stroke="#10e7a0"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                rx="4"
              />
              <text
                x={Math.min(dragStart, dragCurrent) + Math.abs(dragCurrent - dragStart) / 2}
                y={padTop + 16}
                textAnchor="middle"
                fill="#10e7a0"
                className="text-[10px] font-bold fill-emerald-400 select-none pointer-events-none"
              >
                🔍 Soltar para Zoom
              </text>
            </g>
          )}

          {/* Target Highlight Activo con color adaptativo */}
          {!isDragging && puntoActivo && (
            <g>
              <line
                x1={puntoActivo.x}
                y1={padTop}
                x2={puntoActivo.x}
                y2={padTop + drawHeight}
                stroke={puntoActivo.isLoss ? "#ef4444" : "#10e7a0"}
                strokeDasharray="2 2"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <circle
                cx={puntoActivo.x}
                cy={puntoActivo.y}
                r="8"
                fill={puntoActivo.isLoss ? "#ef4444" : "#10e7a0"}
                opacity="0.25"
                className="animate-ping"
              />
              <circle
                cx={puntoActivo.x}
                cy={puntoActivo.y}
                r="5"
                fill={puntoActivo.isLoss ? "#ef4444" : "#10e7a0"}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Metric Breakdown Stats Cards */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-rule/50 text-center">
        <div className="p-2 rounded-[10px] bg-paper border border-rule/60">
          <p className="text-[10px] uppercase font-bold text-ink-soft flex items-center justify-center gap-1">
            <TrendingUp className="size-3 text-emerald-500" />
            Promedio/día
          </p>
          <p className="text-sm sm:text-base font-bold font-mono text-ink mt-0.5">
            ${promedioDiario.toLocaleString("es-AR")}
          </p>
        </div>

        <div className="p-2 rounded-[10px] bg-paper border border-rule/60">
          <p className="text-[10px] uppercase font-bold text-ink-soft flex items-center justify-center gap-1">
            <Award className="size-3 text-amber-500" />
            Día Pico Ingresos
          </p>
          <p className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
            ${diaPico ? diaPico.total.toLocaleString("es-AR") : 0}
          </p>
        </div>

        <div className="p-2 rounded-[10px] bg-paper border border-rule/60">
          <p className="text-[10px] uppercase font-bold text-ink-soft flex items-center justify-center gap-1">
            <ShieldAlert className="size-3 text-red-400" />
            Mayor Pérdida
          </p>
          <p className="text-sm sm:text-base font-bold font-mono text-red-400 mt-0.5">
            {diaMayorPerdida ? `-$${Math.abs(diaMayorPerdida.total).toLocaleString("es-AR")}` : "$0"}
          </p>
        </div>
      </div>
    </div>
  );
}
