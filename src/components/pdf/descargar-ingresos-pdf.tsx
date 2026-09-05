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

      // ── Logo en encabezado ─────────────────────────────────────────────
      let headerY = margen;
      if (logoUrl) {
        try {
          const imgData = await cargarImagen(logoUrl);
          doc.addImage(imgData, "WEBP", margen, margen, 16, 16);
          headerY = margen;
        } catch { /* sin logo */ }
      }

      const txtX = logoUrl ? margen + 20 : margen;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(gimnasioNombre, txtX, headerY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Historial de ingresos · ${rangoLabel}`, txtX, headerY + 15);
      doc.text(
        `Generado el ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`,
        pageW - margen,
        headerY + 15,
        { align: "right" },
      );
      doc.setTextColor(0);

      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, headerY + 19, pageW - margen, headerY + 19);

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
        return new Date(Number(y), Number(m) - 1).toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
        });
      };

      autoTable(doc, {
        startY: headerY + 23,
        head: [["Fecha", "Socio", "Plan", "Monto"]],
        body: (() => {
          const rows: (string | { content: string; styles: object })[][] = [];
          for (const mes of meses) {
            const ps = pagosPorMes.get(mes)!;
            const totalMes = ps.reduce((a, p) => a + p.monto, 0);
            totalGeneral += totalMes;

            // Separador de mes
            rows.push([
              {
                content: formatMes(mes).replace(/^\w/, (c) => c.toUpperCase()),
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
                `$${p.monto.toLocaleString("es-AR")}`,
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
                content: `$${totalMes.toLocaleString("es-AR")}`,
                styles: { fontStyle: "bold", fillColor: [248, 248, 250], halign: "right" },
              },
            ]);
          }
          return rows;
        })(),
        margin: { left: margen, right: margen },
        headStyles: {
          fillColor: [30, 30, 36],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9, textColor: 40 },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 36 },
          3: { cellWidth: 28, halign: "right" },
        },
      });

      // ── Total general ──────────────────────────────────────────────────
      const finalY = (doc as any).lastAutoTable.finalY + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("TOTAL GENERAL", margen, finalY);
      doc.text(`$${totalGeneral.toLocaleString("es-AR")}`, pageW - margen, finalY, { align: "right" });

      // ── Pie en todas las páginas ───────────────────────────────────────
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(160);
        doc.text(
          `Generado con SysGym  ·  Pág. ${p}/${totalPages}`,
          pageW / 2,
          pageH - 8,
          { align: "center" },
        );
        doc.setTextColor(0);
      }

      const nombreArchivo = `ingresos-${rangoLabel.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`;
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
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-[12px] font-medium text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:border-ink/30 active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 shrink-0"
      title={pagosFiltrados.length === 0 ? "Seleccioná un rango primero" : "Descargar PDF del período"}
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

function cargarImagen(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/webp"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
