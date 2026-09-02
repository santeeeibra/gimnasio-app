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
import { chequearContraste, derivarPaleta, sugerirAjuste } from "@/lib/contraste";
import { TemaPreviewCompleto } from "./tema-preview-completo";
import { Radios } from "./radios";

/** Colores que elige el usuario; el resto se deriva de estos. */
const COLORES_BASE: (keyof Tema)[] = ["paper", "ink", "volt"];

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
  const [tabActivo, setTabActivo] = useState<"editor" | "preview">("editor");

  const set = <K extends keyof Tema>(key: K, value: Tema[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const resultado = chequearContraste(draft);

  // Reset del checkbox cuando cambia el draft
  useEffect(() => {
    setConfirmarBajoContraste(false);
  }, [draft]);

  return (
    <div>
      {/* Tabs móvil */}
      <div className="lg:hidden mb-4 flex border-b border-rule">
        <button
          type="button"
          onClick={() => setTabActivo("editor")}
          className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
            tabActivo === "editor"
              ? "border-b-2 border-volt text-ink"
              : "text-ink-soft"
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setTabActivo("preview")}
          className={`flex-1 py-3 text-sm font-medium transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
            tabActivo === "preview"
              ? "border-b-2 border-volt text-ink"
              : "text-ink-soft"
          }`}
        >
          Vista previa
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_500px]">
        <form action={formAction} className={`space-y-6 ${tabActivo === "preview" ? "hidden lg:block" : ""}`}>
          <input type="hidden" name="gimnasio_id" value={gimnasioId} />

          {/* Sección: Colores */}
          <Seccion titulo="Colores">
            <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft mb-3">
              Base — los elegís vos
            </span>
            <div className="grid sm:grid-cols-2 gap-4">
              {CAMPOS_COLOR.filter((c) => COLORES_BASE.includes(c.key)).map(
                ({ key, label, hint }) => (
                  <ColorPicker
                    key={key}
                    name={key}
                    label={label}
                    hint={hint}
                    value={draft[key]}
                    onChange={(v) => set(key, v)}
                  />
                ),
              )}
            </div>

            <div className="mt-5 border-t border-rule pt-4">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                  Derivados
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      ...derivarPaleta({
                        paper: d.paper,
                        ink: d.ink,
                        volt: d.volt,
                      }),
                    }))
                  }
                  className="text-xs underline underline-offset-2 text-ink-soft hover:text-ink active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
                >
                  Calcular desde la base
                </button>
              </div>
              <p className="text-xs text-ink-soft mb-3">
                Fondo de tarjetas, texto secundario, bordes y texto sobre el
                acento. &laquo;Calcular&raquo; los recalcula a partir del fondo,
                el texto principal y el acento; después podés retocarlos a mano.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {CAMPOS_COLOR.filter(
                  (c) => !COLORES_BASE.includes(c.key),
                ).map(({ key, label, hint }) => (
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
            </div>
          </Seccion>

          {/* Sección: Tipografía */}
          <Seccion titulo="Tipografía">
            <label className="block">
              <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Familia tipográfica
              </span>
              <select
                name="fuente"
                value={draft.fuente}
                onChange={(e) => set("fuente", e.target.value as FuenteKey)}
                className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)]"
              >
                {Object.entries(FUENTES).map(([key, f]) => (
                  <option key={key} value={key}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Tamaño de fuente base
              </span>
              <select
                name="escalaFuente"
                value={draft.escalaFuente}
                onChange={(e) => set("escalaFuente", parseFloat(e.target.value))}
                className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)]"
              >
                <option value="0.875">Pequeña (87.5%)</option>
                <option value="1">Normal (100%)</option>
                <option value="1.125">Grande (112.5%)</option>
                <option value="1.25">Muy grande (125%)</option>
              </select>
            </label>
          </Seccion>

          {/* Sección: Bordes y espaciado */}
          <Seccion titulo="Bordes y espaciado">
            <Radios
              label="Redondeo de bordes"
              name="radiosBordes"
              value={draft.radiosBordes}
              options={[
                { value: "tight", label: "Ajustado", hint: "3-6px" },
                { value: "normal", label: "Normal", hint: "5-8px" },
                { value: "soft", label: "Suave", hint: "6-10px" },
              ]}
              onChange={(v) => set("radiosBordes", v as Tema["radiosBordes"])}
            />

            <Radios
              label="Espaciado"
              name="espaciado"
              value={draft.espaciado}
              options={[
                { value: "compact", label: "Compacto", hint: "87.5%" },
                { value: "normal", label: "Normal", hint: "100%" },
                { value: "spacious", label: "Amplio", hint: "125%" },
              ]}
              onChange={(v) => set("espaciado", v as Tema["espaciado"])}
            />
          </Seccion>

          {/* Sección: Navegación */}
          <Seccion titulo="Navegación">
            <Radios
              label="Navegación móvil"
              name="navegacionMovil"
              value={draft.navegacionMovil}
              options={[
                { value: "bottom", label: "Barra inferior", hint: "Fija abajo (recomendado)" },
                { value: "top", label: "Barra superior", hint: "Fija arriba" },
                { value: "sidebar", label: "Menú lateral", hint: "Deslizable" },
              ]}
              onChange={(v) => set("navegacionMovil", v as Tema["navegacionMovil"])}
            />

            <Radios
              label="Navegación desktop"
              name="navegacionDesktop"
              value={draft.navegacionDesktop}
              options={[
                { value: "sidebar", label: "Sidebar izquierdo", hint: "Layout clásico" },
                { value: "top", label: "Barra superior", hint: "Horizontal" },
              ]}
              onChange={(v) => set("navegacionDesktop", v as Tema["navegacionDesktop"])}
            />
          </Seccion>

          {/* Sección: Densidad */}
          <Seccion titulo="Densidad de información">
            <Radios
              name="densidad"
              value={draft.densidad}
              options={[
                { value: "compact", label: "Compacta", hint: "Más datos, menos espacio" },
                { value: "comfortable", label: "Cómoda", hint: "Balance ideal" },
                { value: "spacious", label: "Espaciosa", hint: "Máximo respiro visual" },
              ]}
              onChange={(v) => set("densidad", v as Tema["densidad"])}
            />
          </Seccion>

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

      <div className={`${tabActivo === "editor" ? "hidden lg:block" : ""} lg:sticky lg:top-4 self-start`}>
        <TemaPreviewCompleto tema={draft} />
      </div>
    </div>
  </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft">
        {titulo}
      </span>
      {children}
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

