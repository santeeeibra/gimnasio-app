"use client";

import { useActionState, useTransition, useState } from "react";
import {
  guardarTemaSocio,
  restablecerTemaSocio,
  type AjustesSocioState,
} from "./actions";
import { Button } from "@/components/ui";
import {
  derivarVoltInk,
  isHex,
  type Tema,
  type TemaPersonalizado,
} from "@/lib/tema";
import { Check, RotateCcw } from "lucide-react";

const PALETA_ACENTOS = [
  { label: "Lima", hex: "#10e7a0" },
  { label: "Cian", hex: "#00d4ff" },
  { label: "Ámbar", hex: "#f59e0b" },
  { label: "Fuego", hex: "#ff5c39" },
  { label: "Rosa", hex: "#ec4899" },
  { label: "Violeta", hex: "#a855f7" },
  { label: "Esmeralda", hex: "#10b981" },
  { label: "Azul", hex: "#3b82f6" },
];

export function AjustesSocioForm({
  temaGym,
  temaPersonalizado,
}: {
  temaGym: Tema;
  temaPersonalizado: TemaPersonalizado | null;
}) {
  const [state, formAction, pending] = useActionState<
    AjustesSocioState,
    FormData
  >(guardarTemaSocio, {});

  const [isRestableciendo, startTransition] = useTransition();
  const [feedbackRestablecer, setFeedbackRestablecer] = useState<string | null>(
    null,
  );

  const voltActual = temaPersonalizado?.volt ?? temaGym.volt;
  const [voltDraft, setVoltDraft] = useState<string>(voltActual);

  const tieneOverride = Boolean(
    temaPersonalizado?.volt &&
      temaPersonalizado.volt.toLowerCase() !== temaGym.volt.toLowerCase(),
  );

  const voltInkDraft = derivarVoltInk(
    isHex(voltDraft) ? voltDraft : temaGym.volt,
  );

  const handleRestablecer = () => {
    startTransition(async () => {
      const res = await restablecerTemaSocio();
      if (res.ok) {
        setVoltDraft(temaGym.volt);
        setFeedbackRestablecer(res.ok);
      } else if (res.error) {
        setFeedbackRestablecer(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Vista previa en tiempo real */}
      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft mb-3">
          Vista previa de tus destacados
        </span>
        <div className="rounded-[10px] border border-rule bg-paper p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">
              Así se verán tus botones y badges
            </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs"
              style={{
                backgroundColor: voltDraft,
                color: voltInkDraft,
              }}
            >
              Al día
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-[6px] px-4 text-xs font-semibold shadow-xs transition-opacity hover:opacity-90"
              style={{
                backgroundColor: voltDraft,
                color: voltInkDraft,
              }}
            >
              Botón de acción
            </button>
            <div
              className="h-9 flex-1 rounded-[6px] border px-3 flex items-center text-xs text-ink-soft"
              style={{
                borderColor: voltDraft,
              }}
            >
              Borde destacado
            </div>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Paletas de acento sugeridas */}
        <div>
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft mb-1.5">
            Colores sugeridos
          </span>
          <p className="text-xs text-ink-soft mb-3">
            Tocá un color para probarlo.
          </p>

          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
            {PALETA_ACENTOS.map((p) => {
              const activo =
                voltDraft.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => {
                    setVoltDraft(p.hex);
                    setFeedbackRestablecer(null);
                  }}
                  className={`group relative flex flex-col items-center justify-center rounded-[8px] border p-2 text-center transition-[transform,border-color] duration-150 active:scale-95 ${
                    activo
                      ? "border-ink ring-2 ring-ink/20 bg-paper-2"
                      : "border-rule bg-paper hover:border-ink/40"
                  }`}
                >
                  <span
                    className="size-6 rounded-full border border-black/10 shadow-xs flex items-center justify-center"
                    style={{ backgroundColor: p.hex }}
                  >
                    {activo ? (
                      <Check
                        className="size-3.5"
                        style={{ color: derivarVoltInk(p.hex) }}
                        strokeWidth={3}
                      />
                    ) : null}
                  </span>
                  <span className="mt-1.5 block text-[11px] font-medium text-ink truncate w-full">
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color personalizado manual */}
        <div className="border-t border-rule pt-4">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft mb-1.5">
              O elegí cualquier otro color
            </span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={isHex(voltDraft) ? voltDraft : temaGym.volt}
                onChange={(e) => {
                  setVoltDraft(e.target.value);
                  setFeedbackRestablecer(null);
                }}
                className="size-10 cursor-pointer rounded-[6px] border border-rule bg-paper p-1"
              />
              <input
                type="text"
                name="volt"
                value={voltDraft}
                onChange={(e) => {
                  setVoltDraft(e.target.value);
                  setFeedbackRestablecer(null);
                }}
                placeholder="#10E7A0"
                maxLength={7}
                className="h-10 w-32 rounded-[6px] border border-rule bg-paper px-3 font-mono text-sm uppercase text-ink outline-none focus:border-ink"
              />
              <span className="text-xs text-ink-soft">Formato #RRGGBB</span>
            </div>
          </label>
        </div>

        {/* Mensajes de feedback */}
        {state.error ? (
          <p className="text-sm text-danger animate-error">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-ok animate-pop-in">{state.ok}</p>
        ) : null}
        {feedbackRestablecer ? (
          <p className="text-sm text-ok animate-pop-in">
            {feedbackRestablecer}
          </p>
        ) : null}

        {/* Botones de acción */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" loading={pending} disabled={isRestableciendo}>
            {pending ? "Guardando…" : "Guardar mi color"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleRestablecer}
            disabled={pending || isRestableciendo || !tieneOverride}
            title={
              !tieneOverride
                ? "Ya estás usando el color por defecto del gimnasio"
                : "Borra tu personalización y vuelve al color del gimnasio"
            }
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            {isRestableciendo ? "Restableciendo…" : "Usar el color de mi gimnasio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
