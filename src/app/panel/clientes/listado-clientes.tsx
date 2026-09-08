"use client";

import { useMemo, useState } from "react";
import { ClienteRow, type ClienteVista } from "./cliente-row";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function ListadoClientes({
  clientes,
  idsConIngreso,
}: {
  clientes: ClienteVista[];
  idsConIngreso: string[];
}) {
  const [q, setQ] = useState("");
  const conIngreso = useMemo(() => new Set(idsConIngreso), [idsConIngreso]);

  const filtro = norm(q.trim());
  const clientesFiltrados = filtro
    ? clientes.filter((c) => {
        const nombre = norm(c.profile?.nombre ?? "");
        const dni = c.profile?.dni ?? "";
        return nombre.includes(filtro) || dni.includes(filtro);
      })
    : clientes;

  if (clientes.length === 0) {
    return <p className="text-sm text-ink-soft">Todavía no hay clientes cargados.</p>;
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o DNI…"
        className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
      />

      {filtro && clientesFiltrados.length === 0 ? (
        <p className="text-sm text-ink-soft">Ningún cliente coincide con esa búsqueda.</p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
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
