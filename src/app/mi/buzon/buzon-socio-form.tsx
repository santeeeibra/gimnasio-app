"use client";

import { useActionState } from "react";
import { Select, Button } from "@/components/ui";
import { enviarComentario, type ComentarioState } from "./actions";

const inicial: ComentarioState = {};

export function BuzonSocioForm() {
  const [state, action, pending] = useActionState(enviarComentario, inicial);

  if (state.ok) {
    return (
      <div className="rounded-[5px] border border-ok/40 bg-ok/10 px-4 py-3">
        <p className="text-sm font-medium text-ok">
          ¡Comentario enviado! Gracias por el feedback.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Select label="Categoría" name="categoria" defaultValue="otro" required>
        <option value="equipo">Equipo roto</option>
        <option value="limpieza">Limpieza</option>
        <option value="sugerencia">Sugerencia</option>
        <option value="otro">Otro</option>
      </Select>

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Comentario
        </span>
        <textarea
          name="texto"
          required
          maxLength={1000}
          rows={4}
          placeholder="Contanos qué pasó o qué sugerís…"
          className="w-full px-3 py-2.5 rounded-[5px] border border-rule bg-paper text-[16px] outline-none resize-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
        />
      </label>

      {state.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        Enviar
      </Button>
    </form>
  );
}
