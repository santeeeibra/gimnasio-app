"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { actualizarTema, type AjustesState } from "./actions";
import { Button, linkClasses } from "@/components/ui";
import {
  CAMPOS_COLOR,
  DEFAULT_TEMA,
  ESTILOS_VISUALES,
  ESTILOS_VISUALES_KEYS,
  FUENTES,
  PRESETS_TEMA,
  polaridadTema,
  resolverMotion,
  temaToVars,
  type ColorKey,
  type EstiloVisual,
  type FuenteKey,
  type PresetTema,
  type Tema,
} from "@/lib/tema";
import {
  chequearBloqueos,
  chequearContraste,
  derivarPaleta,
  sugerirAjuste,
} from "@/lib/contraste";
import { TemaPreviewCompleto } from "./tema-preview-completo";
import { Radios } from "./radios";
import { LogoUploader } from "./logo-uploader";
import { paletasDesdeColor } from "@/lib/logo/paleta";

/** Colores que elige el usuario; el resto se deriva de estos. */
const COLORES_BASE: ColorKey[] = ["paper", "ink", "volt"];
const CLAVES_COLOR = CAMPOS_COLOR.map((c) => c.key);

export function AjustesForm({
  gimnasioId,
  tema,
  logoUrl: logoUrlInicial,
}: {
  gimnasioId: string;
  tema: Tema;
  logoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarTema,
    {},
  );

  const [draft, setDraft] = useState<Tema>(tema);
  const [confirmarBajoContraste, setConfirmarBajoContraste] = useState(false);
  const [personalizarAbierto, setPersonalizarAbierto] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(logoUrlInicial);
  const [colorLogo, setColorLogo] = useState<string | null>(null);

  const paletasLogo = useMemo(
    () => (colorLogo ? paletasDesdeColor(colorLogo) : []),
    [colorLogo],
  );

  const set = <K extends keyof Tema>(key: K, value: Tema[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const aplicarPreset = (p: PresetTema) =>
    setDraft((d) => ({ ...d, ...p.colores }));

  // Elegir estilo visual también aplica su paleta base y su tipografía
  // sugerida (el dueño puede retocar todo después).
  const aplicarEstiloVisual = (v: EstiloVisual) =>
    setDraft((d) => {
      const e = ESTILOS_VISUALES[v];
      return {
        ...d,
        estiloVisual: v,
        ...e.colores,
        ...(e.fuente ? { fuente: e.fuente } : {}),
      };
    });

  const presetActivo = (p: PresetTema) =>
    CLAVES_COLOR.every(
      (k) => draft[k].toLowerCase() === p.colores[k].toLowerCase(),
    );

  const resultado = chequearContraste(draft);
  const bloqueos = chequearBloqueos(draft);

  // Reset del checkbox cuando cambia el draft
  useEffect(() => {
    setConfirmarBajoContraste(false);
  }, [draft]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_460px]">
      <form action={formAction} className="min-w-0 space-y-6">
        <input type="hidden" name="gimnasio_id" value={gimnasioId} />

        {/* Vista previa compacta, pegada a los controles en móvil */}
        <div className="lg:hidden sticky top-0 z-10 -mx-6 -mt-6 border-b border-rule bg-paper-2 px-6 pb-3 pt-4">
          <MiniPreview tema={draft} />
        </div>

        {/* Logo del gimnasio + paletas derivadas de su color */}
        <div className="space-y-4">
          <LogoUploader
            gimnasioId={gimnasioId}
            logoUrl={logoUrl}
            onLogo={setLogoUrl}
            onColor={setColorLogo}
          />

          {paletasLogo.length > 0 ? (
            <div className="space-y-3 border-t border-rule pt-4">
              <div>
                <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                  Sugeridas por tu logo
                </span>
                <p className="mt-1 text-xs text-ink-soft">
                  Derivadas del color dominante. Elegí una y guardá.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {paletasLogo.map((p) => (
                  <PaletaChip
                    key={p.key}
                    preset={p}
                    activo={presetActivo(p)}
                    onClick={() => aplicarPreset(p)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Estilo visual: elección de cabecera, separada de los colores */}
        <div className="space-y-3">
          <div>
            <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              Estilo visual
            </span>
            <p className="mt-1 text-xs text-ink-soft">
              Cambia el aire de la app: cada estilo trae su paleta, su
              tipografía y su textura de fondo. Un tap y listo; después podés
              retocar los colores.
            </p>
          </div>
          <Radios
            name="estiloVisual"
            value={draft.estiloVisual}
            options={ESTILOS_VISUALES_KEYS.map((k) => ({
              value: k,
              label: ESTILOS_VISUALES[k].label,
              hint: ESTILOS_VISUALES[k].hint,
            }))}
            onChange={(v) => aplicarEstiloVisual(v as EstiloVisual)}
          />
        </div>

        {/* Paletas prearmadas: el camino de un solo tap */}
        <div className="space-y-3">
          <div>
            <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              Paletas
            </span>
            <p className="mt-1 text-xs text-ink-soft">
              Elegí una y guardá. Todas están probadas para que se lean bien.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {PRESETS_TEMA.map((p) => (
              <PaletaChip
                key={p.key}
                preset={p}
                activo={presetActivo(p)}
                onClick={() => aplicarPreset(p)}
              />
            ))}
          </div>
        </div>

        {/* Ajuste fino: plegado por defecto */}
        <div className="border-t border-rule pt-4">
          <button
            type="button"
            aria-expanded={personalizarAbierto}
            onClick={() => setPersonalizarAbierto((v) => !v)}
            className="flex w-full items-center justify-between gap-2 py-1 text-left active:scale-[0.99] transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
          >
            <span>
              <span className="block text-sm font-medium text-ink">
                Personalizar a mano
              </span>
              <span className="block text-xs text-ink-soft">
                Colores sueltos, tipografía, bordes, navegación y densidad
              </span>
            </span>
            <svg
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
              style={{
                transform: personalizarAbierto ? "rotate(90deg)" : "none",
              }}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="6,3 11,8 6,13" />
            </svg>
          </button>

          <div className={personalizarAbierto ? "mt-5 space-y-6" : "hidden"}>
            {/* Sección: Colores */}
            <Seccion titulo="Colores">
              <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft mb-3">
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
                  <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
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
                    className={`text-xs ${linkClasses.accion}`}
                  >
                    Calcular desde la base
                  </button>
                </div>
                <p className="text-xs text-ink-soft mb-3">
                  Fondo de tarjetas, texto secundario, bordes y texto sobre el
                  acento. &laquo;Calcular&raquo; los recalcula a partir del
                  fondo, el texto principal y el acento; después podés
                  retocarlos a mano.
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
                  className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)]"
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
                  onChange={(e) =>
                    set("escalaFuente", parseFloat(e.target.value))
                  }
                  className="w-full h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)]"
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
                  {
                    value: "bottom",
                    label: "Barra inferior",
                    hint: "Fija abajo (recomendado)",
                  },
                  { value: "top", label: "Barra superior", hint: "Fija arriba" },
                  { value: "sidebar", label: "Menú lateral", hint: "Deslizable" },
                ]}
                onChange={(v) =>
                  set("navegacionMovil", v as Tema["navegacionMovil"])
                }
              />

              <Radios
                label="Navegación desktop"
                name="navegacionDesktop"
                value={draft.navegacionDesktop}
                options={[
                  {
                    value: "sidebar",
                    label: "Sidebar izquierdo",
                    hint: "Layout clásico",
                  },
                  { value: "top", label: "Barra superior", hint: "Horizontal" },
                ]}
                onChange={(v) =>
                  set("navegacionDesktop", v as Tema["navegacionDesktop"])
                }
              />
            </Seccion>

            {/* Sección: Densidad */}
            <Seccion titulo="Densidad de información">
              <Radios
                name="densidad"
                value={draft.densidad}
                options={[
                  {
                    value: "compact",
                    label: "Compacta",
                    hint: "Más datos, menos espacio",
                  },
                  {
                    value: "comfortable",
                    label: "Cómoda",
                    hint: "Balance ideal",
                  },
                  {
                    value: "spacious",
                    label: "Espaciosa",
                    hint: "Máximo respiro visual",
                  },
                ]}
                onChange={(v) => set("densidad", v as Tema["densidad"])}
              />
            </Seccion>
          </div>
        </div>

        {/* Nota: los controles de "Personalizar a mano" quedan montados aunque el
            panel esté plegado (sólo se ocultan con `hidden`), así el formulario
            siempre envía fuente, colores, navegación y densidad. */}

        {/* Bloqueos: no se pueden guardar */}
        {bloqueos.bloqueado ? (
          <div className="border-t border-rule pt-5">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-danger mb-3">
              No se puede guardar
            </span>
            <ul className="space-y-1.5 animate-error">
              {bloqueos.motivos.map((m, i) => (
                <li key={i} className="text-sm text-danger">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Legibilidad */}
        {resultado.hayFallos ? (
          <div className="border-t border-rule pt-5">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft mb-3">
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
                        setPersonalizarAbierto(true);
                      }}
                      className={`shrink-0 text-xs ${linkClasses.accion}`}
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
          {resultado.hayFallos && !bloqueos.bloqueado ? (
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
              loading={pending}
              disabled={
                bloqueos.bloqueado ||
                (resultado.hayFallos && !confirmarBajoContraste)
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

      <div className="hidden lg:block lg:sticky lg:top-4 self-start">
        <TemaPreviewCompleto tema={draft} />
      </div>
    </div>
  );
}

/** Chip de paleta: swatch + nombre. Mismo diseño para prearmadas y sugeridas. */
function PaletaChip({
  preset,
  activo,
  onClick,
}: {
  preset: PresetTema;
  activo: boolean;
  onClick: () => void;
}) {
  const c = preset.colores;
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className="group rounded-[6px] border bg-paper text-left transition-[transform,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      style={{
        borderColor: activo ? "var(--ink)" : "var(--rule)",
        borderWidth: activo ? 2 : 1,
        padding: activo ? 7 : 8,
      }}
    >
      <span
        className="flex h-11 items-center gap-1.5 overflow-hidden rounded-[4px] border px-2"
        style={{ background: c.paper, borderColor: c.rule }}
      >
        <span
          className="h-5 flex-1 rounded-[3px]"
          style={{ background: c.ink }}
        />
        <span
          className="size-5 shrink-0 rounded-full"
          style={{ background: c.volt }}
        />
        <span
          className="h-5 w-2.5 shrink-0 rounded-[3px] border"
          style={{ background: c.paper2, borderColor: c.rule }}
        />
      </span>
      <span className="mt-1.5 block text-[13px] font-medium text-ink">
        {preset.label}
      </span>
      <span className="block text-[11px] text-ink-soft">{preset.hint}</span>
    </button>
  );
}

/** Tira de vista previa mínima: se mantiene visible mientras se editan controles. */
function MiniPreview({ tema }: { tema: Tema }) {
  return (
    <div
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
      className="overflow-hidden rounded-[6px] border [&_*]:transition-[background-color,color,border-color] [&_*]:duration-150 [&_*]:ease-out"
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "var(--paper)", borderColor: "var(--rule)" }}
      >
        <span
          className="font-display text-[13px] font-semibold"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--app-font-display)",
          }}
        >
          Título
        </span>
        <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
          texto secundario
        </span>
        <span
          className="ml-auto inline-flex h-6 items-center rounded-[4px] px-2 text-[11px] font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          Botón
        </span>
      </div>
      <div
        className="border-t px-3 py-2"
        style={{ background: "var(--paper-2)", borderColor: "var(--rule)" }}
      >
        <div
          className="flex h-7 items-center rounded-[4px] border px-2 text-[11px]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--rule)",
            color: "var(--ink-soft)",
          }}
        >
          Campo de texto
        </div>
      </div>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
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
          className="min-w-0 flex-1 h-10 px-2.5 rounded-[5px] border border-rule bg-paper text-sm outline-none focus:border-ink font-mono"
        />
      </div>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}
