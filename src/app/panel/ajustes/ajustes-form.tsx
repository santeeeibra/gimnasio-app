"use client";

import { useActionState, useEffect, useState } from "react";
import { actualizarColores, type AjustesState } from "./actions";
import { Button } from "@/components/ui";
import { TemaPreview } from "./tema-preview";

type Gimnasio = {
  id: string;
  nombre: string;
  color_primario: string | null;
  color_acento: string | null;
  color_fondo: string | null;
};

const DEFAULTS = {
  primario: "#16181d",
  acento: "#cde94a",
  fondo: "#faf9f6",
};

export function AjustesForm({ gimnasio }: { gimnasio: Gimnasio }) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarColores,
    {},
  );

  const [primario, setPrimario] = useState(
    gimnasio.color_primario ?? DEFAULTS.primario,
  );
  const [acento, setAcento] = useState(gimnasio.color_acento ?? DEFAULTS.acento);
  const [fondo, setFondo] = useState(gimnasio.color_fondo ?? DEFAULTS.fondo);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="gimnasio_id" value={gimnasio.id} />

        <div className="space-y-4">
          <ColorPicker
            name="color_primario"
            label="Color principal"
            value={primario}
            onChange={setPrimario}
            hint="Texto y elementos principales"
          />
          <ColorPicker
            name="color_acento"
            label="Color de acento"
            value={acento}
            onChange={setAcento}
            hint="Botones y destacados"
          />
          <ColorPicker
            name="color_fondo"
            label="Color de fondo"
            value={fondo}
            onChange={setFondo}
            hint="Fondo de la app"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setPrimario(DEFAULTS.primario);
              setAcento(DEFAULTS.acento);
              setFondo(DEFAULTS.fondo);
            }}
          >
            Restablecer
          </Button>
        </div>
      </form>

      <TemaPreview primario={primario} acento={acento} fondo={fondo} />
    </div>
  );
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

function ColorPicker({
  name,
  label,
  value,
  onChange,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
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
          className="w-16 h-10 rounded-[5px] border border-rule cursor-pointer"
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
          className="flex-1 h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink font-mono"
        />
      </div>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}
