"use client";

import { useMemo, useState, useEffect } from "react";
import { Lottie } from "lottie-react";
import { ClienteRow, type ClienteVista } from "./cliente-row";
import searchAnimationData from "../../../../public/Search.json";
import { hapticoImpactoSuave, hapticoSeleccion } from "@/lib/ui/hapticos";

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    return <p className="text-sm text-ink-soft">Todavía no hay clientes cargados.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Search Bar container with Lottie Animation */}
      <div className="relative flex items-center bg-paper-2 border border-rule rounded-[14px] px-3 transition-all focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10 shadow-sm overflow-hidden">
        {/* Lottie Animation Icon */}
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center -ml-1">
          {isMounted ? (
            <Lottie
              src={searchAnimationData}
              loop
              autoplay
              className="w-8 h-8 opacity-80"
            />
          ) : (
            <span className="text-lg">🔍</span>
          )}
        </div>

        {/* Input */}
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.length === 1) hapticoImpactoSuave();
          }}
          placeholder="Buscar cliente por nombre o DNI..."
          className="w-full h-12 bg-transparent text-[16px] text-ink placeholder:text-ink-soft outline-none px-2"
        />

        {/* Clear Button */}
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              hapticoSeleccion();
            }}
            className="flex-shrink-0 text-xs font-bold text-ink-soft hover:text-ink bg-rule/40 px-2.5 py-1 rounded-full transition-colors"
          >
            Limpiar ×
          </button>
        )}
      </div>

      {/* Quick Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setFiltroEstado("todos");
            hapticoSeleccion();
          }}
          className={`px-3 py-1.5 rounded-full border transition-all ${
            filtroEstado === "todos"
              ? "bg-ink text-paper border-ink font-bold shadow-sm"
              : "bg-paper-2 border-rule text-ink-soft hover:text-ink"
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
          className={`px-3 py-1.5 rounded-full border transition-all ${
            filtroEstado === "al_dia"
              ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm"
              : "bg-paper-2 border-rule text-ink-soft hover:text-emerald-500"
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
          className={`px-3 py-1.5 rounded-full border transition-all ${
            filtroEstado === "por_vencer"
              ? "bg-amber-500 text-black border-amber-500 font-bold shadow-sm"
              : "bg-paper-2 border-rule text-ink-soft hover:text-amber-500"
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
          className={`px-3 py-1.5 rounded-full border transition-all ${
            filtroEstado === "vencido"
              ? "bg-rose-600 text-white border-rose-600 font-bold shadow-sm"
              : "bg-paper-2 border-rule text-ink-soft hover:text-rose-500"
          }`}
        >
          Vencidos ({clientes.filter((c) => c.estado_cuota === "vencido").length})
        </button>
      </div>

      {/* Results Header */}
      {(filtroText || filtroEstado !== "todos") && (
        <div className="text-xs font-semibold text-ink-soft px-1 flex items-center justify-between">
          <span>Resultados encontrados: <strong className="text-ink">{clientesFiltrados.length}</strong> socios</span>
        </div>
      )}

      {/* Client List Rows */}
      {clientesFiltrados.length === 0 ? (
        <div className="py-8 text-center bg-paper-2 border border-rule rounded-[16px] p-4">
          <p className="text-sm font-semibold text-ink mb-1">Ningún socio coincide con los filtros</p>
          <p className="text-xs text-ink-soft">Probá borrando la búsqueda o cambiando de pestaña de filtro.</p>
        </div>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden shadow-sm">
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
