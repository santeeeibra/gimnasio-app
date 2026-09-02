"use client";

import { useState, useTransition } from "react";
import { ejerciciosSimilares } from "@/lib/rutina/motor";
import type { Ejercicio } from "@/lib/rutina/tipos";
import { editarItem, sustituirEjercicio } from "./actions";

export type ItemEditable = {
  id: string;
  series: number;
  repeticiones: string;
  nota: string;
  ejercicio: Ejercicio | null;
};

export type DiaEditable = {
  numero: number;
  titulo: string;
  items: ItemEditable[];
};

export function RutinaEditor({
  dias,
  ejercicios,
}: {
  dias: DiaEditable[];
  ejercicios: Ejercicio[];
}) {
  return (
    <div className="space-y-8">
      {dias.map((dia) => (
        <section key={dia.numero}>
          <h2 className="font-display text-lg mb-3">{dia.titulo}</h2>
          <ul className="border border-rule rounded-[6px] divide-y divide-rule bg-white">
            {dia.items.map((item) => (
              <ItemFila key={item.id} item={item} ejercicios={ejercicios} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ItemFila({
  item,
  ejercicios,
}: {
  item: ItemEditable;
  ejercicios: Ejercicio[];
}) {
  const [series, setSeries] = useState(String(item.series));
  const [reps, setReps] = useState(item.repeticiones);
  const [ej, setEj] = useState(item.ejercicio);
  const [abrirCambio, setAbrirCambio] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    series !== String(item.series) || reps.trim() !== item.repeticiones;

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 1800);
  }

  function guardar() {
    startTransition(async () => {
      const r = await editarItem(item.id, {
        series: Number(series) || item.series,
        repeticiones: reps,
        nota: item.nota,
      });
      flash(r.error ?? "Guardado ✓");
      if (!r.error) {
        item.series = Number(series) || item.series;
        item.repeticiones = reps.trim() || item.repeticiones;
      }
    });
  }

  function cambiar(nuevo: Ejercicio) {
    startTransition(async () => {
      const r = await sustituirEjercicio(item.id, nuevo.id);
      if (r.error) {
        flash(r.error);
        return;
      }
      setEj(nuevo);
      setAbrirCambio(false);
      flash("Ejercicio cambiado ✓");
    });
  }

  const alternativas = ej ? ejerciciosSimilares(ej, ejercicios, 6) : [];

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-tight">{ej?.nombre ?? "Ejercicio"}</p>
          {ej?.grupo_muscular ? (
            <span className="mt-1 inline-block text-[11px] uppercase tracking-wide text-ink-soft">
              {ej.grupo_muscular}
            </span>
          ) : null}
          {ej?.descripcion ? (
            <p className="mt-1 text-xs text-ink-soft">{ej.descripcion}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAbrirCambio((v) => !v)}
          className="shrink-0 text-xs text-ink-soft underline underline-offset-2 active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
        >
          {abrirCambio ? "Cerrar" : "No lo conozco"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-[11px] text-ink-soft mb-1">Series</span>
          <input
            inputMode="numeric"
            value={series}
            onChange={(e) => setSeries(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="h-11 w-16 px-2 text-center rounded-[5px] border border-rule bg-white text-[16px] outline-none focus:border-ink"
          />
        </label>
        <span className="pb-3 text-ink-soft">×</span>
        <label className="block">
          <span className="block text-[11px] text-ink-soft mb-1">Reps</span>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value.slice(0, 12))}
            className="h-11 w-24 px-3 rounded-[5px] border border-rule bg-white text-[16px] outline-none focus:border-ink"
          />
        </label>
        {dirty ? (
          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="h-11 px-3 rounded-[5px] bg-ink text-paper text-sm font-medium active:scale-[0.97] transition-transform duration-150 [transition-timing-function:var(--ease-out)] disabled:opacity-50"
          >
            {pending ? "…" : "Guardar"}
          </button>
        ) : null}
        {msg ? (
          <span className="pb-3 text-xs text-ok animate-fade-in">{msg}</span>
        ) : null}
      </div>

      {item.nota ? (
        <p className="mt-2 text-[11px] text-ink-soft">{item.nota}</p>
      ) : null}

      {abrirCambio ? (
        <div className="mt-3 rounded-[5px] border border-rule bg-paper-2 p-3 animate-fade-in">
          <p className="text-xs text-ink-soft mb-2">Cambiar por uno equivalente:</p>
          {alternativas.length === 0 ? (
            <p className="text-xs text-ink-soft">Sin alternativas para este grupo.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {alternativas.map((alt) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => cambiar(alt)}
                  disabled={pending}
                  className="h-9 px-3 rounded-[5px] border border-rule bg-white text-sm active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)] disabled:opacity-50"
                >
                  {alt.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}
