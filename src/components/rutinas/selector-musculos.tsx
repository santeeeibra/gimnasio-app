"use client";

import { hapticoSeleccion } from "@/lib/ui/hapticos";

export type OpcionMusculo = { value: string; label: string };

/** Shared quick selector: filters a list or selects optional routine emphasis. */
export function SelectorMusculos({
  opciones, seleccionados, onToggle, label = "Músculos", todos = false, max, name,
}: {
  opciones: OpcionMusculo[];
  seleccionados: string[];
  onToggle: (value: string) => void;
  label?: string;
  todos?: boolean;
  max?: number;
  name?: string;
}) {
  const choices = todos ? [{ value: "", label: "Todos" }, ...opciones] : opciones;
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-xs font-semibold text-ink">
        {label}{max ? <> <span className="ml-1 font-normal text-ink-soft">(hasta {max})</span></> : null}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {choices.map(({ value, label: texto }) => {
          const active = value ? seleccionados.includes(value) : seleccionados.length === 0;
          const disabled = Boolean(max && !active && seleccionados.length >= max);
          return (
            <button key={value} type="button" aria-pressed={active} disabled={disabled}
              onClick={() => { hapticoSeleccion(); onToggle(value); }}
              className={`min-h-11 rounded-[10px] border px-3 text-xs font-medium transition-transform active:scale-[0.97] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "border-accent bg-accent text-accent-contrast" : "border-rule bg-paper text-ink-soft"}`}
            >{texto}</button>
          );
        })}
      </div>
      {name ? seleccionados.map(value => <input key={value} type="hidden" name={name} value={value} />) : null}
    </fieldset>
  );
}
