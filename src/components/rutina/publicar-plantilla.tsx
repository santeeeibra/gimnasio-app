"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { hapticoError, hapticoExito, hapticoSeleccion } from "@/lib/ui/hapticos";
import {
  publicarPlantilla,
  type PlantillaState,
} from "@/app/panel/plantillas/actions";

export function PublicarPlantilla({ rutinaId }: { rutinaId: string }) {
  const [state, action, pending] = useActionState<PlantillaState, FormData>(
    publicarPlantilla,
    {},
  );
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (state.ok) hapticoExito();
    else if (state.error) hapticoError();
  }, [state]);

  const link =
    state.codigo && typeof window !== "undefined"
      ? `${window.location.origin}/r/${state.codigo}`
      : null;

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      hapticoSeleccion();
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      hapticoError();
    }
  }

  if (link) {
    return (
      <div className="rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm space-y-3 animate-fade-in">
        <p className="text-sm font-medium text-ink">
          Listo. Compartí este link con tus alumnos:
        </p>
        <div className="flex items-center gap-2 rounded-[10px] border border-rule bg-paper px-3 py-2">
          <span className="truncate text-xs text-ink-soft">{link}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copiar}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-sm font-medium text-accent-ink active:scale-[0.98]"
          >
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiado" : "Copiar link"}
          </button>
          <span className="text-xs text-ink-soft">
            Código: <span className="font-mono text-ink">{state.codigo}</span>
          </span>
        </div>
        <p className="text-xs text-ink-soft">
          Gestioná tus plantillas en{" "}
          <a href="/panel/plantillas" className="underline underline-offset-2">
            Rutinas para compartir
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm">
      {!abierto ? (
        <button
          onClick={() => {
            hapticoSeleccion();
            setAbierto(true);
          }}
          className="flex w-full items-center gap-3 text-left text-sm font-medium text-ink active:scale-[0.99]"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
            <Share2 aria-hidden className="size-4" />
          </span>
          Compartir con alumnos
        </button>
      ) : (
        <form action={action} className="space-y-3 animate-fade-in">
          <input type="hidden" name="rutinaId" value={rutinaId} />
          <div>
            <p className="text-sm font-medium text-ink">Publicar esta rutina como plantilla</p>
            <p className="text-xs text-ink-soft">
              Tus alumnos la cargan desde un link y quedan como socios tuyos.
            </p>
          </div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Nombre de la plantilla
            <input
              name="nombre"
              required
              minLength={3}
              maxLength={60}
              placeholder="Hipertrofia Torso-Pierna"
              className="mt-1 h-10 w-full rounded-[10px] border border-rule bg-paper px-3 text-[16px] text-ink"
            />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Código para el link (opcional)
            <input
              name="codigo"
              maxLength={20}
              placeholder="LUCAS"
              className="mt-1 h-10 w-full rounded-[10px] border border-rule bg-paper px-3 text-[16px] uppercase text-ink"
            />
            <span className="mt-1 block normal-case tracking-normal text-[11px] text-ink-soft">
              Queda como .../r/TUCODIGO. Si lo dejás vacío lo generamos.
            </span>
          </label>
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Publicar
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="h-10 rounded-[10px] px-3 text-sm text-ink-soft"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
