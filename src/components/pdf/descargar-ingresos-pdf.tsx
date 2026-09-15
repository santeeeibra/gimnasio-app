"use client";

import { useState } from "react";

type Pago = {
  id: string;
  fecha_pago: string;
  monto: number;
  cliente_nombre: string;
  plan_nombre: string;
  comprobante_ref?: string | null;
};

interface Props {
  pagos: Pago[];
  gimnasioNombre: string;
  logoUrl?: string | null;
  rangoLabel: string; // "Enero 2026" o "01/01/2026 – 31/01/2026"
  pagosFiltrados: Pago[];
}

export function DescargarIngresosPdf({
  gimnasioNombre,
  logoUrl,
  rangoLabel,
  pagosFiltrados,
}: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (pagosFiltrados.length === 0) {
      alert("No hay pagos en el rango seleccionado.");
      return;
    }
    setGenerando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margen = 14;

      // ── Logo SysGym en encabezado derecho ──────────────────────────────
      let sysLogoDataUrl: string | null = null;
      let sysLogoAspect = 5.915;
      try {
        const r = await cargarImagenCompleta("/logo-sysgym.png", "image/png");
        sysLogoDataUrl = r.dataUrl;
        sysLogoAspect = r.w / r.h || 5.915;
      } catch { /* ok */ }

      // ── Logo del Gimnasio ─────────────────────────────────────────────
      let headerY = margen;
      if (logoUrl) {
        try {
          const imgData = await cargarImagenCompleta(logoUrl);
          doc.addImage(imgData.dataUrl, "WEBP", margen, margen, 14, 14);
          headerY = margen;
        } catch { /* sin logo */ }
      }

      const txtX = logoUrl ? margen + 18 : margen;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(gimnasioNombre, txtX, headerY + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100);
      doc.text(`Historial de ingresos · ${rangoLabel || "General"}`, txtX, headerY + 13);

      if (sysLogoDataUrl) {
        const logoH = 6;
        const logoW = logoH * sysLogoAspect;
        doc.addImage(sysLogoDataUrl, "PNG", pageW - margen - logoW, margen, logoW, logoH);
      }

      doc.setTextColor(0);
      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, headerY + 17, pageW - margen, headerY + 17);

      let currentY = headerY + 22;

      // ── Captura del Gráfico SVG e inclusión en el PDF ──────────────────
      try {
        const svgEl = document.querySelector("svg.cursor-crosshair") as SVGSVGElement | null;
        if (svgEl) {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgEl);
          const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          const url = URL.createObjectURL(svgBlob);
          const chartImg = await cargarImagenCompleta(url, "image/png");
          URL.revokeObjectURL(url);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(50);
          doc.text("TENDENCIA Y BALANCE DE INGRESOS", margen, currentY + 3);

          doc.addImage(chartImg.dataUrl, "PNG", margen, currentY + 6, pageW - 2 * margen, 45);
          currentY += 56;
        }
      } catch { /* si falla la captura del gráfico continúa sin romper el PDF */ }

      // ── Agrupar por mes ────────────────────────────────────────────────
      const pagosPorMes = new Map<string, Pago[]>();
      pagosFiltrados.forEach((p) => {
        const [y, m] = p.fecha_pago.split("-");
        const k = `${y}-${m}`;
        if (!pagosPorMes.has(k)) pagosPorMes.set(k, []);
        pagosPorMes.get(k)!.push(p);
      });

      const meses = [...pagosPorMes.keys()].sort((a, b) => a.localeCompare(b));
      let totalGeneral = 0;

      const formatMes = (k: string) => {
        const [y, m] = k.split("-");
        const dateObj = new Date(Number(y), Number(m) - 1);
        const str = dateObj.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
        return str.charAt(0).toUpperCase() + str.slice(1);
      };

      autoTable(doc, {
        startY: currentY,
        head: [["Fecha", "Socio", "Plan / Concepto", "Monto"]],
        body: (() => {
          const rows: (string | { content: string; styles: object })[][] = [];
          for (const mes of meses) {
            const ps = pagosPorMes.get(mes)!;
            const totalMes = ps.reduce((a, p) => a + p.monto, 0);
            totalGeneral += totalMes;

            // Separador de mes
            rows.push([
              {
                content: formatMes(mes),
                styles: {
                  fontStyle: "bold",
                  fillColor: [240, 240, 244],
                  textColor: 40,
                  colSpan: 4,
                },
              },
              "", "", "",
            ]);

            ps.forEach((p) => {
              rows.push([
                new Date(p.fecha_pago + "T12:00:00").toLocaleDateString("es-AR"),
                p.cliente_nombre,
                p.plan_nombre,
                `${p.monto < 0 ? "-" : "+"}$${Math.abs(p.monto).toLocaleString("es-AR")}`,
              ]);
            });

            // Subtotal del mes
            rows.push([
              {
                content: `Subtotal ${formatMes(mes)}`,
                styles: { fontStyle: "bold", fillColor: [248, 248, 250] },
              },
              "",
              "",
              {
                content: `${totalMes < 0 ? "-" : "+"}$${Math.abs(totalMes).toLocaleString("es-AR")}`,
                styles: { fontStyle: "bold", fillColor: [248, 248, 250], halign: "right" },
              },
            ]);
          }
          return rows;
        })(),
        margin: { left: margen, right: margen },
        headStyles: {
          fillColor: [16, 231, 160],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8.5, textColor: 40 },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 42 },
          3: { cellWidth: 32, halign: "right", fontStyle: "bold" },
        },
      });

      // ── Total general ──────────────────────────────────────────────────
      const finalY = (doc as any).lastAutoTable.finalY + 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL GENERAL BALANCE", margen, finalY);
      doc.text(`${totalGeneral < 0 ? "-" : "+"}$${Math.abs(totalGeneral).toLocaleString("es-AR")}`, pageW - margen, finalY, { align: "right" });

      // ── Pie en todas las páginas ───────────────────────────────────────
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Generado con SysGym  ·  Pág. ${p}/${totalPages}`,
          pageW / 2,
          pageH - 8,
          { align: "center" },
        );
        doc.setTextColor(0);
      }

      const nombreArchivo = `ingresos-${rangoLabel.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "todos"}.pdf`;
      doc.save(nombreArchivo);
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("No se pudo generar el PDF. Intentá de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generar}
      disabled={generando || pagosFiltrados.length === 0}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-[12px] font-semibold text-ink-soft transition-all duration-150 hover:text-ink hover:border-ink/30 active:scale-95 disabled:opacity-40 focus-visible:outline-none shrink-0"
      title={pagosFiltrados.length === 0 ? "Seleccioná un rango primero" : "Descargar PDF con Gráfico e Historial"}
    >
      {generando ? (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Generando…
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar PDF
        </>
      )}
    </button>
  );
}

function cargarImagenCompleta(url: string, format = "WEBP"): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("no-ctx");
      ctx.drawImage(img, 0, 0);
      const mime = format === "PNG" || format === "image/png" ? "image/png" : "image/webp";
      resolve({ dataUrl: canvas.toDataURL(mime), w: canvas.width, h: canvas.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}
