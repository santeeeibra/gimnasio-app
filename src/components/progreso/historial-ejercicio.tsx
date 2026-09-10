"use client";

import { useState, useRef } from "react";
import { GraficoProgreso } from "./grafico-progreso";
import type { RegistroProgreso } from "@/lib/progreso/actions";

/** Panel colapsado que muestra el historial de un ejercicio con gráfico y sugerencias 1RM. */
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

  // Motor Científico: Calcular sobrecarga en base al último entreno
  let sugerencia = null;
  let rmEstimado = null;
  if (registros.length > 0) {
    const ultimo = registros[0];
    if (ultimo.peso > 0 && ultimo.reps && ultimo.reps > 0) {
      // Fórmula de Epley
      rmEstimado = Math.round(ultimo.peso * (1 + ultimo.reps / 30));
      
      // Sugerencia: +2.5kg (Microcarga)
      const sigPeso = ultimo.peso + 2.5;
      const sigReps = Math.max(1, ultimo.reps - 2); // Baja reps levemente al subir peso
      
      sugerencia = (
        <div className="mb-3 rounded-[10px] bg-accent/10 p-2.5 text-xs text-accent">
          <div className="font-semibold mb-0.5 flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m13 2-2 2.5h3L11 12h3l-2 2.5" />
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
            </svg>
            Sobrecarga Progresiva
          </div>
          Última vez lograste {ultimo.peso}kg × {ultimo.reps} reps. 
          Hoy intentá <strong className="font-bold">{sigPeso}kg × {sigReps}-{sigReps+2} reps</strong> para estimular hipertrofia.
        </div>
      );
    }
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
            <div className="flex h-[110px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-accent" />
            </div>
          ) : registros.length === 0 ? (
            <p className="text-xs text-ink-soft">
              Aún no hay registros para este ejercicio.
            </p>
          ) : (
            <>
              {sugerencia}
              <GraficoProgreso registros={registros} />
              {rmEstimado && (
                <div className="text-center text-[10px] text-ink-soft mt-1">
                  Tu 1RM estimado actual es de <strong className="text-ink">{rmEstimado}kg</strong>
                </div>
              )}
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
