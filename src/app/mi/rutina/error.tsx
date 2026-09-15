"use client";

import { useEffect, useState } from "react";
import { leerCache, haceCuanto } from "@/lib/offline/cache";
import { Dumbbell } from "lucide-react";

type EjercicioItem = {
  id: string;
  series: number;
  repeticiones: string;
  nota?: string;
  ejercicio?: {
    nombre: string;
    grupo_muscular?: string;
    equipo?: string;
  } | null;
};

type DiaEditable = {
  numero: number;
  titulo: string;
  items: EjercicioItem[];
};

type RutinaCacheData = {
  dias: DiaEditable[];
  objetivo?: string;
  nivel?: string;
};

export default function MiRutinaError({ reset }: { error: Error; reset: () => void }) {
  const [cache, setCache] = useState<{
    data: RutinaCacheData;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    setCache(leerCache<RutinaCacheData>("rutina:mi"));
  }, []);

  return (
    <main className="mx-auto max-w-lg space-y-5 p-4 sm:p-6">
      <div className="rounded-[10px] border border-warn/40 bg-warn/5 p-4">
        <p className="text-[13px] font-semibold text-warn">
          Sin conexión a internet
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {cache
            ? `Mostrando tu rutina del día guardada en este dispositivo (${haceCuanto(cache.timestamp)}).`
            : "No hay una copia guardada de tu rutina en este dispositivo."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-[6px] border border-rule px-3 py-1.5 text-[13px] font-medium text-ink transition-[transform,background-color] duration-150 hover:bg-paper-2 active:scale-[0.97]"
        >
          Reintentar conexión
        </button>
      </div>

      {cache && cache.data.dias && cache.data.dias.length > 0 ? (
        <div className="space-y-6">
          {cache.data.dias.map((dia) => (
            <div key={dia.numero} className="rounded-[12px] border border-rule bg-paper-2 p-4">
              <h2 className="font-display text-lg font-bold text-ink mb-3">{dia.titulo}</h2>
              <div className="space-y-2.5 divide-y divide-rule/50">
                {dia.items.map((it, idx) => (
                  <div key={it.id || idx} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        <Dumbbell className="size-4 shrink-0 text-ink-soft" />
                        <span className="truncate">{it.ejercicio?.nombre ?? "Ejercicio"}</span>
                      </p>
                      {it.nota ? (
                        <p className="text-xs text-ink-soft mt-0.5">{it.nota}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-[6px] bg-paper px-2.5 py-1 text-xs font-mono font-medium text-ink border border-rule">
                      {it.series} x {it.repeticiones}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}
