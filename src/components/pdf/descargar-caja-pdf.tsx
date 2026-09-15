"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Movimiento = {
  id: string;
  created_at: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  metodo_pago?: string | null;
};

interface Props {
  movimientos: Movimiento[];
  saldoInicial?: number;
  gimnasioNombre: string;
  logoUrl?: string | null;
}

export function DescargarCajaPdf({ movimientos, saldoInicial = 0, gimnasioNombre, logoUrl }: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margen = 14;

      // SysGym logo
      let sysLogoDataUrl: string | null = null;
      let sysLogoAspect = 5.915;
      try {
        const r = await cargarImagen("/logo-sysgym.png", "image/png");
        sysLogoDataUrl = r.dataUrl;
        sysLogoAspect = r.w / r.h || 5.915;
      } catch { /* ok */ }

      let headerY = margen;
      if (logoUrl) {
        try {
          const imgData = await cargarImagen(logoUrl);
          doc.addImage(imgData.dataUrl, "WEBP", margen, margen, 14, 14);
        } catch { /* ok */ }
      }

      const txtX = logoUrl ? margen + 18 : margen;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(gimnasioNombre, txtX, headerY + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Reporte de Caja Diaria y Movimientos · ${new Date().toLocaleDateString("es-AR")}`, txtX, headerY + 13);

      if (sysLogoDataUrl) {
        const logoH = 6;
        const logoW = logoH * sysLogoAspect;
        doc.addImage(sysLogoDataUrl, "PNG", pageW - margen - logoW, margen, logoW, logoH);
      }

      doc.setTextColor(0);
      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, headerY + 17, pageW - margen, headerY + 17);

      // Total calculations
      const totalIngresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((acc, m) => acc + m.monto, 0);
      const totalEgresos = movimientos.filter((m) => m.tipo === "egreso").reduce((acc, m) => acc + m.monto, 0);
      const saldoFinal = saldoInicial + totalIngresos - totalEgresos;

      // Summary Box
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(margen, headerY + 21, pageW - 2 * margen, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`Saldo Inicial: $${saldoInicial.toLocaleString("es-AR")}`, margen + 4, headerY + 31);
      doc.text(`Ingresos: +$${totalIngresos.toLocaleString("es-AR")}`, margen + 50, headerY + 31);
      doc.text(`Egresos: -$${totalEgresos.toLocaleString("es-AR")}`, margen + 95, headerY + 31);
      doc.text(`Balance Neto: $${saldoFinal.toLocaleString("es-AR")}`, margen + 140, headerY + 31);

      const tableRows = movimientos.map((m) => [
        new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        m.tipo === "ingreso" ? "Ingreso" : "Egreso",
        m.concepto,
        m.metodo_pago || "Efectivo",
        `${m.tipo === "egreso" ? "-" : "+"}$${m.monto.toLocaleString("es-AR")}`,
      ]);

      autoTable(doc, {
        startY: headerY + 43,
        head: [["Hora", "Tipo", "Concepto / Detalle", "Método", "Monto"]],
        body: tableRows,
        margin: { left: margen, right: margen },
        headStyles: {
          fillColor: [16, 231, 160],
          textColor: 0,
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: { fontSize: 8.5, textColor: 40 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 22 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 28 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        },
      });

      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado con SysGym · Pág. ${p}/${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
      }

      doc.save(`caja-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generando PDF de caja");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generar}
      disabled={generando}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
    >
      <Download className="size-3.5" />
      <span>{generando ? "Generando PDF…" : "PDF Caja"}</span>
    </button>
  );
}

function cargarImagen(url: string, format = "WEBP"): Promise<{ dataUrl: string; w: number; h: number }> {
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
