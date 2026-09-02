"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import {
  ENFASIS,
  ENFASIS_LABEL,
  MAX_ENFASIS,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_LABEL,
  PREFERENCIA_EQUIPO_LABEL,
  SEXOS,
  SEXO_LABEL,
  type Enfasis,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

type S = { error?: string; ok?: string };

const PREFS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];
const selectCls =
  "w-full h-11 px-3 rounded-[5px] border border-rule bg-paper-2 text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]";

export function GenerarRutinaForm({
  action,
  clienteId,
  tieneRutina = false,
  defaults,
  clienteSexo,
}: {
  action: (prev: S, fd: FormData) => Promise<S>;
  clienteId?: string;
  tieneRutina?: boolean;
  defaults?: {
    objetivo?: Objetivo;
    nivel?: Nivel;
    dias?: number;
    preferencia?: PreferenciaEquipo;
    sexo?: Sexo;
    enfasis?: Enfasis[];
  };
  clienteSexo?: Sexo | null;
}) {
  const [state, formAction, pending] = useActionState<S, FormData>(action, {});
  const [enfasis, setEnfasis] = useState<Enfasis[]>(defaults?.enfasis ?? []);

  function toggleEnfasis(e: Enfasis) {
    setEnfasis((prev) =>
      prev.includes(e)
        ? prev.filter((x) => x !== e)
        : prev.length >= MAX_ENFASIS
          ? prev
          : [...prev, e],
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {clienteId ? <input type="hidden" name="cliente_id" value={clienteId} /> : null}

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Objetivo
        </span>
        <select name="objetivo" defaultValue={defaults?.objetivo ?? "hipertrofia"} className={selectCls}>
          {OBJETIVOS.map((o) => (
            <option key={o} value={o}>
              {OBJETIVO_LABEL[o]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Días por semana
        </span>
        <select name="dias" defaultValue={String(defaults?.dias ?? 3)} className={selectCls}>
          {[2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>
              {d} días
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Nivel
        </span>
        <select name="nivel" defaultValue={defaults?.nivel ?? "principiante"} className={selectCls}>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABEL[n]}
            </option>
          ))}
        </select>
      </label>

      {clienteSexo != null ? (
        <label className="block">
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Sexo
          </span>
          <select
            name="sexo"
            defaultValue={defaults?.sexo ?? clienteSexo}
            className={selectCls}
          >
            {SEXOS.map((s) => (
              <option key={s} value={s}>
                {SEXO_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="sexo" value="sin_especificar" />
      )}

      <fieldset className="sm:col-span-2">
        <legend className="text-[13px] font-medium text-ink-soft mb-1.5">
          Zona a enfocar{" "}
          <span className="font-normal text-ink-soft/70">
            (opcional · hasta {MAX_ENFASIS})
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {ENFASIS.map((e) => {
            const on = enfasis.includes(e);
            return (
              <label key={e} className="cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  name="enfasis"
                  value={e}
                  checked={on}
                  onChange={() => toggleEnfasis(e)}
                  className="peer sr-only"
                />
                <span className="inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:shadow-[0_0_0_3px_rgb(22_24_29_/_0.12)]">
                  {ENFASIS_LABEL[e]}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          Se agregan series extra para esa zona.
        </p>
      </fieldset>

      <fieldset className="sm:col-span-2">
        <legend className="text-[13px] font-medium text-ink-soft mb-1.5">
          Equipamiento disponible
        </legend>
        <div className="flex flex-wrap gap-2">
          {PREFS.map((p, i) => (
            <label key={p} className="cursor-pointer touch-manipulation">
              <input
                type="radio"
                name="preferencia"
                value={p}
                defaultChecked={
                  defaults?.preferencia ? defaults.preferencia === p : i === 0
                }
                className="peer sr-only"
              />
              <span className="inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:shadow-[0_0_0_3px_rgb(22_24_29_/_0.12)]">
                {PREFERENCIA_EQUIPO_LABEL[p]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Generando…"
            : tieneRutina
              ? "Regenerar rutina"
              : "Generar rutina"}
        </Button>
        {tieneRutina ? (
          <span className="text-xs text-ink-soft">
            Regenerar reemplaza los ejercicios actuales.
          </span>
        ) : null}
        {state.error ? (
          <p className="text-sm text-danger animate-error">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
