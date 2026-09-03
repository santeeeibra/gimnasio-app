"use client";

import { useEffect, useState } from "react";
import { leerCache, haceCuanto } from "@/lib/offline/cache";

type CuotaCache = {
  nombre?: string;
  estado?: "al_dia" | "por_vencer" | "vencido";
  dias?: number | null;
  plan?: string | null;
  fechaVencimiento?: string | null;
};

const LABEL: Record<string, string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencido: "Vencida",
};

export default function MiError({ reset }: { error: Error; reset: () => void }) {
  const [cache, setCache] = useState<{
    data: CuotaCache;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    setCache(leerCache<CuotaCache>("cuota:mi"));
  }, []);

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="rounded-[10px] border border-warn/40 bg-warn/5 p-4">
        <p className="text-[13px] font-medium text-warn">
          No pudimos conectar con el servidor
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {cache
            ? "Te mostramos la última información guardada en este dispositivo."
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

      {cache ? (
        <div className="rounded-[10px] border border-rule bg-paper-2 p-5">
          <p className="mb-2 text-xs text-ink-soft">
            Tu cuota · actualizado {haceCuanto(cache.timestamp)}
          </p>
          <p className="font-display text-2xl leading-tight">
            {cache.data.estado ? LABEL[cache.data.estado] : "—"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {cache.data.plan ?? "Sin plan"}
            {cache.data.fechaVencimiento
              ? ` · vence ${cache.data.fechaVencimiento}`
              : ""}
          </p>
        </div>
      ) : null}
    </main>
  );
}
