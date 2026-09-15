"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

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
  gimnasioNombre: string;
}

export function DescargarCajaExcel({ movimientos, gimnasioNombre }: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    try {
      const XLSX = await import("xlsx");

      const filas = movimientos.map((m) => ({
        "Sistema": "SysGym",
        "Gimnasio": gimnasioNombre,
        "Hora": new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        "Tipo": m.tipo === "ingreso" ? "Ingreso" : "Egreso",
        "Concepto": m.concepto,
        "Método": m.metodo_pago || "Efectivo",
        "Monto": m.tipo === "egreso" ? -m.monto : m.monto,
      }));

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja["!cols"] = [
        { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }
      ];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Caja Diaria");

      XLSX.writeFile(libro, `caja-${gimnasioNombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error generando Excel de caja");
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
      <FileSpreadsheet className="size-3.5" />
      <span>Excel Caja</span>
    </button>
  );
}
