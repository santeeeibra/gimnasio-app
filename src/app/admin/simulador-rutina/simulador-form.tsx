"use client";

// Form del simulador + las 3 listas de salida. Usa las MISMAS constantes y
// labels que el form real del cliente (generar-form.tsx) y el mismo texto de
// "¿por qué?" (teoria.ts). No escribe nada: solo llama a simularRutina().

import { useActionState, useState } from "react";
import { Button, Select, linkClasses } from "@/components/ui";
import { TEORIA, type ClaveTeoria } from "@/lib/rutina/teoria";
import {
  ENFASIS,
  ENFASIS_LABEL,
  MAX_ENFASIS,
  MOLESTIAS,
  MOLESTIA_LABEL,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_AYUDA,
  OBJETIVO_LABEL,
  ORDENES,
  ORDEN_LABEL,
  PREFERENCIA_EQUIPO_LABEL,
  RANGOS,
  RANGO_LABEL,
  RIR_LABEL,
  RIR_OPCIONES,
  SEXOS,
  SEXO_LABEL,
  SPLITS,
  SPLIT_DIAS_OK,
  SPLIT_LABEL,
  TECNICAS,
  TECNICA_LABEL,
  VOLUMENES,
  VOLUMEN_LABEL,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
} from "@/lib/rutina/tipos";
import { simularRutina, type SimState } from "./actions";

const PREFS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];

const RIR_CORTO: Record<string, string> = {
  "2-3": "Suave",
  "1-2": "Exigente",
  "0-1": "Al límite",
};

function Porque({ clave }: { clave: ClaveTeoria }) {
  const t = TEORIA[clave];
  return (
    <details className="mt-1.5 text-xs text-ink-soft">
      <summary
        className={`w-fit cursor-pointer select-none [&::-webkit-details-marker]:hidden ${linkClasses.inline}`}
      >
        ¿por qué?
      </summary>
      <p className="mt-1 leading-snug">{t.resumen}</p>
      <p className="mt-1 leading-snug text-ink-soft/70">Fuente: {t.fuente}</p>
    </details>
  );
}

const chip =
  "inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150";

