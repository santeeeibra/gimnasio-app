"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ejerciciosSimilares, estaBloqueado } from "@/lib/rutina/motor";
import { Spinner } from "@/components/ui";
import {
  GRUPO_MUSCULAR_LABEL,
  MOLESTIAS,
  MOLESTIA_LABEL,
  REPS_OPCIONES,
  SERIES_OPCIONES,
  TECNICAS,
  TECNICA_DESC,
  TECNICA_LABEL,
  type Ejercicio,
  type Molestia,
  type Tecnica,
} from "@/lib/rutina/tipos";

const campoCls =
  "h-11 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink";
import { editarItem, editarTecnica, sustituirEjercicio } from "./actions";

export type ItemEditable = {
  id: string;
  series: number;
  repeticiones: string;
  nota: string;
  tecnica: Tecnica | null;
  ejercicio: Ejercicio | null;
};

export type DiaEditable = {
  numero: number;
  titulo: string;
  items: ItemEditable[];
};

/** free-exercise-db trae 2 cuadros por ejercicio (…/0.jpg y …/1.jpg). */
function frameAlterno(url: string): string | null {
  if (/\/0\.jpg$/i.test(url)) return url.replace(/\/0\.jpg$/i, "/1.jpg");
  return null;
}

function usePrefiereMenosMovimiento() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** Crossfade entre los dos cuadros (en vez de cortar el src en seco). */
function ImagenAnimada({
  url,
  activo,
  className,
  onError,
  alt: altText = "",
}: {
  url: string;
  activo: boolean;
  className: string;
  onError: () => void;
  alt?: string;
}) {
  const alt = frameAlterno(url);
  const [mostrarAlt, setMostrarAlt] = useState(false);

  useEffect(() => {
    if (!activo || !alt) return;
    const id = setInterval(() => setMostrarAlt((v) => !v), 1800);
    return () => clearInterval(id);
  }, [activo, alt]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={altText}
        loading="lazy"
        decoding="async"
        onError={onError}
        className={`${className} absolute inset-0 transition-opacity duration-500 ${mostrarAlt ? "opacity-0" : "opacity-100"}`}
      />
      {alt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={alt}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${className} absolute inset-0 transition-opacity duration-500 ${mostrarAlt ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}

function Glifo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8v8M3 10v4M18 8v8M21 10v4M7 12h10" />
    </svg>
  );
}

function ExThumb({
  ej,
  onOpen,
}: {
  ej: Ejercicio | null;
  onOpen: () => void;
}) {
  const reduce = usePrefiereMenosMovimiento();
  const [err, setErr] = useState(false);
  const url = ej?.imagen_url ?? null;

  if (!url || err) {
    return (
      <div
        className="grid size-[72px] shrink-0 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft"
        aria-hidden
      >
        <Glifo className="size-6" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver ${ej?.nombre ?? "ejercicio"} en grande`}
      className="group relative size-[72px] shrink-0 overflow-hidden rounded-[8px] border border-rule bg-paper-2 transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
    >
      <ImagenAnimada
        url={url}
        activo={!reduce && !err}
        onError={() => setErr(true)}
        className="h-full w-full object-cover object-center"
      />
    </button>
  );
}

function VisorEjercicio({
  ej,
  onClose,
}: {
  ej: Ejercicio;
  onClose: () => void;
}) {
  const reduce = usePrefiereMenosMovimiento();
  const [err, setErr] = useState(false);
  const url = ej.imagen_url ?? null;

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ej.nombre}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight">{ej.nombre}</h3>
            {ej.grupo_muscular ? (
              <span className="mt-0.5 inline-block text-[11px] tracking-[0.08em] text-ink-soft">
                {GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-[6px] text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] border border-rule bg-paper-2">
          {url && !err ? (
            <ImagenAnimada
              url={url}
              activo={!reduce && !err}
              onError={() => setErr(true)}
              alt={ej.nombre}
              className="h-full w-full object-contain"
            />
          ) : (
            <Glifo className="size-10 text-ink-soft" />
          )}
        </div>

        {ej.descripcion ? (
          <p className="mt-3 text-[13px] leading-snug text-ink-soft">
            {ej.descripcion}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RutinaEditor({
  dias,
  ejercicios,
  mostrarTecnica = false,
}: {
  dias: DiaEditable[];
  ejercicios: Ejercicio[];
  mostrarTecnica?: boolean;
}) {
  const [visor, setVisor] = useState<Ejercicio | null>(null);
  const [activo, setActivo] = useState(dias[0]?.numero ?? 1);
  const multi = dias.length > 1;
  const visibles = multi ? dias.filter((d) => d.numero === activo) : dias;
  return (
    <div className="space-y-6">
      {multi ? (
        <DiaTabs dias={dias} activo={activo} onSelect={setActivo} />
      ) : null}
      <div key={activo} className="stagger space-y-8">
      {visibles.map((dia) => {
        const tiempoMin = Math.round(
          dia.items.reduce((a, it) => a + it.series * 2.2, 0),
        );
        const musculos = [
          ...new Set(
            dia.items.map(
              (i) => GRUPO_MUSCULAR_LABEL[i.ejercicio?.grupo_muscular ?? ""],
            ),
          ),
        ]
          .filter(Boolean)
          .join(" · ");
        const basicos = dia.items.filter(
          (it) => it.ejercicio?.patron !== "aislamiento",
        );
        const accesorios = dia.items.filter(
          (it) => it.ejercicio?.patron === "aislamiento",
        );
        const conSubtitulo = basicos.length > 0 && accesorios.length > 0;
        const secciones: Array<[string, ItemEditable[]]> = [
          ["Básicos", basicos],
          ["Accesorios", accesorios],
        ];
        return (
          <section key={dia.numero}>
            <h2 className="font-display text-lg">{dia.titulo}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {dia.items.length} ejercicios · ~{tiempoMin} min
            </p>
            {musculos ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[...new Set(dia.items.map(i => GRUPO_MUSCULAR_LABEL[i.ejercicio?.grupo_muscular ?? ""]))].filter(Boolean).map((g, i) => (
                  <span key={i} className="inline-block rounded-full border border-rule bg-paper px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                    {g}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-3 space-y-4">
              {secciones.map(([titulo, grupo]) =>
                grupo.length === 0 ? null : (
                  <div key={titulo}>
                    {conSubtitulo ? (
                      <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                        {titulo}
                      </p>
                    ) : null}
                    <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
                      {grupo.map((item) => (
                        <ItemFila
                          key={item.id}
                          indice={dia.items.indexOf(item) + 1}
                          item={item}
                          ejercicios={ejercicios}
                          mostrarTecnica={mostrarTecnica}
                          onVer={setVisor}
                        />
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}
      </div>
      {visor ? (
        <VisorEjercicio ej={visor} onClose={() => setVisor(null)} />
      ) : null}
    </div>
  );
}

/** Selector de días: las 3 pestañas comparten contenedor (borde); la activa
 *  además va con fondo relleno. */
function DiaTabs({
  dias,
  activo,
  onSelect,
}: {
  dias: DiaEditable[];
  activo: number;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {dias.map((d) => {
        const on = d.numero === activo;
        return (
          <button
            key={d.numero}
            type="button"
            onClick={() => onSelect(d.numero)}
            aria-pressed={on}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors duration-150 [transition-timing-function:var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
              on
                ? "border-rule bg-paper font-medium text-ink"
                : "border-rule bg-transparent text-ink-soft"
            }`}
          >
            {(() => {
              const m = d.titulo.match(/d[ií]a\s*(\d+)/i);
              return m ? `Día ${m[1]}` : `Día ${d.numero}`;
            })()}
          </button>
        );
      })}
    </div>
  );
}

