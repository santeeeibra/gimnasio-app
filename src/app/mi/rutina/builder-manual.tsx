"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import {
  GRUPO_A_ENFASIS,
  MAX_DIAS_MANUAL,
  MAX_EJERCICIOS_DIA,
  MAX_ENFASIS,
  REPS_OPCIONES,
  SERIES_OPCIONES,
  TECNICAS,
  TECNICA_DESC,
  TECNICA_LABEL,
  type Ejercicio,
  type Enfasis,
  type Tecnica,
} from "@/lib/rutina/tipos";
import { guardarRutinaManual } from "./actions";

const campoCls =
  "h-11 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink";

let contador = 0;
const uid = () => `f${++contador}`;

type FilaManual = {
  key: string;
  ejercicioId: string;
  series: string;
  reps: string;
  tecnica: Tecnica;
};

type DiaManual = { key: string; titulo: string; filas: FilaManual[] };

function nuevaFila(): FilaManual {
  return { key: uid(), ejercicioId: "", series: "3", reps: "8–12", tecnica: "ninguna" };
}

function nuevoDia(n: number): DiaManual {
  return { key: uid(), titulo: `Día ${n}`, filas: [nuevaFila()] };
}

function IconoX() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function BuilderManual({ ejercicios }: { ejercicios: Ejercicio[] }) {
  const [state, formAction, pending] = useActionState(guardarRutinaManual, {
    error: undefined,
    ok: undefined,
  } as { error?: string; ok?: string });
  const [dias, setDias] = useState<DiaManual[]>([nuevoDia(1)]);

  const grupos = useMemo(() => {
    const m = new Map<string, Ejercicio[]>();
    for (const e of ejercicios) {
      const g = e.grupo_muscular ?? "Otros";
      const arr = m.get(g) ?? [];
      arr.push(e);
      m.set(g, arr);
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nombre, ejs]) => ({
        nombre,
        ejercicios: [...ejs].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      }));
  }, [ejercicios]);

  const grupoPorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of ejercicios) if (e.grupo_muscular) m.set(e.id, e.grupo_muscular);
    return m;
  }, [ejercicios]);

  // "Generar automático con lo que tengo": infiere días (los que ya armó) y las
  // 2 zonas más repetidas entre los ejercicios elegidos, se los pasa al
  // cuestionario de arriba y scrollea. No toca el motor ni borra el draft.
  function generarAutoConManual() {
    const conteo = new Map<Enfasis, number>();
    for (const d of dias) {
      for (const f of d.filas) {
        const g = grupoPorId.get(f.ejercicioId);
        const enf = g ? GRUPO_A_ENFASIS[g] : undefined;
        if (enf) conteo.set(enf, (conteo.get(enf) ?? 0) + 1);
      }
    }
    const enfasis = [...conteo.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_ENFASIS)
      .map(([e]) => e);
    window.dispatchEvent(
      new CustomEvent("rutina:prefill", {
        detail: { dias: dias.length, enfasis },
      }),
    );
    const auto = document.getElementById("generar-rutina-auto");
    auto?.closest("details")?.setAttribute("open", "");
    auto?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const payload = {
    dias: dias.map((d) => ({
      titulo: d.titulo,
      items: d.filas.map((f) => ({
        ejercicio_id: f.ejercicioId,
        series: Number(f.series),
        repeticiones: f.reps,
        tecnica: f.tecnica,
      })),
    })),
  };

  const incompleto = dias.some(
    (d) => d.filas.length === 0 || d.filas.some((f) => !f.ejercicioId),
  );

  function mutarFila(diaKey: string, filaKey: string, campos: Partial<FilaManual>) {
    setDias((prev) =>
      prev.map((d) =>
        d.key !== diaKey
          ? d
          : {
              ...d,
              filas: d.filas.map((f) =>
                f.key === filaKey ? { ...f, ...campos } : f,
              ),
            },
      ),
    );
  }

  function agregarFila(diaKey: string) {
    setDias((prev) =>
      prev.map((d) =>
        d.key !== diaKey || d.filas.length >= MAX_EJERCICIOS_DIA
          ? d
          : { ...d, filas: [...d.filas, nuevaFila()] },
      ),
    );
  }

  function quitarFila(diaKey: string, filaKey: string) {
    setDias((prev) =>
      prev.map((d) =>
        d.key !== diaKey || d.filas.length <= 1
          ? d
          : { ...d, filas: d.filas.filter((f) => f.key !== filaKey) },
      ),
    );
  }

  function agregarDia() {
    setDias((prev) =>
      prev.length >= MAX_DIAS_MANUAL ? prev : [...prev, nuevoDia(prev.length + 1)],
    );
  }

  function quitarDia(diaKey: string) {
    setDias((prev) =>
      prev.length <= 1 ? prev : prev.filter((d) => d.key !== diaKey),
    );
  }

  return (
    <form action={formAction} className="stagger space-y-5">
      <input type="hidden" name="plan" value={JSON.stringify(payload)} />

      {dias.map((dia, di) => (
        <section
          key={dia.key}
          className="rounded-[6px] border border-rule bg-paper-2 p-4"
        >
          <div className="flex items-center gap-2">
            <input
              value={dia.titulo}
              onChange={(e) =>
                setDias((prev) =>
                  prev.map((d) =>
                    d.key === dia.key ? { ...d, titulo: e.target.value } : d,
                  ),
                )
              }
              maxLength={40}
              aria-label={`Título del día ${di + 1}`}
              className={`${campoCls} h-9 min-w-0 flex-1 px-2.5 text-[15px] font-medium`}
            />
            {dias.length > 1 ? (
              <button
                type="button"
                onClick={() => quitarDia(dia.key)}
                aria-label={`Quitar ${dia.titulo}`}
                className="grid size-9 shrink-0 place-items-center rounded-[5px] text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <IconoX />
              </button>
            ) : null}
          </div>

          <ul className="stagger-in mt-3 space-y-3">
            {dia.filas.map((fila) => (
              <li
                key={fila.key}
                className="rounded-[5px] border border-rule bg-paper p-3"
              >
                <div className="flex items-start gap-2">
                  <select
                    value={fila.ejercicioId}
                    onChange={(e) =>
                      mutarFila(dia.key, fila.key, { ejercicioId: e.target.value })
                    }
                    aria-label="Ejercicio"
                    className={`${campoCls} min-w-0 flex-1 px-2`}
                  >
                    <option value="">Elegí un ejercicio…</option>
                    {grupos.map((g) => (
                      <optgroup key={g.nombre} label={g.nombre}>
                        {g.ejercicios.map((ej) => (
                          <option key={ej.id} value={ej.id}>
                            {ej.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {dia.filas.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => quitarFila(dia.key, fila.key)}
                      aria-label="Quitar ejercicio"
                      className="grid size-9 shrink-0 place-items-center rounded-[5px] text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    >
                      <IconoX />
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-ink-soft">
                      Series
                    </span>
                    <select
                      value={fila.series}
                      onChange={(e) =>
                        mutarFila(dia.key, fila.key, { series: e.target.value })
                      }
                      className={`${campoCls} w-16 px-2 text-center`}
                    >
                      {(SERIES_OPCIONES as readonly number[]).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="pb-3 text-ink-soft">×</span>
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-ink-soft">
                      Reps
                    </span>
                    <select
                      value={fila.reps}
                      onChange={(e) =>
                        mutarFila(dia.key, fila.key, { reps: e.target.value })
                      }
                      className={`${campoCls} w-24 px-2`}
                    >
                      {(REPS_OPCIONES as readonly string[]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block min-w-0 basis-full">
                    <span className="mb-1 block text-[11px] text-ink-soft">
                      Técnica
                    </span>
                    <select
                      value={fila.tecnica}
                      onChange={(e) =>
                        mutarFila(dia.key, fila.key, {
                          tecnica: e.target.value as Tecnica,
                        })
                      }
                      className={`${campoCls} w-full px-2`}
                    >
                      {TECNICAS.map((t) => (
                        <option key={t} value={t}>
                          {TECNICA_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {fila.tecnica !== "ninguna" ? (
                  <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                    {TECNICA_DESC[fila.tecnica]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => agregarFila(dia.key)}
            disabled={dia.filas.length >= MAX_EJERCICIOS_DIA}
            className="mt-3 h-11 rounded-[5px] border border-rule px-3 text-sm text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
          >
            + Ejercicio
          </button>
        </section>
      ))}

      <button
        type="button"
        onClick={agregarDia}
        disabled={dias.length >= MAX_DIAS_MANUAL}
        className="h-11 rounded-[5px] border border-rule px-3 text-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
      >
        + Día
      </button>

      <div className="space-y-2">
        <Button type="submit" variant="volt" loading={pending} disabled={incompleto}>
          {pending ? "Guardando…" : "Guardar rutina"}
        </Button>
        {incompleto ? (
          <p className="text-xs text-ink-soft">
            Elegí un ejercicio en cada fila.
          </p>
        ) : null}
        {state?.error ? (
          <p className="text-sm text-danger animate-error">{state.error}</p>
        ) : null}
        {state?.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>

      <div className="border-t border-rule pt-4">
        <button
          type="button"
          onClick={generarAutoConManual}
          className="h-11 rounded-[5px] border border-rule px-3 text-sm text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          Generar automático con lo que tengo
        </button>
        <p className="mt-2 text-xs leading-snug text-ink-soft">
          Lleva {dias.length} {dias.length === 1 ? "día" : "días"} y las zonas que
          más cargaste al cuestionario de arriba. Lo que armaste acá queda
          guardado mientras no salgas de la página.
        </p>
      </div>
    </form>
  );
}
