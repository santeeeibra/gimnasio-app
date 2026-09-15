"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ClienteRow, type ClienteVista } from "./cliente-row";
import { hapticoImpactoSuave, hapticoSeleccion } from "@/lib/ui/hapticos";
import { PulpoCard } from "@/components/mascota/pulpo";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

type FiltroEstado = "todos" | "al_dia" | "por_vencer" | "vencido";

export function ListadoClientes({
  clientes,
  idsConIngreso,
}: {
  clientes: ClienteVista[];
  idsConIngreso: string[];
}) {
  const [q, setQ] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");

  const conIngreso = useMemo(() => new Set(idsConIngreso), [idsConIngreso]);

  const filtroText = norm(q.trim());

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      // 1. Filtro por texto (Nombre o DNI)
      if (filtroText) {
        const nombre = norm(c.profile?.nombre ?? "");
        const dni = c.profile?.dni ?? "";
        if (!nombre.includes(filtroText) && !dni.includes(filtroText)) {
          return false;
        }
      }

      // 2. Filtro por estado de cuota
      if (filtroEstado === "al_dia") return c.estado_cuota === "al_dia";
      if (filtroEstado === "por_vencer") return c.estado_cuota === "por_vencer";
      if (filtroEstado === "vencido") return c.estado_cuota === "vencido";

      return true;
    });
  }, [clientes, filtroText, filtroEstado]);

  if (clientes.length === 0) {
    return <p className="text-sm text-neutral-400">Todavía no hay clientes cargados.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Sleek Pill Search Bar (Estilo iOS / Apple HIG - Imagen 2) */}
      <div className="group relative flex items-center bg-[#18181c] border border-white/15 focus-within:border-[#c8ff00] focus-within:ring-2 focus-within:ring-[#c8ff00]/25 rounded-full px-4 h-12 shadow-lg transition-all duration-200">
        {/* Animated Search Icon */}
        <Search className="w-5 h-5 text-neutral-400 group-focus-within:text-[#c8ff00] group-focus-within:scale-110 transition-all duration-200 flex-shrink-0" />

        {/* Input */}
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.length === 1) hapticoImpactoSuave();
          }}
          placeholder="Buscar cliente por nombre o DNI..."
          className="w-full h-full bg-transparent text-sm sm:text-base font-medium text-white placeholder:text-neutral-400 outline-none px-3"
        />

        {/* Clear Button */}
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              hapticoSeleccion();
            }}
            className="flex-shrink-0 p-1.5 rounded-full bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 transition-all active:scale-95"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Filter Badges (Pills redondeadas) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs sm:text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setFiltroEstado("todos");
            hapticoSeleccion();
          }}
          className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
            filtroEstado === "todos"
              ? "bg-[#c8ff00] text-black border-[#c8ff00] font-extrabold shadow-[0_0_15px_rgba(200,255,0,0.25)]"
              : "bg-[#18181c] border-white/10 text-neutral-400 hover:text-white hover:border-white/20"
          }`}
        >
          Todos ({clientes.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setFiltroEstado("al_dia");
            hapticoSeleccion();
          }}
          className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
            filtroEstado === "al_dia"
              ? "bg-emerald-500 text-black border-emerald-500 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              : "bg-[#18181c] border-white/10 text-neutral-400 hover:text-emerald-400 hover:border-emerald-500/30"
          }`}
        >
          Al día ({clientes.filter((c) => c.estado_cuota === "al_dia").length})
        </button>

        <button
          type="button"
          onClick={() => {
            setFiltroEstado("por_vencer");
            hapticoSeleccion();
          }}
          className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
            filtroEstado === "por_vencer"
              ? "bg-amber-400 text-black border-amber-400 font-extrabold shadow-[0_0_15px_rgba(251,191,36,0.25)]"
              : "bg-[#18181c] border-white/10 text-neutral-400 hover:text-amber-400 hover:border-amber-400/30"
          }`}
        >
          Por vencer ({clientes.filter((c) => c.estado_cuota === "por_vencer").length})
        </button>

        <button
          type="button"
          onClick={() => {
            setFiltroEstado("vencido");
            hapticoSeleccion();
          }}
          className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
            filtroEstado === "vencido"
              ? "bg-rose-500 text-white border-rose-500 font-extrabold shadow-[0_0_15px_rgba(244,63,94,0.25)]"
              : "bg-[#18181c] border-white/10 text-neutral-400 hover:text-rose-400 hover:border-rose-500/30"
          }`}
        >
          Vencidos ({clientes.filter((c) => c.estado_cuota === "vencido").length})
        </button>
      </div>

      {/* Results Subtitle */}
      {(filtroText || filtroEstado !== "todos") && (
        <div className="text-xs font-semibold text-neutral-400 px-2 flex items-center justify-between">
          <span>Resultados: <strong className="text-[#c8ff00]">{clientesFiltrados.length}</strong> socios</span>
        </div>
      )}

      {/* Client List Rows */}
      {clientesFiltrados.length === 0 ? (
        <div className="py-10 text-center bg-[#141416] border border-white/10 rounded-[20px] p-6 flex flex-col items-center justify-center gap-3">
          <PulpoCard pose="vacio" size={72} />
          <div>
            <p className="text-sm font-bold text-white mb-1">Ningún socio coincide con los filtros</p>
            <p className="text-xs text-neutral-400">Probá borrando la búsqueda o seleccionando "Todos".</p>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => (
            <ClienteRow
              key={c.id}
              cliente={c}
              pruebaVencida={!!c.en_prueba && conIngreso.has(c.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
