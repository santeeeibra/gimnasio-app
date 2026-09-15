"use client";

import { useState } from "react";

interface Props {
  pagoId: string;
  fechaPago: string; // yyyy-mm-dd
  cubreHasta: string; // yyyy-mm-dd
  monto: number;
  planNombre: string;
  clienteNombre: string;
  gimnasioNombre: string;
  logoUrl?: string | null;
  afip?: {
    razonSocial: string | null;
    cuit: string | null;
    condicionIva: string | null;
    puntoVenta: number | null;
  } | null;
}

const CONDICION_LABEL: Record<string, string> = {
  monotributo: "Monotributista",
  responsable_inscripto: "Responsable Inscripto",
  exento: "Exento",
};

export function DescargarComprobantePdf({
  pagoId,
  fechaPago,
  cubreHasta,
  monto,
  planNombre,
  clienteNombre,
  gimnasioNombre,
  logoUrl,
  afip,
}: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
      const pageW = doc.internal.pageSize.getWidth();
      const margen = 14;
      let y = margen;

      // Logo SysGym en encabezado derecho
      let sysLogoDataUrl: string | null = null;
      let sysLogoAspect = 5.915;
      try {
        const r = await cargarImagenCompleta("/logo-sysgym.png", "image/png");
        sysLogoDataUrl = r.dataUrl;
        sysLogoAspect = r.w / r.h || 5.915;
      } catch { /* ok */ }

      if (logoUrl) {
        try {
          const imgData = await cargarImagenCompleta(logoUrl);
          doc.addImage(imgData.dataUrl, "WEBP", margen, y, 14, 14);
        } catch {
          /* sin logo */
        }
      }
      const txtX = logoUrl ? margen + 18 : margen;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(gimnasioNombre, txtX, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100);
      doc.text(afip?.razonSocial ? afip.razonSocial : "Comprobante de pago", txtX, y + 12);
      doc.setTextColor(0);

      if (sysLogoDataUrl) {
        const logoH = 5;
        const logoW = logoH * sysLogoAspect;
        doc.addImage(sysLogoDataUrl, "PNG", pageW - margen - logoW, y, logoW, logoH);
      }

      y += 20;
      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, y, pageW - margen, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("RECIBO DE PAGO", margen, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`N.º ${pagoId.slice(0, 8).toUpperCase()}`, pageW - margen, y, { align: "right" });
      doc.setTextColor(0);
      y += 10;

      const filas: [string, string][] = [
        ["Socio", clienteNombre],
        ["Plan", planNombre],
        ["Fecha de pago", formatFecha(fechaPago)],
        ["Cubre hasta", formatFecha(cubreHasta)],
      ];
      if (afip?.cuit) filas.push(["CUIT", afip.cuit]);
      if (afip?.condicionIva) {
        filas.push(["Condición IVA", CONDICION_LABEL[afip.condicionIva] ?? afip.condicionIva]);
      }
      if (afip?.puntoVenta) filas.push(["Punto de venta", String(afip.puntoVenta).padStart(4, "0")]);

      doc.setFontSize(10);
      filas.forEach(([label, valor]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(label, margen, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(valor, pageW - margen, y, { align: "right" });
        y += 7;
      });

      y += 4;
      doc.setDrawColor(220);
      doc.line(margen, y, pageW - margen, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("TOTAL", margen, y);
      doc.text(
        monto.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }),
        pageW - margen,
        y,
        { align: "right" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(160);
      doc.text(
        afip?.cuit
          ? "Comprobante no válido como factura oficial AFIP hasta la integración de emisión electrónica."
          : "Comprobante interno, no válido como factura fiscal.",
        margen,
        doc.internal.pageSize.getHeight() - 14,
      );
      doc.text(
        `Generado con SysGym el ${new Date().toLocaleDateString("es-AR")}`,
        margen,
        doc.internal.pageSize.getHeight() - 9,
      );
      doc.setTextColor(0);

      doc.save(`comprobante-${fechaPago}.pdf`);
    } catch (err) {
      console.error("Error generando comprobante:", err);
      alert("No se pudo generar el comprobante. Intentá de nuevo.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generar}
      disabled={generando}
      className="inline-flex items-center gap-1 rounded-[8px] border border-rule bg-paper px-2 py-1.5 text-[11px] font-medium text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:border-ink/30 active:scale-95 disabled:opacity-40 shrink-0"
      title="Descargar comprobante PDF"
    >
      {generando ? (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="animate-spin">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )}
      PDF
    </button>
  );
}

function formatFecha(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
