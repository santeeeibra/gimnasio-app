"use client";

import { useActionState } from "react";
import { actualizarColores, type AjustesState } from "./actions";
import { Button } from "@/components/ui";

type Gimnasio = {
  id: string;
  nombre: string;
  color_primario: string | null;
  color_acento: string | null;
  color_fondo: string | null;
};

export function AjustesForm({ gimnasio }: { gimnasio: Gimnasio }) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarColores,
    {},
  );

  // Defaults si no hay colores guardados
  const primario = gimnasio.color_primario ?? "#16181d";
  const acento = gimnasio.color_acento ?? "#cde94a";
  const fondo = gimnasio.color_fondo ?? "#faf9f6";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="gimnasio_id" value={gimnasio.id} />

      <div className="grid md:grid-cols-3 gap-4">
        <ColorPicker
          name="color_primario"
          label="Color principal"
          defaultValue={primario}
          hint="Texto y elementos principales"
        />
        <ColorPicker
          name="color_acento"
          label="Color de acento"
          defaultValue={acento}
          hint="Botones y destacados"
        />
        <ColorPicker
          name="color_fondo"
          label="Color de fondo"
          defaultValue={fondo}
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
            const form = document.querySelector("form") as HTMLFormElement;
            form.reset();
          }}
        >
          Restablecer
        </Button>
      </div>
    </form>
  );
}

function ColorPicker({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          name={name}
          defaultValue={defaultValue}
          className="w-16 h-10 rounded-[5px] border border-rule cursor-pointer"
          onChange={(e) => {
            const textInput = e.target.nextElementSibling as HTMLInputElement;
            textInput.value = e.target.value;
          }}
        />
        <input
          type="text"
          name={`${name}_text`}
          defaultValue={defaultValue}
          pattern="^#[0-9A-Fa-f]{6}$"
          placeholder="#000000"
          className="flex-1 h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink font-mono"
          onChange={(e) => {
            const colorInput = e.target.previousElementSibling as HTMLInputElement;
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              colorInput.value = e.target.value;
            }
          }}
        />
      </div>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}