function ItemFila({
  item,
  indice,
  ejercicios,
  mostrarTecnica,
  onVer,
}: {
  item: ItemEditable;
  indice: number;
  ejercicios: Ejercicio[];
  mostrarTecnica: boolean;
  onVer: (ej: Ejercicio) => void;
}) {
  const [series, setSeries] = useState(String(item.series));
  const [reps, setReps] = useState(item.repeticiones);
  const [tecnica, setTecnica] = useState<Tecnica>(item.tecnica ?? "ninguna");
  const [ej, setEj] = useState(item.ejercicio);
  const [abrirCambio, setAbrirCambio] = useState(false);
  const [molestias, setMolestias] = useState<Molestia[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dirty =
    series !== String(item.series) || reps.trim() !== item.repeticiones;

  function flash(t: string) {
    setMsg(t);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 1800);
  }

  function guardar() {
    startTransition(async () => {
      const r = await editarItem(item.id, {
        series: Number(series) || item.series,
        repeticiones: reps,
        nota: item.nota,
      });
      flash(r.error ?? "Guardado ✓");
      if (!r.error) {
        item.series = Number(series) || item.series;
        item.repeticiones = reps.trim() || item.repeticiones;
      }
    });
  }

  function cambiar(nuevo: Ejercicio) {
    startTransition(async () => {
      const r = await sustituirEjercicio(item.id, nuevo.id);
      if (r.error) {
        flash(r.error);
        return;
      }
      setEj(nuevo);
      setAbrirCambio(false);
      flash("Ejercicio cambiado ✓");
    });
  }

  function cambiarTecnica(nueva: Tecnica) {
    const previa = tecnica;
    setTecnica(nueva);
    startTransition(async () => {
      const r = await editarTecnica(item.id, nueva);
      if (r.error) {
        setTecnica(previa);
        flash(r.error);
        return;
      }
      item.tecnica = nueva === "ninguna" ? null : nueva;
      flash("Técnica actualizada ✓");
    });
  }

  const baseAlt = ej ? ejerciciosSimilares(ej, ejercicios, 12) : [];
  const alternativas = (
    molestias.length
      ? baseAlt.filter((a) => !estaBloqueado(a, molestias))
      : baseAlt
  ).slice(0, 6);

  // Menús cerrados: si el valor guardado no está en la lista, lo agregamos
  // como primera opción para no perderlo.
  const seriesOpts = (SERIES_OPCIONES as readonly number[]).map(String);
  const repsOpts = (REPS_OPCIONES as readonly string[]).slice();
  if (!seriesOpts.includes(series)) seriesOpts.unshift(series);
  if (!repsOpts.includes(reps)) repsOpts.unshift(reps);

  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <ExThumb ej={ej} onOpen={() => ej && onVer(ej)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="shrink-0 text-[11px] font-[700] leading-none text-ink-soft"
                  style={{ fontFamily: "var(--font-hero)" }}
                  aria-hidden
                >
                  {String(indice).padStart(2, "0")}
                </span>
                <p className="min-w-0 font-display text-[15px] font-medium leading-tight text-ink">
                  {ej?.nombre ?? "Ejercicio"}
                </p>
              </div>
              {ej?.grupo_muscular ? (
                <span className="mt-1 inline-block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                  {GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setAbrirCambio((v) => !v)}
              aria-expanded={abrirCambio}
              aria-label={
                abrirCambio
                  ? "Cerrar alternativas"
                  : "No conozco este ejercicio o me molesta"
              }
              className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-[6px] text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {abrirCambio ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <>
                    <path d="M8 3 4 7l4 4" />
                    <path d="M4 7h16" />
                    <path d="m16 21 4-4-4-4" />
                    <path d="M20 17H4" />
                  </>
                )}
              </svg>
            </button>
          </div>

          {/* Prescripción: el dato dominante de la card. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
              <b
                className="font-[700] text-ink"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {series}
              </b>
              series
            </span>
            <span className="inline-flex items-baseline gap-1 rounded-full border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
              <b
                className="font-[700] text-ink"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {reps.replace("–", "-")}
              </b>
              reps
            </span>
            {item.tecnica ? (
              <span className="inline-flex items-center rounded-full border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
                {TECNICA_LABEL[item.tecnica]}
              </span>
            ) : null}
          </div>

          {ej?.descripcion ? (
            <p className="mt-2 text-xs leading-snug text-ink-soft line-clamp-2">
              {ej.descripcion}
            </p>
          ) : null}

          <details className="group mt-2">
            <summary className="inline-flex w-fit cursor-pointer select-none list-none items-center gap-1 rounded-[5px] border border-rule px-2.5 py-1 text-[11px] text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              <span className="group-open:hidden">Ajustar</span>
              <span className="hidden group-open:inline">Listo</span>
            </summary>
            <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-[11px] text-ink-soft mb-1">Series</span>
              <select
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                className={`${campoCls} w-16 px-2 text-center`}
              >
                {seriesOpts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <span className="pb-3 text-ink-soft">×</span>
            <label className="block">
              <span className="block text-[11px] text-ink-soft mb-1">Reps</span>
              <select
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className={`${campoCls} w-24 px-2`}
              >
                {repsOpts.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            {dirty ? (
              <button
                type="button"
                onClick={guardar}
                disabled={pending}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-[5px] bg-ink text-paper text-sm font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Spinner />
                    Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            ) : null}
            {msg ? (
              <span className="pb-3 text-xs text-ok animate-fade-in">{msg}</span>
            ) : null}
            </div>
          </details>

          {mostrarTecnica ? (
            <div className="mt-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink-soft">
                  Técnica
                </span>
                <select
                  value={tecnica}
                  onChange={(e) => cambiarTecnica(e.target.value as Tecnica)}
                  disabled={pending}
                  className={`${campoCls} w-full max-w-[16rem] px-2 disabled:opacity-50`}
                >
                  {TECNICAS.map((t) => (
                    <option key={t} value={t}>
                      {TECNICA_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              {tecnica !== "ninguna" ? (
                <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                  {TECNICA_DESC[tecnica]}
                </p>
              ) : null}
            </div>
          ) : null}

          {item.nota ? (
            <p className="mt-2 text-[11px] text-ink-soft">{item.nota}</p>
          ) : null}

          {abrirCambio ? (
            <div className="mt-3 rounded-[5px] border border-rule bg-paper p-3 animate-fade-in">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {MOLESTIAS.map((m) => {
                  const on = molestias.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setMolestias((p) =>
                          on ? p.filter((x) => x !== m) : [...p, m],
                        )
                      }
                      className={`h-7 rounded-[5px] border px-2 text-[11px] transition-colors ${
                        on
                          ? "border-ink bg-ink text-paper"
                          : "border-rule text-ink-soft"
                      }`}
                    >
                      {MOLESTIA_LABEL[m]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-soft mb-2">
                Marcá una molestia para descartar variantes, o cambialo por uno equivalente:
              </p>
              {alternativas.length === 0 ? (
                <p className="text-xs text-ink-soft">Sin alternativas para este grupo.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {alternativas.map((alt) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => cambiar(alt)}
                      disabled={pending}
                      className="h-9 px-3 rounded-[5px] border border-rule bg-paper-2 text-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
                    >
                      {alt.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
