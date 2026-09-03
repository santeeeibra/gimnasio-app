"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, linkClasses } from "@/components/ui";
import {
  ENFASIS,
  ENFASIS_LABEL,
  MAX_ENFASIS,
  MOLESTIAS,
  MOLESTIA_LABEL,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_LABEL,
  OBJETIVO_AYUDA,
  ORDENES,
  ORDEN_LABEL,
  PREFERENCIA_EQUIPO_LABEL,
  RANGOS,
  RANGO_LABEL,
  RIR_OPCIONES,
  RIR_LABEL,
  SEXOS,
  SEXO_LABEL,
  SPLITS,
  SPLIT_LABEL,
  SPLIT_DIAS_OK,
  TECNICAS,
  TECNICA_LABEL,
  VOLUMENES,
  VOLUMEN_LABEL,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";
import { TEORIA, type ClaveTeoria } from "@/lib/rutina/teoria";

type S = { error?: string; ok?: string };

const PREFS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];

// Etiqueta corta para el <select> de esfuerzo. La explicación larga
// ("dejá 2–3 repeticiones en reserva") vive en el "¿por qué?" de abajo.
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

export type AvanzadoDefaults = {
  split?: string;
  rango?: string;
  volumen?: string;
  rir?: string;
  orden?: string;
  tecnicaAislamientos?: string;
  evitar?: Molestia[];
};

export function GenerarRutinaForm({
  action,
  clienteId,
  tieneRutina = false,
  defaults,
  clienteSexo,
  mostrarAvanzado = false,
  avanzadoDefaults,
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
  mostrarAvanzado?: boolean;
  avanzadoDefaults?: AvanzadoDefaults;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<S, FormData>(action, {});
  const [enfasis, setEnfasis] = useState<Enfasis[]>(defaults?.enfasis ?? []);
  const [dias, setDias] = useState(String(defaults?.dias ?? 3));
  const [objetivo, setObjetivo] = useState<Objetivo>(
    defaults?.objetivo ?? "hipertrofia",
  );
  const [nivel, setNivel] = useState<Nivel>(
    defaults?.nivel ?? "principiante",
  );
  const [split, setSplit] = useState<string>(
    avanzadoDefaults?.split ?? "auto",
  );
  const avanzadoActivo = mostrarAvanzado && nivel === "avanzado";
  const splitDiasOk =
    split === "auto" ||
    (SPLIT_DIAS_OK[split as keyof typeof SPLIT_DIAS_OK] ?? []).includes(
      Number(dias),
    );
  const [prefillNota, setPrefillNota] = useState<string | null>(null);

  // "Generar automático con lo que tengo" (builder manual): precarga días y
  // zonas inferidas sin pisar el resto del cuestionario. El submit sigue igual.
  useEffect(() => {
    function aplicar(e: Event) {
      const d = (e as CustomEvent<{ dias: number; enfasis: Enfasis[] }>).detail;
      if (!d) return;
      if (d.dias >= 2 && d.dias <= 6) setDias(String(d.dias));
      setEnfasis(d.enfasis.slice(0, MAX_ENFASIS));
      setPrefillNota(
        `Tomamos ${d.dias} ${d.dias === 1 ? "día" : "días"}` +
          (d.enfasis.length
            ? ` y ${d.enfasis.map((x) => ENFASIS_LABEL[x]).join(", ")}`
            : "") +
          " de tu armado manual. Revisá el resto y generá.",
      );
    }
    window.addEventListener("rutina:prefill", aplicar);
    return () => window.removeEventListener("rutina:prefill", aplicar);
  }, []);

  // El revalidatePath del server action no purga la Router Cache del cliente:
  // tras regenerar con éxito, forzamos un refresh para no mostrar la rutina vieja.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

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
    <form action={formAction} className="stagger grid gap-4 sm:grid-cols-2">
      {clienteId ? <input type="hidden" name="cliente_id" value={clienteId} /> : null}

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

      {clienteSexo != null ? (
        <Select
          label="Sexo"
          name="sexo"
          defaultValue={defaults?.sexo ?? clienteSexo}
        >
          {SEXOS.map((s) => (
            <option key={s} value={s}>
              {SEXO_LABEL[s]}
            </option>
          ))}
        </Select>
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
                <span className="inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-volt peer-checked:bg-volt peer-checked:text-volt-ink peer-focus-visible:shadow-[0_0_0_3px_rgb(22_24_29_/_0.12)]">
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

      {mostrarAvanzado ? (
        <fieldset className="sm:col-span-2 rounded-[6px] border border-rule bg-paper-2 p-4">
          <legend className="px-1.5 text-[13px] font-medium text-ink-soft">
            Ajustes avanzados
          </legend>

          {!avanzadoActivo ? (
            <p className="text-xs leading-snug text-ink-soft">
              Elegí nivel <strong>Avanzado</strong> para desbloquear estos
              ajustes. Con otro nivel se genera el plan estándar.
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
                    días. Con {dias} la armamos igual, repartiendo los días para
                    completar la semana.
                  </p>
                ) : null}
                <Porque clave="frecuencia" />
              </div>

              <div>
                <Select
                  label="Repeticiones"
                  name="rango"
                  defaultValue={avanzadoDefaults?.rango ?? "estandar"}
                >
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
                  defaultValue={avanzadoDefaults?.volumen ?? "estandar"}
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
                <Select
                  label="Esfuerzo"
                  name="rir"
                  defaultValue={avanzadoDefaults?.rir ?? "2-3"}
                >
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
                  defaultValue={
                    avanzadoDefaults?.orden ?? "compuestos_primero"
                  }
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
                  defaultValue={
                    avanzadoDefaults?.tecnicaAislamientos ?? "ninguna"
                  }
                >
                  {TECNICAS.map((t) => (
                    <option key={t} value={t}>
                      {TECNICA_LABEL[t]}
                    </option>
                  ))}
                </Select>
                <Porque clave="tecnicas" />
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">
                  Molestias a evitar{" "}
                  <span className="font-normal text-ink-soft/70">
                    (opcional)
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {MOLESTIAS.map((m) => (
                    <label
                      key={m}
                      className="cursor-pointer touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="evitar"
                        value={m}
                        defaultChecked={avanzadoDefaults?.evitar?.includes(m)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:shadow-[0_0_0_3px_rgb(22_24_29_/_0.12)]">
                        {MOLESTIA_LABEL[m]}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                  Se sustituyen los ejercicios que suelen molestar esa zona.
                </p>
                <Porque clave="molestia" />
              </fieldset>
            </div>
          )}
        </fieldset>
      ) : null}

      {prefillNota ? (
        <p className="sm:col-span-2 text-xs leading-snug text-ink-soft animate-fade-in">
          {prefillNota}
        </p>
      ) : null}

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={pending}
          variant={tieneRutina ? "volt" : "primary"}
        >
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
