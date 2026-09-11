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
  gimnasioNombre: string;
  rangoLabel: string; // "Enero 2026" o vacío si no hay filtro de mes
  pagosFiltrados: Pago[];
}

export function DescargarIngresosExcel({ gimnasioNombre, rangoLabel, pagosFiltrados }: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (pagosFiltrados.length === 0) {
      alert("No hay pagos en el rango seleccionado.");
      return;
    }
    setGenerando(true);
    try {
      const XLSX = await import("xlsx");

      const filas = [...pagosFiltrados]
        .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago))
        .map((p) => ({
          Fecha: new Date(p.fecha_pago + "T12:00:00").toLocaleDateString("es-AR"),
          Socio: p.cliente_nombre,
          Plan: p.plan_nombre,
          Monto: Number(p.monto) || 0,
          Comprobante: p.comprobante_ref ?? "",
        }));

      const total = filas.reduce((a, f) => a + f.Monto, 0);
      filas.push({ Fecha: "", Socio: "", Plan: "TOTAL", Monto: total, Comprobante: "" });

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja["!cols"] = [{ wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Ingresos");

      const nombreArchivo = `ingresos-${gimnasioNombre}-${rangoLabel || "todos"}`
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()
        .concat(".xlsx");

      XLSX.writeFile(libro, nombreArchivo);
    } catch (err) {
      console.error("Error generando Excel:", err);
      alert("No se pudo generar el Excel. Intentá de nuevo.");
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
      title={pagosFiltrados.length === 0 ? "Seleccioná un rango primero" : "Descargar Excel del período"}
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
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 8l8 8M16 8l-8 8" />
          </svg>
          Excel
        </>
      )}
    </button>
  );
}
