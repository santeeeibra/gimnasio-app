"use client";

import { useState } from "react";
import type { DiaEditable } from "@/app/mi/rutina/rutina-editor";
import { hapticoExito } from "@/lib/ui/hapticos";

interface Props {
  clienteNombre: string;
  gimnasioNombre: string;
  rutinaNombre: string; // "Hipertrofia · Intermedio · 4 días"
  dias: DiaEditable[];
  logoUrl?: string | null;
  /** Último peso corporal registrado (registro_peso), en kg. */
  pesoCorporal?: number | null;
  /** Último peso levantado por ejercicio: { [ejercicioId]: kg } (registro_progreso). */
  pesosPorEjercicio?: Record<string, number>;
}

export function DescargarRutinaPdf({
  clienteNombre,
  gimnasioNombre,
  rutinaNombre,
  dias,
  logoUrl,
  pesoCorporal,
  pesosPorEjercicio,
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
      const margen = 16;

      // ── Pre-cargar imagen del logo (síncrono en didDrawPage no puede ser async) ─
      let logoDataUrl: string | null = null;
      if (logoUrl) {
        try { logoDataUrl = (await cargarImagen(logoUrl)).dataUrl; } catch { /* ok */ }
      }

      // Logo SysGym del encabezado (public/logo-sysgym.png).
      let sysLogoDataUrl: string | null = null;
      let sysLogoAspect = 5.915; // Proporción exacta 349/59
      try {
        const r = await cargarImagen("/logo-sysgym.png", "image/png");
        sysLogoDataUrl = r.dataUrl;
        sysLogoAspect = r.w / r.h || 5.915;
      } catch { /* ok */ }

      /** Dibuja marca de agua centrada, baja opacidad (síncrono). */
      function dibujarMarcaAgua() {
        if (!logoDataUrl) return;
        try {
          doc.saveGraphicsState();
          doc.setGState(doc.GState({ opacity: 0.05 }));
          const logoSize = 80;
          doc.addImage(logoDataUrl, "WEBP", (pageW - logoSize) / 2, (pageH - logoSize) / 2, logoSize, logoSize);
          doc.restoreGraphicsState();
        } catch { /* ok */ }
      }

      // ── Encabezado de página 1 ─────────────────────────────────────────
      dibujarMarcaAgua();

      // 1. Logo SysGym en la esquina superior derecha
      if (sysLogoDataUrl) {
        try {
          const logoW = 44;
          const logoH = logoW / sysLogoAspect;
          const logoX = pageW - margen - logoW;
          const logoY = margen;
          doc.addImage(sysLogoDataUrl, "PNG", logoX, logoY, logoW, logoH);
        } catch {
          /* sin logo */
        }
      }

      // 2. Nombre del gimnasio (arriba a la izquierda)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(gimnasioNombre || "Gimnasio", margen, margen + 9.5);

      // 3. Subtítulo y Fecha
      const subY = margen + 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);

      const subtituloPartes = [
        clienteNombre ? `Rutina de ${clienteNombre}` : null,
        rutinaNombre || null,
        pesoCorporal != null ? `Peso actual: ${pesoCorporal} kg` : null,
      ].filter(Boolean);
      const subtitulo = subtituloPartes.join("  ·  ");

      doc.text(subtitulo, margen, subY);

      const fechaStr = `Generado el ${new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`;
      doc.text(fechaStr, pageW - margen, subY, { align: "right" });

      // 4. Línea separadora
      const sepY = subY + 7;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.35);
      doc.line(margen, sepY, pageW - margen, sepY);

      let cursorY = sepY + 9;

      // ── Tabla por día ──────────────────────────────────────────────────
      for (const dia of dias) {
        // Si no cabe en la página, nueva página
        const estimado = 14 + dia.items.length * 8;
        if (cursorY + estimado > pageH - 20) {
          doc.addPage();
          dibujarMarcaAgua();
          cursorY = margen + 4;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(dia.titulo, margen, cursorY);
        cursorY += 4.5;

        const body = dia.items.map((item) => {
          const pesoEj = item.ejercicio?.id
            ? pesosPorEjercicio?.[item.ejercicio.id]
            : undefined;
          return [
            item.ejercicio?.nombre ?? "Ejercicio",
            String(item.series),
            pesoEj != null
              ? `${item.repeticiones}\nPeso actual: ${pesoEj} kg`
              : item.repeticiones,
            item.tecnica && item.tecnica !== "ninguna" ? item.tecnica : "—",
            item.nota?.trim() ? item.nota : "—",
          ];
        });

        autoTable(doc, {
          startY: cursorY,
          head: [["Ejercicio", "Series", "Reps", "Técnica", "Nota"]],
          body,
          margin: { left: margen, right: margen },
          theme: "plain",
          styles: {
            font: "helvetica",
            lineColor: [255, 255, 255],
            lineWidth: 0,
          },
          headStyles: {
            fillColor: [24, 24, 27],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8.5,
            cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
          },
          bodyStyles: {
            fontSize: 8.5,
            textColor: [31, 41, 55],
            cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
            lineWidth: 0,
          },
          alternateRowStyles: {
            fillColor: [246, 247, 249],
          },
          columnStyles: {
            0: { cellWidth: "auto", halign: "left" },
            1: { cellWidth: 16, halign: "center" },
            2: { cellWidth: 32, halign: "center" },
            3: { cellWidth: 22, halign: "center" },
            4: { cellWidth: "auto", halign: "left" },
          },
          // Síncrono: logoDataUrl ya está cargado antes del loop
          didDrawPage: () => {
            dibujarMarcaAgua();
          },
        });

        cursorY = (doc as any).lastAutoTable.finalY + 9;
      }

      // ── Pie de página en todas las páginas ────────────────────────────
      const totalPages = doc.internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Generado con SysGym  ·  Pág. ${p}/${totalPages}`,
          pageW / 2,
          pageH - 8,
          { align: "center" },
        );
      }

      // ── Descargar ──────────────────────────────────────────────────────
      const nombreArchivo = `rutina-${slugify(clienteNombre)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nombreArchivo);
      hapticoExito();
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

function cargarImagen(
  url: string,
  mime: "image/webp" | "image/png" = "image/webp",
  trim = true,
): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const origCanvas = document.createElement("canvas");
      origCanvas.width = img.naturalWidth;
      origCanvas.height = img.naturalHeight;
      const ctx = origCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      if (!trim) {
        return resolve({
          dataUrl: origCanvas.toDataURL(mime),
          w: img.naturalWidth,
          h: img.naturalHeight,
        });
      }

      try {
        const imgData = ctx.getImageData(0, 0, origCanvas.width, origCanvas.height);
        const { data, width, height } = imgData;
        let minX = width, maxX = 0, minY = height, maxY = 0;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            const esFondo = a < 20 || (r > 242 && g > 242 && b > 242);
            if (!esFondo) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const pad = 4;
          const cropX = Math.max(0, minX - pad);
          const cropY = Math.max(0, minY - pad);
          const cropW = Math.min(width - cropX, maxX - minX + pad * 2);
          const cropH = Math.min(height - cropY, maxY - minY + pad * 2);

          const trimCanvas = document.createElement("canvas");
          trimCanvas.width = cropW;
          trimCanvas.height = cropH;
          const trimCtx = trimCanvas.getContext("2d")!;
          trimCtx.drawImage(origCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          return resolve({
            dataUrl: trimCanvas.toDataURL(mime),
            w: cropW,
            h: cropH,
          });
        }
      } catch {
        /* fallback al canvas original */
      }

      resolve({
        dataUrl: origCanvas.toDataURL(mime),
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}
