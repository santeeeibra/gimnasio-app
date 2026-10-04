"use client";

import { useState, useEffect, type ReactNode } from "react";
import { createPortal, useFormStatus } from "react-dom";
import { PlanForm } from "./plan-form";
import { alternarPlan, eliminarPlan, type DescuentoPlan } from "./actions";

import { Plus, X, Pencil, Power, Trash2, Tags } from "lucide-react";
import { useHapticos } from "@/lib/ui/hapticos";

/**
 * Submit que se autodeshabilita mientras la server action esta en vuelo.
 * Evita el doble submit en acciones destructivas (eliminar/alternar plan),
 * que son las unicas dos del panel que no pasan por useActionState.
 */
function BotonSubmit({
  className,
  title,
  children,
}: {
  className: string;
  title?: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      aria-busy={pending}
      className={`${className} disabled:opacity-50 disabled:pointer-events-none`}
    >
      {children}
    </button>
  );
}

export interface PlanItem {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  activo: boolean;
  descuentos?: DescuentoPlan[];
}

interface PlanesManagerProps {
  planes: PlanItem[];
}

export function PlanesManager({ planes }: PlanesManagerProps) {
  const [mostrarNuevoForm, setMostrarNuevoForm] = useState(false);
  const [editandoPlanId, setEditandoPlanId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hapticos = useHapticos();

  useEffect(() => {
    setMounted(true);
  }, []);

  const planEnEdicion = planes.find((p) => p.id === editandoPlanId) ?? null;

  return (
    <div className="space-y-4">
      {/* HEADER DE SECCIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
        <h2 className="text-lg font-bold text-ink">Planes vigentes</h2>

        <button
          onClick={() => {
            hapticos.medio();
            setMostrarNuevoForm(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-[12px] bg-accent text-accent-contrast shadow-sm active:scale-95 transition-transform"
        >
          <Plus aria-hidden className="size-4" />
          <span>Crear nuevo plan</span>
        </button>
      </div>

      {/* MODAL CREAR PLAN */}
      {mounted && mostrarNuevoForm ? createPortal(
        <div
          role="dialog"
          aria-label="Nuevo plan"
          aria-modal="true"
          onClick={() => {
            hapticos.suave();
            setMostrarNuevoForm(false);
          }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h2 className="text-xl font-bold text-ink leading-tight">Nuevo plan</h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Por defecto configurado a 30 días corridos con descuentos configurables.
                </p>
              </div>
              <button
                onClick={() => {
                  hapticos.suave();
                  setMostrarNuevoForm(false);
                }}
                aria-label="Cerrar formulario"
                className="size-11 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-transform"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <PlanForm onCancel={() => setMostrarNuevoForm(false)} />
          </div>
        </div>,
        document.getElementById("portal-root") ?? document.body
      ) : null}

      {/* MODAL EDITAR PLAN */}
      {mounted && planEnEdicion ? createPortal(
        <div
          role="dialog"
          aria-label="Modificar plan"
          aria-modal="true"
          onClick={() => {
            hapticos.suave();
            setEditandoPlanId(null);
          }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h2 className="text-xl font-bold text-ink leading-tight">
                  Modificar plan: {planEnEdicion.nombre}
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Ajustá el precio base, nombre o porcentajes de descuento.
                </p>
              </div>
              <button
                onClick={() => {
                  hapticos.suave();
                  setEditandoPlanId(null);
                }}
                aria-label="Cerrar formulario"
                className="size-11 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-transform"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <PlanForm
              planInicial={planEnEdicion}
              onCancel={() => setEditandoPlanId(null)}
            />
          </div>
        </div>,
        document.getElementById("portal-root") ?? document.body
      ) : null}

      {/* LISTADO DE PLANES */}
      {planes.length === 0 ? (
        <div className="card-cut border border-dashed border-rule bg-paper-2/50 p-8 text-center space-y-3">
          <div className="size-10 mx-auto rounded-full bg-accent/10 text-accent grid place-items-center text-lg font-bold">
            <Tags aria-hidden className="size-5" />
          </div>
          <p className="text-base font-semibold text-ink">
            Aún no configuraste planes para tus socios
          </p>
          <p className="text-xs text-ink-soft max-w-sm mx-auto">
            El 95% de los gimnasios utiliza una <strong>mensualidad de 30 días corridos</strong>.
            Podés crearlo en el formulario superior en un clic.
          </p>
        </div>
      ) : (
        <ul className="owner-plan-list space-y-4">
          {planes.map((p) => {
            const esDefecto = p.duracion_dias === 30;
            const descuentosActivos = (p.descuentos ?? []).filter(
              (d) => (d.porcentaje ?? 0) > 0,
            );

            return (
              <li
                key={p.id}
                className={`owner-plan-card rounded-[16px] border border-rule p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 ${
                  editandoPlanId === p.id ? "bg-accent/5" : "bg-paper-2"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-ink">
                      {p.nombre}
                    </p>
                    {esDefecto ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                        30 días por defecto
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-ink-soft px-2 py-0.5 rounded-full bg-paper-3 border border-rule">
                        {p.duracion_dias} días
                      </span>
                    )}
                    {!p.activo ? (
                      <span className="text-xs text-danger font-medium">
                        (inactivo)
                      </span>
                    ) : null}
                  </div>

                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink-soft">
                    <strong className="text-ink text-2xl font-semibold tabular-nums">
                      ${p.precio.toLocaleString("es-AR")}
                    </strong>{" "}
                    base general
                  </p>

                  {/* DESCUENTOS CONFIGURADOS */}
                  {descuentosActivos.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[11px] text-ink-soft font-medium">
                        Descuentos:
                      </span>
                      {descuentosActivos.map((d) => {
                        const precioDesc = Math.round(
                          p.precio * (1 - d.porcentaje / 100),
                        );
                        return (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-ok/10 text-ok border border-ok/20"
                          >
                            <span>{d.nombre}</span>
                            <span className="font-mono">-{d.porcentaje}%</span>
                            <span className="text-ink-soft font-mono">
                              (${precioDesc.toLocaleString("es-AR")})
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-soft/70">
                      Descuentos en 0% (tarifa general sin reducciones)
                    </p>
                  )}
                </div>

                <div className="owner-plan-actions grid grid-cols-3 gap-2 xl:flex xl:items-center xl:shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoPlanId(p.id);
                      setMostrarNuevoForm(false);
                    }}
                    className="owner-plan-action owner-plan-edit"
                  >
                    <Pencil aria-hidden className="size-4 shrink-0" /> Editar
                  </button>

                  <form action={alternarPlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="activo"
                      value={String(p.activo)}
                    />
                    <BotonSubmit
                      className="owner-plan-action"
                    >
                      <Power aria-hidden className="size-4 shrink-0" />
                      {p.activo ? "Desactivar" : "Reactivar"}
                    </BotonSubmit>
                  </form>

                  <form
                    action={eliminarPlan}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `¿Seguro que querés eliminar el plan "${p.nombre}"? Esta acción no se puede deshacer.`,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <BotonSubmit
                      className="owner-plan-action owner-plan-delete"
                      title="Eliminar este plan permanentemente"
                    >
                      <Trash2 aria-hidden className="size-4 shrink-0" /> Borrar
                    </BotonSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
