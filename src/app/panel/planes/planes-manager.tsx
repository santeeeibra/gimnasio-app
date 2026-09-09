"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { pillClasses } from "@/components/ui";
import { PlanForm } from "./plan-form";
import { alternarPlan, eliminarPlan, type DescuentoPlan } from "./actions";

import { Plus, X } from "lucide-react";
import { useHapticos } from "@/lib/ui/hapticos";

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
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
        <h2 className="text-lg font-bold text-ink">Planes vigentes</h2>

        <button
          onClick={() => {
            hapticos.medio();
            setMostrarNuevoForm(true);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-[10px] bg-accent text-accent-contrast shadow-sm hover:opacity-95 active:scale-95 transition-all"
        >
          <Plus className="size-4" />
          <span>Crear nuevo plan</span>
        </button>
      </div>

      {/* MODAL CREAR PLAN */}
      {mounted && mostrarNuevoForm ? createPortal(
        <div
          role="dialog"
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
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all"
              >
                <X className="size-4" />
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
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all"
              >
                <X className="size-4" />
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
            ⭐
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
        <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule">
          {planes.map((p) => {
            const esDefecto = p.duracion_dias === 30;
            const descuentosActivos = (p.descuentos ?? []).filter(
              (d) => (d.porcentaje ?? 0) > 0,
            );

            return (
              <li
                key={p.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
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

                  <p className="text-sm font-mono text-ink-soft">
                    <strong className="text-ink text-base">
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

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoPlanId(p.id);
                      setMostrarNuevoForm(false);
                    }}
                    className="h-8 px-3 rounded-[5px] border border-rule bg-paper text-xs font-medium text-ink hover:border-ink transition-colors"
                  >
                    ✏️ Editar
                  </button>

                  <form action={alternarPlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="activo"
                      value={String(p.activo)}
                    />
                    <button
                      className={
                        p.activo
                          ? pillClasses.destructiva
                          : pillClasses.neutra
                      }
                    >
                      {p.activo ? "Desactivar" : "Reactivar"}
                    </button>
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
                    <button
                      type="submit"
                      className="h-8 px-2.5 rounded-[5px] border border-rule bg-paper text-xs font-medium text-ink-soft hover:text-danger hover:border-danger/40 transition-colors"
                      title="Eliminar este plan permanentemente"
                    >
                      🗑️ Borrar
                    </button>
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
