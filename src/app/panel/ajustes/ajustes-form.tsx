"use client";

import { useActionState, useEffect, useState } from "react";
import { actualizarTema, type AjustesState } from "./actions";
import { Button } from "@/components/ui";
import {
  CAMPOS_COLOR,
  DEFAULT_TEMA,
  FUENTES,
  type FuenteKey,
  type Tema,
} from "@/lib/tema";
import { chequearContraste, sugerirAjuste } from "@/lib/contraste";
import { TemaPreview } from "./tema-preview";

export function AjustesForm({
  gimnasioId,
  tema,
}: {
  gimnasioId: string;
  tema: Tema;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarTema,
    {},
  );

  const [draft, setDraft] = useState<Tema>(tema);
  const [confirmarBajoContraste, setConfirmarBajoContraste] = useState(false);

  const set = <K extends keyof Tema>(key: K, value: Tema[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const resultado = chequearContraste(draft);

  // Reset del checkbox cuando cambia el draft
  useEffect(() => {
    setConfirmarBajoContraste(false);
  }, [draft]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="gimnasio_id" value={gimnasioId} />

        <label className="block">
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Tipografía
          </span>
          <select
            name="fuente"
            value={draft.fuente}
            onChange={(e) => set("fuente", e.target.value as FuenteKey)}
            className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink"
          >
            {Object.entries(FUENTES).map(([key, f]) => (
              <option key={key} value={key}>
                {f.label} — {f.hint}
              </option>
            ))}
          </select>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          {CAMPOS_COLOR.map(({ key, label, hint }) => (
            <ColorPicker
              key={key}
              name={key}
              label={label}
              hint={hint}
              value={draft[key]}
              onChange={(v) => set(key, v)}
            />
          ))}
        </div>

        {/* Legibilidad */}
        {resultado.hayFallos ? (
          <div className="border-t border-rule pt-5 mt-5">
            <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-3">
              Legibilidad
            </span>

            <div className="divide-y divide-rule animate-error">
              {resultado.pares
                .filter((p) => !p.ok)
                .map((par, i) => (
                  <div key={i} className="py-2.5 flex items-center gap-3">
                    {/* Swatches visuales */}
                    <div className="flex shrink-0">
                      <div
                        className="size-4 rounded-l-[3px] border border-rule"
                        style={{ backgroundColor: draft[par.a] }}
                      />
                      <div
                        className="size-4 rounded-r-[3px] border border-rule border-l-0"
                        style={{ backgroundColor: draft[par.b] }}
                      />
                    </div>

                    {/* Label */}
                    <span className="text-sm text-ink flex-1 min-w-0 truncate">
                      {par.label}
                    </span>

                    {/* Ratio */}
                    <span className="text-sm font-mono tabular-nums text-warn shrink-0">
                      {par.ratio.toFixed(1)}:1
                    </span>

                    {/* Botón sugerir */}
                    <button
                      type="button"
                      onClick={() => {
                        const sugerido = sugerirAjuste(
                          draft[par.b],
                          draft[par.a],
                          par.umbral,
                        );
                        set(par.a, sugerido);
                      }}
                      className="text-xs underline underline-offset-2 text-ink-soft hover:text-ink active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)] shrink-0"
                    >
                      Sugerir
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}

        <div className="space-y-4">
          {/* Checkbox de confirmación */}
          {resultado.hayFallos ? (
            <label className="flex items-start gap-3 cursor-pointer group active:scale-[0.99] transition-transform duration-150 [transition-timing-function:var(--ease-out)]">
              <div className="relative size-[18px] shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={confirmarBajoContraste}
                  onChange={(e) => setConfirmarBajoContraste(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="size-[18px] rounded-[4px] border border-rule peer-checked:bg-ink peer-checked:border-ink transition-colors duration-150 [transition-timing-function:var(--ease-out)]" />
                {confirmarBajoContraste ? (
                  <svg
                    className="absolute inset-0 m-auto size-3 text-paper pointer-events-none"
                    fill="none"
                    viewBox="0 0 12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                ) : null}
              </div>
              <span className="text-sm text-ink-soft">
                Entiendo que algunas combinaciones pueden costar leerse y quiero
                guardar igual
              </span>
            </label>
          ) : null}

          {confirmarBajoContraste && resultado.hayFallos ? (
            <input type="hidden" name="confirmar_contraste" value="1" />
          ) : null}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={
                pending || (resultado.hayFallos && !confirmarBajoContraste)
              }
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(DEFAULT_TEMA)}
            >
              Restablecer
            </Button>
          </div>
        </div>
      </form>

      <div className="lg:sticky lg:top-6 self-start">
        <TemaPreview tema={draft} />
      </div>
    </div>
  );
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

function ColorPicker({
  name,
  label,
  hint,
  value,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 shrink-0 rounded-[5px] border border-rule cursor-pointer"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            if (HEX.test(v)) onChange(v);
          }}
          onBlur={() => setText(value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          placeholder="#000000"
          className="min-w-0 flex-1 h-10 px-2.5 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink font-mono"
        />
      </div>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

