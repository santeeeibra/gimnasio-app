"use client";

import { useState } from "react";
import type { DiaEditable } from "@/app/mi/rutina/rutina-editor";

interface Props {
  clienteNombre: string;
  gimnasioNombre: string;
  rutinaNombre: string; // "Hipertrofia · Intermedio · 4 días"
  dias: DiaEditable[];
  logoUrl?: string | null;
}

export function DescargarRutinaPdf({
  clienteNombre,
  gimnasioNombre,
  rutinaNombre,
  dias,
  logoUrl,
}: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    try {
      // Importación dinámica — no sube el bundle inicial
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margen = 14;

      // ── Pre-cargar imagen del logo (síncrono en didDrawPage no puede ser async) ─
      let logoDataUrl: string | null = null;
      if (logoUrl) {
        try { logoDataUrl = await cargarImagen(logoUrl); } catch { /* ok */ }
      }

      /** Dibuja marca de agua centrada, baja opacidad (síncrono). */
      function dibujarMarcaAgua() {
        if (!logoDataUrl) return;
        try {
          doc.saveGraphicsState();
          doc.setGState(doc.GState({ opacity: 0.06 }));
          const logoSize = 80;
          doc.addImage(logoDataUrl, "WEBP", (pageW - logoSize) / 2, (pageH - logoSize) / 2, logoSize, logoSize);
          doc.restoreGraphicsState();
        } catch { /* ok */ }
      }

      // ── Encabezado de página 1 ─────────────────────────────────────────
      dibujarMarcaAgua();

      // Logo en encabezado si hay
      if (logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, "WEBP", margen, margen, 14, 14);
        } catch { /* sin logo */ }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(gimnasioNombre, logoDataUrl ? margen + 17 : margen, margen + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `Rutina de ${clienteNombre}  ·  ${rutinaNombre}`,
        margen,
        margen + 17,
      );
      doc.text(
        `Generado el ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`,
        pageW - margen,
        margen + 17,
        { align: "right" },
      );
      doc.setTextColor(0);

      // Línea separadora
      doc.setDrawColor(220);
      doc.setLineWidth(0.4);
      doc.line(margen, margen + 21, pageW - margen, margen + 21);

      let cursorY = margen + 28;

      // ── Tabla por día ──────────────────────────────────────────────────
      for (const dia of dias) {
        // Si no cabe en la página, nueva página
        const estimado = 10 + dia.items.length * 8;
        if (cursorY + estimado > pageH - 20) {
          doc.addPage();
          dibujarMarcaAgua();
          cursorY = margen;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(dia.titulo, margen, cursorY);
        cursorY += 5;

        const body = dia.items.map((item) => [
          item.ejercicio?.nombre ?? "Ejercicio",
          String(item.series),
          item.repeticiones,
          item.tecnica && item.tecnica !== "ninguna" ? item.tecnica : "—",
          item.nota || "—",
        ]);

        autoTable(doc, {
          startY: cursorY,
          head: [["Ejercicio", "Series", "Reps", "Técnica", "Nota"]],
          body,
          margin: { left: margen, right: margen },
          headStyles: {
            fillColor: [30, 30, 36],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
          },
          bodyStyles: { fontSize: 9, textColor: 40 },
          alternateRowStyles: { fillColor: [248, 248, 250] },
          columnStyles: {
            0: { cellWidth: "auto" },
            1: { cellWidth: 16, halign: "center" },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 28 },
            4: { cellWidth: "auto" },
          },
          // Síncrono: logoDataUrl ya está cargado antes del loop
          didDrawPage: () => { dibujarMarcaAgua(); },
        });

        cursorY = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── Pie de página en todas las páginas ────────────────────────────
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

      // ── Descargar ──────────────────────────────────────────────────────
      const nombreArchivo = `rutina-${slugify(clienteNombre)}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      disabled={generando}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-[12px] font-medium text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:border-ink/30 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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
          Descargar rutina
        </>
      )}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cargarImagen(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/webp"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