export function SimuladorForm() {
  const [state, formAction, pending] = useActionState<SimState, FormData>(
    simularRutina,
    {},
  );
  const [objetivo, setObjetivo] = useState<Objetivo>("hipertrofia");
  const [nivel, setNivel] = useState<Nivel>("avanzado");
  const [dias, setDias] = useState("3");
  const [split, setSplit] = useState("auto");
  const [enfasis, setEnfasis] = useState<Enfasis[]>([]);
  const [zonasDolor, setZonasDolor] = useState<Molestia[]>([]);

  const avanzadoActivo = nivel === "avanzado";
  const splitDiasOk =
    split === "auto" ||
    (SPLIT_DIAS_OK[split as keyof typeof SPLIT_DIAS_OK] ?? []).includes(
      Number(dias),
    );

  function toggleEnfasis(e: Enfasis) {
    setEnfasis((p) =>
      p.includes(e)
        ? p.filter((x) => x !== e)
        : p.length >= MAX_ENFASIS
          ? p
          : [...p, e],
    );
  }
  function toggleDolor(m: Molestia) {
    setZonasDolor((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  }

  return (
    <div className="space-y-8">
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div>
          <Select
            label="Objetivo"
            name="objetivo"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value as Objetivo)}
          >
            {OBJETIVOS.map((o) => (
              <option key={o} value={o}>
                {OBJETIVO_LABEL[o]}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs leading-snug text-ink-soft">
            {OBJETIVO_AYUDA[objetivo]}
          </p>
        </div>

        <Select
          label="Días por semana"
          name="dias"
          value={dias}
          onChange={(e) => setDias(e.target.value)}
        >
          {[2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>
              {d} días
            </option>
          ))}
        </Select>

        <Select
          label="Nivel"
          name="nivel"
          value={nivel}
          onChange={(e) => setNivel(e.target.value as Nivel)}
        >
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABEL[n]}
            </option>
          ))}
        </Select>

        <Select label="Sexo" name="sexo" defaultValue="sin_especificar">
          {SEXOS.map((s) => (
            <option key={s} value={s}>
              {SEXO_LABEL[s]}
            </option>
          ))}
        </Select>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">
            Zona a enfocar{" "}
            <span className="font-normal text-ink-soft/70">
              (opcional · hasta {MAX_ENFASIS})
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {ENFASIS.map((e) => (
              <label key={e} className="cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  name="enfasis"
                  value={e}
                  checked={enfasis.includes(e)}
                  onChange={() => toggleEnfasis(e)}
                  className="peer sr-only"
                />
                <span
                  className={`${chip} peer-checked:border-volt peer-checked:bg-volt peer-checked:text-volt-ink`}
                >
                  {ENFASIS_LABEL[e]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">
            Evitar dolor en / Molestias a evitar{" "}
            <span className="font-normal text-ink-soft/70">(opcional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {MOLESTIAS.map((m) => (
              <label key={m} className="cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  name="zonasDolor"
                  value={m}
                  checked={zonasDolor.includes(m)}
                  onChange={() => toggleDolor(m)}
                  className="peer sr-only"
                />
                <span
                  className={`${chip} peer-checked:border-danger peer-checked:bg-[color:var(--danger-weak)] peer-checked:text-ink`}
                >
                  {MOLESTIA_LABEL[m]}
                </span>
              </label>
            ))}
          </div>
          <Porque clave="molestia" />
        </fieldset>

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">
            Equipamiento disponible
          </legend>
          <div className="flex flex-wrap gap-2">
            {PREFS.map((p, i) => (
              <label key={p} className="cursor-pointer touch-manipulation">
                <input
                  type="radio"
                  name="preferencia"
                  value={p}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span
                  className={`${chip} peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper`}
                >
                  {PREFERENCIA_EQUIPO_LABEL[p]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="sm:col-span-2 rounded-[6px] border border-rule bg-paper-2 p-4">
          <legend className="px-1.5 text-[13px] font-medium text-ink-soft">
            Ajustes avanzados
          </legend>
          {!avanzadoActivo ? (
            <p className="text-xs leading-snug text-ink-soft">
              Elegí nivel <strong>Avanzado</strong> para desbloquear estos
              ajustes (igual que en producción). Con otro nivel se simula el
              plan estándar.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Estructura (split)"
                  name="split"
                  value={split}
                  onChange={(e) => setSplit(e.target.value)}
                >
                  {SPLITS.map((s) => (
                    <option key={s} value={s}>
                      {SPLIT_LABEL[s]}
                    </option>
                  ))}
                </Select>
                {!splitDiasOk ? (
                  <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                    Esa estructura rinde mejor con{" "}
                    {(
                      SPLIT_DIAS_OK[split as keyof typeof SPLIT_DIAS_OK] ?? []
                    ).join(" o ")}{" "}
                    días.
                  </p>
                ) : null}
                <Porque clave="frecuencia" />
              </div>

              <div>
                <Select label="Repeticiones" name="rango" defaultValue="estandar">
                  {RANGOS.map((r) => (
                    <option key={r} value={r}>
                      {RANGO_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <Porque clave="dup" />
              </div>

              <div>
                <Select
                  label="Volumen semanal"
                  name="volumen"
                  defaultValue="estandar"
                >
                  {VOLUMENES.map((v) => (
                    <option key={v} value={v}>
                      {VOLUMEN_LABEL[v]}
                    </option>
                  ))}
                </Select>
                <Porque clave="volumen" />
              </div>

              <div>
                <Select label="Esfuerzo" name="rir" defaultValue="2-3">
                  {RIR_OPCIONES.map((r) => (
                    <option key={r} value={r}>
                      {RIR_CORTO[r] ?? RIR_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <Porque clave="rir" />
              </div>

              <div>
                <Select
                  label="Orden de ejercicios"
                  name="orden"
                  defaultValue="compuestos_primero"
                >
                  {ORDENES.map((o) => (
                    <option key={o} value={o}>
                      {ORDEN_LABEL[o]}
                    </option>
                  ))}
                </Select>
                <Porque clave="orden" />
              </div>

              <div className="sm:col-span-2">
                <Select
                  label="Técnica de intensidad en aislamientos"
                  name="tecnicaAislamientos"
                  defaultValue="ninguna"
                >
                  {TECNICAS.map((t) => (
                    <option key={t} value={t}>
                      {TECNICA_LABEL[t]}
                    </option>
                  ))}
                </Select>
                <Porque clave="tecnicas" />
              </div>
            </div>
          )}
        </fieldset>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>
            {pending ? "Generando…" : "Generar rutina de prueba"}
          </Button>
          <span className="text-xs text-ink-soft">
            No se guarda nada en la base.
          </span>
          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}
        </div>
      </form>

      {state.combinacion ? (
        <section className="space-y-8">
          <Bloque titulo="1 · Combinación elegida">
            <ul className="space-y-1 text-sm">
              {state.combinacion.map((l, i) => (
                <li key={i} className="leading-snug">
                  — {l}
                </li>
              ))}
            </ul>
          </Bloque>

          <Bloque titulo="2 · Qué le suma cada elección">
            {state.porque && state.porque.length > 0 ? (
              <ul className="mb-4 space-y-2 text-sm">
                {state.porque.map((t, i) => (
                  <li key={i} className="leading-snug">
                    <strong>{t.titulo}.</strong> {t.resumen}{" "}
                    <span className="text-ink-soft/70">Fuente: {t.fuente}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="space-y-1 font-mono text-xs">
              {(state.trace ?? []).map((l, i) => (
                <li key={i} className="leading-snug">
                  — {l}
                </li>
              ))}
            </ul>
          </Bloque>

          <Bloque titulo="3 · Rutina resultante">
            <div className="space-y-5">
              {state.dias!.map((d) => (
                <div key={d.titulo}>
                  <h3 className="mb-1.5 text-sm font-medium">{d.titulo}</h3>
                  <ul className="space-y-1 text-sm">
                    {d.items.map((it, i) => (
                      <li key={i} className="leading-snug">
                        — {it.nombre} — {it.series} series x {it.reps}{" "}
                        <span className="text-ink-soft">
                          (rol: {it.rol} · {it.grupo} · {it.equipo}
                          {it.tecnica ? ` · ${it.tecnica}` : ""}) · {it.nota}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-ink-soft">
                    Total: {d.items.reduce((a, b) => a + b.series, 0)} series ·{" "}
                    {d.items.length} ejercicios
                  </p>
                </div>
              ))}
            </div>
          </Bloque>
        </section>
      ) : null}
    </div>
  );
}

function Bloque({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-rule bg-paper-2 p-5">
      <h2 className="mb-3 text-xs uppercase tracking-[0.08em] text-ink-soft">
        {titulo}
      </h2>
      {children}
    </div>
  );
}
