"use client";

import { useState, useEffect, useActionState, useRef } from "react";
import { Spinner } from "@/components/ui";
import { GraficoProgreso } from "./grafico-progreso";
import type { RegistroProgreso } from "@/lib/progreso/actions";
import type { ProgresoState } from "@/lib/progreso/actions";

/** Panel colapsado que muestra el historial de un ejercicio con gráfico. */
export function HistorialEjercicio({
  ejercicioNombre,
  fetchHistorial,
}: {
  ejercicioNombre: string;
  fetchHistorial: () => Promise<RegistroProgreso[]>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [registros, setRegistros] = useState<RegistroProgreso[]>([]);
  const [cargando, setCargando] = useState(false);
  const cargadoRef = useRef(false);

  async function cargar() {
    if (cargadoRef.current) return;
    cargadoRef.current = true;
    setCargando(true);
    const data = await fetchHistorial();
    setRegistros(data);
    setCargando(false);
  }

  function toggle() {
    const nuevoEstado = !abierto;
    setAbierto(nuevoEstado);
    if (nuevoEstado) cargar();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={abierto}
        aria-label={abierto ? "Cerrar progreso" : `Ver progreso de ${ejercicioNombre}`}
        className="inline-flex items-center gap-1 rounded-[8px] border border-rule px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 hover:text-ink"
      >
        {/* Ícono de trending up */}
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <span className={abierto ? "hidden" : ""}>Ver progreso</span>
        <span className={abierto ? "" : "hidden"}>Cerrar</span>
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={`transition-transform duration-150 ${abierto ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="mt-2 rounded-[12px] border border-rule bg-paper p-3 animate-fade-in space-y-2">
          {cargando ? (
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <Spinner /> Cargando historial…
            </div>
          ) : registros.length === 0 ? (
            <p className="text-xs text-ink-soft">
              Aún no hay registros para este ejercicio.
            </p>
          ) : (
            <>
              <GraficoProgreso registros={registros} />
              <ul className="divide-y divide-rule text-[11px]">
                {registros.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-1.5">
                    <span className="text-ink-soft">
                      {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </span>
                    <span className="font-bold text-ink" style={{ fontFamily: "var(--font-hero)" }}>
                      {r.peso} kg
                      {r.reps ? <span className="font-normal text-ink-soft"> × {r.reps} reps</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
