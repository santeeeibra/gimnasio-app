"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import type { ProgresoState } from "@/lib/progreso/actions";

/**
 * Input inline de progreso debajo de cada ejercicio.
 * 1-2 taps: placeholder = último peso → tocar guardar.
 * Reps colapsadas por default.
 */
export function MiniRegistroProgreso({
  ejercicioId,
  action,
  fetchUltimoPeso,
}: {
  ejercicioId: string;
  action: (prev: ProgresoState, fd: FormData) => Promise<ProgresoState>;
  fetchUltimoPeso: (eid: string) => Promise<{ peso: number; reps: number | null } | null>;
}) {
  const [mostrarReps, setMostrarReps] = useState(false);
  const [ultimoPeso, setUltimoPeso] = useState<number | null>(null);
  const [ultimasReps, setUltimasReps] = useState<number | null>(null);
  const [pesoInput, setPesoInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUltimoPeso(ejercicioId).then((r) => {
      if (r) {
        setUltimoPeso(r.peso);
        setUltimasReps(r.reps);
      }
    });
  }, [ejercicioId, fetchUltimoPeso]);

  const [state, formAction, pending] = useActionState(action, {});

  // Flash de confirmación
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      const pesoNum = Number(pesoInput);
      if (!isNaN(pesoNum) && pesoNum > 0) setUltimoPeso(pesoNum);
      setLocalMsg("✓");
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setLocalMsg(null), 2000);
    } else if (state.error) {
      setLocalMsg(state.error);
      if (msgTimer.current) clearTimeout(msgTimer.current);
      msgTimer.current = setTimeout(() => setLocalMsg(null), 3000);
    }
  }, [state]);

  const placeholder = ultimoPeso !== null ? `${ultimoPeso} kg` : "kg";

  return (
    <form action={formAction} className="mt-2.5">
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />

      <div className="flex items-center gap-1.5">
        {/* Label mínimo */}
        <span className="shrink-0 text-[10px] font-semibold text-ink-soft uppercase tracking-wider">
          Hoy:
        </span>

        {/* Input de peso */}
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="number"
            name="peso"
            step="0.5"
            min="0"
            max="9999"
            value={pesoInput}
            onChange={(e) => setPesoInput(e.target.value)}
            placeholder={placeholder}
            className="h-8 w-[68px] rounded-[8px] border border-rule bg-paper text-[14px] text-center outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_2px_rgb(22_24_29_/_0.06)] placeholder:text-ink-soft/60"
            required
          />
        </div>

        {/* Reps (opcional) */}
        {mostrarReps && (
          <input
            type="number"
            name="reps"
            step="1"
            min="1"
            max="999"
            defaultValue={ultimasReps ?? ""}
            placeholder="reps"
            className="h-8 w-[56px] rounded-[8px] border border-rule bg-paper text-[14px] text-center outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_2px_rgb(22_24_29_/_0.06)] placeholder:text-ink-soft/60"
          />
        )}

        {/* Botón guardar */}
        <button
          type="submit"
          disabled={pending}
          aria-label="Guardar progreso"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-accent text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          {pending ? (
            <Spinner />
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>

        {/* Toggle reps */}
        {!mostrarReps && (
          <button
            type="button"
            onClick={() => setMostrarReps(true)}
            className="text-[10px] font-medium text-ink-soft hover:text-ink transition-colors shrink-0"
            title="Agregar reps"
          >
            ＋reps
          </button>
        )}

        {/* Feedback */}
        {localMsg && (
          <span className={`text-[11px] font-medium animate-fade-in ${state.error ? "text-danger" : "text-ok"}`}>
            {localMsg}
          </span>
        )}
      </div>
    </form>
  );
}
