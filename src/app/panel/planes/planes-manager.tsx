"use client";

import { useState } from "react";
import { pillClasses } from "@/components/ui";
import { PlanForm } from "./plan-form";
import { alternarPlan, type DescuentoPlan } from "./actions";

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
  const [editandoPlanId, setEditandoPlanId] = useState<string | null>(null);
  const [mostrarNuevoForm, setMostrarNuevoForm] = useState(planes.length === 0);

  const planEnEdicion = planes.find((p) => p.id === editandoPlanId) ?? null;

  return (
    <div className="space-y-6">
      {/* FORMULARIO DE EDICIÓN O CREACIÓN */}
      {planEnEdicion ? (
        <div className="card-cut card-cut-lg border border-accent/40 bg-paper-2 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Modificar plan: {planEnEdicion.nombre}
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Ajustá el precio base, nombre o porcentajes de descuento.
              </p>
            </div>
            <button
              onClick={() => setEditandoPlanId(null)}
              className="text-xs text-ink-soft hover:text-ink px-2 py-1 rounded border border-rule"
            >
              Cerrar edición
            </button>
          </div>
          <PlanForm
            planInicial={planEnEdicion}
            onCancel={() => setEditandoPlanId(null)}
          />
        </div>
      ) : mostrarNuevoForm ? (
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Nuevo plan</h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Por defecto configurado a 30 días corridos con descuentos en 0%.
              </p>
            </div>
            {planes.length > 0 ? (
              <button
                onClick={() => setMostrarNuevoForm(false)}
                className="text-xs text-ink-soft hover:text-ink px-2 py-1 rounded border border-rule"
              >
                Cancelar
              </button>
            ) : null}
          </div>
          <PlanForm onCancel={() => setMostrarNuevoForm(false)} />
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-xs text-ink-soft font-medium uppercase tracking-wider">
            Tus planes ({planes.length})
          </span>
          <button
            onClick={() => setMostrarNuevoForm(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-[5px] bg-paper-3 border border-rule hover:border-ink text-ink transition-colors"
          >
            + Crear otro plan
          </button>
        </div>
      )}

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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
