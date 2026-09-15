"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

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
}

export function DescargarClientesExcel({ clientes, gimnasioNombre }: Props) {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    if (clientes.length === 0) {
      alert("No hay socios para exportar.");
      return;
    }
    setGenerando(true);
    try {
      const XLSX = await import("xlsx");

      const filas = clientes.map((c) => ({
        "Sistema": "SysGym",
        "Gimnasio": gimnasioNombre,
        "Socio": `${c.nombre} ${c.apellido}`.trim(),
        "DNI": c.dni || "",
        "Teléfono": c.telefono || "",
        "Plan": c.plan_nombre || "Sin plan",
        "Socio Desde": c.created_at ? new Date(c.created_at).toLocaleDateString("es-AR") : "",
        "Estado Cuota": c.estado_cuota === "al_dia" ? "Al día" : c.estado_cuota === "vencido" ? "Vencido" : "Pendiente",
      }));

      const hoja = XLSX.utils.json_to_sheet(filas);
      hoja["!cols"] = [
        { wch: 12 }, { wch: 20 }, { wch: 26 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 14 }
      ];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Socios");

      XLSX.writeFile(libro, `socios-${gimnasioNombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error generando Excel");
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
      <FileSpreadsheet className="size-3.5" />
      <span>Excel Socios</span>
    </button>
  );
}
