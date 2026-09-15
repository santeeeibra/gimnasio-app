"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string | null;
  telefono?: string | null;
  plan_nombre?: string | null;
  estado_cuota?: string | null;
  created_at?: string | null;
};

interface Props {
  clientes: Cliente[];
  gimnasioNombre: string;
  logoUrl?: string | null;
}

export function DescargarClientesPdf({ clientes, gimnasioNombre, logoUrl }: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (clientes.length === 0) {
      alert("No hay socios para exportar.");
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

      // Logo SysGym en encabezado derecho
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
      doc.text(`Listado Oficial de Socios · ${clientes.length} registrados`, txtX, headerY + 13);

      if (sysLogoDataUrl) {
        const logoH = 6;
        const logoW = logoH * sysLogoAspect;
        doc.addImage(sysLogoDataUrl, "PNG", pageW - margen - logoW, margen, logoW, logoH);
      }

      doc.setTextColor(0);
      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, headerY + 17, pageW - margen, headerY + 17);

      const tableRows = clientes.map((c) => {
        const nombreComp = `${c.nombre} ${c.apellido}`.trim();
        const fechaAlta = c.created_at ? new Date(c.created_at).toLocaleDateString("es-AR") : "-";
        const estado = c.estado_cuota === "al_dia" ? "Al día" : c.estado_cuota === "vencido" ? "Vencido" : "Pendiente";
        return [
          nombreComp,
          c.dni || "-",
          c.telefono || "-",
          c.plan_nombre || "Sin plan",
          fechaAlta,
          estado,
        ];
      });

      autoTable(doc, {
        startY: headerY + 22,
        head: [["Socio", "DNI", "Teléfono", "Plan", "Socio Desde", "Estado"]],
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
          0: { cellWidth: "auto" },
          1: { cellWidth: 26 },
          2: { cellWidth: 28 },
          3: { cellWidth: 32 },
          4: { cellWidth: 24 },
          5: { cellWidth: 22, fontStyle: "bold" },
        },
      });

      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado con SysGym · Pág. ${p}/${totalPages}`, pageW / 2, pageH - 8, { align: "center" });
      }

      doc.save(`socios-${gimnasioNombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error generando PDF de socios");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generar}
      disabled={generando || clientes.length === 0}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors disabled:opacity-40"
    >
      <Download className="size-3.5" />
      <span>{generando ? "Generando PDF…" : "PDF Socios"}</span>
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
