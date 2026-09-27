"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, PersonStanding, Plus, X } from "lucide-react";
import {
  obtenerClasificacionEjercicio,
  type PorcionId,
} from "@/lib/rutina/clasificacion-muscular";
import type { Ejercicio } from "@/lib/rutina/tipos";
import {
  hapticoError,
  hapticoExito,
  hapticoModalAbrir,
  hapticoModalCerrar,
} from "@/lib/ui/hapticos";
import { agregarEjercicioADia } from "@/app/mi/rutina/actions";
import {
  CuerpoSelector,
  DetalleGrupo,
  type GrupoCuerpo,
} from "./cuerpo-selector";

export function ExplorarPorMusculo({
  ejercicios,
  dia,
}: {
  ejercicios: Ejercicio[];
  /** Día activo del editor: ahí se agregan los ejercicios. */
  dia: { numero: number; titulo: string; ejercicioIds: string[] };
}) {
  const [abierto, setAbierto] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function abrir() {
    hapticoModalAbrir();
    setAbierto(true);
  }
  function cerrar() {
    hapticoModalCerrar();
    setAbierto(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Elegir ejercicios por músculo"
        className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-rule bg-paper px-3 text-xs font-bold text-ink-soft transition-[transform,color] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink active:scale-[0.96]"
      >
        <PersonStanding aria-hidden className="size-4 text-accent" />
        <span className="hidden sm:inline">Por músculo</span>
      </button>
      {abierto && mounted
        ? createPortal(
            <SheetMusculo ejercicios={ejercicios} dia={dia} onClose={cerrar} />,
            document.body,
          )
        : null}
    </>
  );
}

function SheetMusculo({
  ejercicios,
  dia,
  onClose,
}: {
  ejercicios: Ejercicio[];
  dia: { numero: number; titulo: string; ejercicioIds: string[] };
  onClose: () => void;
}) {
  const router = useRouter();
  const [grupo, setGrupo] = useState<GrupoCuerpo | null>(null);
  const [porcion, setPorcion] = useState<PorcionId | null>(null);
  // Volver al mapa no borra la selección: el grupo queda resaltado y, si se
  // vuelve a tocar, recupera la porción que estaba elegida.
  const [verMapa, setVerMapa] = useState(true);
  const [agregados, setAgregados] = useState<Set<string>>(
    () => new Set(dia.ejercicioIds),
  );
  const [pendienteId, setPendienteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    const scrollOrig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", on);
      document.body.style.overflow = scrollOrig;
    };
  }, [onClose]);

  // Clasificación estática una sola vez por catálogo.
  const porcionDe = useMemo(() => {
    const m = new Map<string, PorcionId>();
    for (const ej of ejercicios) {
      m.set(ej.id, obtenerClasificacionEjercicio(ej).porcionId);
    }
    return m;
  }, [ejercicios]);

  const lista = useMemo(() => {
    if (!grupo || verMapa) return [];
    const validas = porcion ? [porcion] : grupo.porciones;
    return ejercicios
      .filter((ej) => validas.includes(porcionDe.get(ej.id)!))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [grupo, verMapa, porcion, ejercicios, porcionDe]);

  function agregar(ej: Ejercicio) {
    setPendienteId(ej.id);
    setMsg(null);
    startTransition(async () => {
      const r = await agregarEjercicioADia(dia.numero, ej.id);
      setPendienteId(null);
      if (r.error) {
        hapticoError();
        setMsg(r.error);
        return;
      }
      hapticoExito();
      setAgregados((prev) => new Set(prev).add(ej.id));
      setMsg(`${ej.nombre} → ${dia.titulo}`);
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elegir ejercicios por músculo"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--scrim)] backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] border border-rule bg-paper shadow-2xl animate-slide-up sm:rounded-[20px]"
      >
        <header className="flex items-center gap-2 border-b border-rule px-4 py-3">
          {grupo && !verMapa ? (
            <button
              type="button"
              onClick={() => setVerMapa(true)}
              aria-label="Volver al cuerpo"
              className="grid size-9 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 active:scale-90"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-bold text-ink">
              {grupo && !verMapa ? grupo.label : "Elegí un músculo"}
            </h2>
            <p className="truncate text-[11px] text-ink-soft">
              para agregarlo al día {dia.titulo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 active:scale-90"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          {grupo && !verMapa ? (
            <DetalleGrupo grupo={grupo} porcion={porcion} onPorcion={setPorcion} />
          ) : (
            <>
              <CuerpoSelector
                modo="explorar"
                grupo={grupo?.id ?? null}
                onGrupo={(g) => {
                  if (g.id !== grupo?.id) setPorcion(null);
                  setGrupo(g);
                  setVerMapa(false);
                }}
              />
              {grupo ? (
                <button
                  type="button"
                  onClick={() => setVerMapa(false)}
                  className="mx-auto mt-3 flex h-9 items-center gap-1 rounded-full border border-accent/60 bg-paper-2 px-3.5 text-xs font-semibold text-ink transition-transform duration-150 active:scale-[0.96]"
                >
                  Seguir con {grupo.label}
                  <ChevronRight aria-hidden className="size-3.5" />
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-ink-soft">
                  Tocá una zona para ver cada cabeza y sus ejercicios.
                </p>
              )}
            </>
          )}

          {msg ? (
            <p
              role="status"
              className="mt-3 rounded-[10px] border border-rule bg-paper-2 px-3 py-2 text-center text-xs font-medium text-ink animate-fade-in"
            >
              {msg}
            </p>
          ) : null}

          {grupo && !verMapa ? (
            <ul className="mt-3 space-y-2">
              {lista.length === 0 ? (
                <li className="py-6 text-center text-xs text-ink-soft">
                  No hay ejercicios cargados para esta porción.
                </li>
              ) : (
                lista.map((ej) => {
                  const ya = agregados.has(ej.id);
                  const cargando = pendienteId === ej.id;
                  return (
                    <li
                      key={ej.id}
                      className="flex items-center gap-3 rounded-[12px] border border-rule bg-paper-2 p-2.5"
                    >
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-rule bg-white">
                        {ej.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ej.imagen_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <PersonStanding className="size-5 text-ink-soft" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {ej.nombre}
                        </p>
                        {ej.equipo ? (
                          <p className="truncate text-[11px] capitalize text-ink-soft">
                            {ej.equipo}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={ya || cargando}
                        onClick={() => agregar(ej)}
                        aria-label={ya ? `${ej.nombre} ya está en ${dia.titulo}` : `Agregar ${ej.nombre}`}
                        className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-bold transition-[transform,opacity] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.95] disabled:active:scale-100 ${
                          ya
                            ? "border border-rule bg-paper text-ink-soft"
                            : "bg-accent text-accent-contrast"
                        } ${cargando ? "opacity-60" : ""}`}
                      >
                        {ya ? (
                          <>
                            <Check className="size-3.5" /> En el día
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5" /> Agregar
                          </>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
