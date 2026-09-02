"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ejerciciosSimilares } from "@/lib/rutina/motor";
import {
  REPS_OPCIONES,
  SERIES_OPCIONES,
  TECNICAS,
  TECNICA_DESC,
  TECNICA_LABEL,
  type Ejercicio,
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

/** Alterna los dos cuadros para simular el movimiento del ejercicio. */
function useFrames(url: string | null, activo: boolean) {
  const [i, setI] = useState(0);
  const alt = url ? frameAlterno(url) : null;
  useEffect(() => {
    if (!activo || !alt) return;
    const id = setInterval(() => setI((v) => (v === 0 ? 1 : 0)), 900);
    return () => clearInterval(id);
  }, [activo, alt]);
  if (!url) return null;
  return i === 1 && alt ? alt : url;
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
  const src = useFrames(url, !reduce && !err);

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setErr(true)}
        className="h-full w-full object-contain"
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
  const src = useFrames(url, !reduce && !err);

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg leading-tight">{ej.nombre}</h3>
            {ej.grupo_muscular ? (
              <span className="mt-0.5 inline-block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                {ej.grupo_muscular}
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

        <div className="mt-3 grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] border border-rule bg-paper-2">
          {url && !err ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src ?? url}
              alt={ej.nombre}
              decoding="async"
              onError={() => setErr(true)}
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
  return (
    <div className="stagger space-y-8">
      {dias.map((dia) => (
        <section key={dia.numero}>
          <h2 className="font-display text-lg mb-3">{dia.titulo}</h2>
          <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
            {dia.items.map((item) => (
              <ItemFila
                key={item.id}
                item={item}
                ejercicios={ejercicios}
                mostrarTecnica={mostrarTecnica}
                onVer={setVisor}
              />
            ))}
          </ul>
        </section>
      ))}
      {visor ? (
        <VisorEjercicio ej={visor} onClose={() => setVisor(null)} />
      ) : null}
    </div>
  );
}

function ItemFila({
  item,
  ejercicios,
  mostrarTecnica,
  onVer,
}: {
  item: ItemEditable;
  ejercicios: Ejercicio[];
  mostrarTecnica: boolean;
  onVer: (ej: Ejercicio) => void;
}) {
  const [series, setSeries] = useState(String(item.series));
  const [reps, setReps] = useState(item.repeticiones);
  const [tecnica, setTecnica] = useState<Tecnica>(item.tecnica ?? "ninguna");
  const [ej, setEj] = useState(item.ejercicio);
  const [abrirCambio, setAbrirCambio] = useState(false);
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

  const alternativas = ej ? ejerciciosSimilares(ej, ejercicios, 6) : [];

  // Menús cerrados: si el valor guardado no está en la lista, lo agregamos
  // como primera opción para no perderlo.
  const seriesOpts = (SERIES_OPCIONES as readonly number[]).map(String);
  const repsOpts = (REPS_OPCIONES as readonly string[]).slice();
  if (!seriesOpts.includes(series)) seriesOpts.unshift(series);
  if (!repsOpts.includes(reps)) repsOpts.unshift(reps);

  return (
    <li className="p-4">
      <div className="flex gap-3">
        <ExThumb ej={ej} onOpen={() => ej && onVer(ej)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium leading-tight">{ej?.nombre ?? "Ejercicio"}</p>
              {ej?.grupo_muscular ? (
                <span className="mt-1 inline-block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                  {ej.grupo_muscular}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setAbrirCambio((v) => !v)}
              className="-mr-1.5 -mt-1 shrink-0 h-8 px-2.5 rounded-[5px] text-xs text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              {abrirCambio ? "Cerrar" : "No lo conozco"}
            </button>
          </div>

          {ej?.descripcion ? (
            <p className="mt-1.5 text-xs leading-snug text-ink-soft">{ej.descripcion}</p>
          ) : null}

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
                className="h-11 px-4 rounded-[5px] bg-ink text-paper text-sm font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
              >
                {pending ? "…" : "Guardar"}
              </button>
            ) : null}
            {msg ? (
              <span className="pb-3 text-xs text-ok animate-fade-in">{msg}</span>
            ) : null}
          </div>

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
              <p className="text-xs text-ink-soft mb-2">Cambiar por uno equivalente:</p>
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
