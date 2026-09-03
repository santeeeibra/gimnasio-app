"use client";

import { useEffect, useState } from "react";
import { leerCache, haceCuanto } from "@/lib/offline/cache";

type FilaCache = {
  nombre: string;
  dni: string | null;
  estado_cuota: "al_dia" | "por_vencer" | "vencido";
  fecha_vencimiento: string | null;
  plan: string | null;
};

const TONO: Record<string, string> = {
  al_dia: "text-ink-soft",
  por_vencer: "text-ink",
  vencido: "text-danger",
};

export default function ClientesError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const [cache, setCache] = useState<{
    data: FilaCache[];
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    setCache(leerCache<FilaCache[]>("clientes:lista"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[10px] border border-warn/40 bg-warn/5 p-4">
        <p className="text-[13px] font-medium text-warn">
          No pudimos conectar con el servidor
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {cache
            ? "Esta es la última lista guardada en este dispositivo. No podés dar de alta ni editar hasta que vuelva la conexión."
            : "Probá de nuevo en un momento."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-[5px] border border-rule px-3 py-1.5 text-[13px] font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.97]"
        >
          Reintentar
        </button>
      </div>

      {cache && cache.data.length > 0 ? (
        <div>
          <p className="mb-2 text-xs text-ink-soft">
            {cache.data.length} socios · actualizado {haceCuanto(cache.timestamp)}
          </p>
          <ul className="card-cut divide-y divide-rule overflow-hidden border border-rule bg-paper-2">
            {cache.data.map((c, i) => (
              <li
                key={`${c.dni ?? "s"}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm">
                  {c.nombre}
                  {c.dni ? (
                    <span className="text-ink-soft"> · {c.dni}</span>
                  ) : null}
                </span>
                <span
                  className={`shrink-0 text-xs ${TONO[c.estado_cuota] ?? "text-ink-soft"}`}
                >
                  {c.fecha_vencimiento ?? "sin cuota"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
