"use client";

import { useActionState, useState } from "react";
import {
  crearPlan,
  editarPlan,
  type PlanState,
  type DescuentoPlan,
} from "./actions";
import { Button, Field } from "@/components/ui";

interface PlanFormProps {
  planInicial?: {
    id: string;
    nombre: string;
    precio: number;
    duracion_dias: number;
    descuentos?: DescuentoPlan[];
  } | null;
  onCancel?: () => void;
}

const DESCUENTOS_BASE: DescuentoPlan[] = [
  { id: "estudiante", nombre: "Estudiante", porcentaje: 0 },
  { id: "jubilado", nombre: "Jubilado", porcentaje: 0 },
];

export function PlanForm({ planInicial, onCancel }: PlanFormProps) {
  const esEdicion = Boolean(planInicial?.id);
  const action = esEdicion ? editarPlan : crearPlan;
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    action,
    {},
  );

  const [nombre, setNombre] = useState(planInicial?.nombre ?? (esEdicion ? "" : "Mensualidad"));
  const [precio, setPrecio] = useState(planInicial?.precio ? String(planInicial.precio) : "");
  const [duracion, setDuracion] = useState(planInicial?.duracion_dias ?? 30);
  const [personalizado, setPersonalizado] = useState(
    Boolean(planInicial && planInicial.duracion_dias !== 30),
  );

  const [descuentos, setDescuentos] = useState<DescuentoPlan[]>(() => {
    if (planInicial?.descuentos && planInicial.descuentos.length > 0) {
      return planInicial.descuentos;
    }
    return DESCUENTOS_BASE;
  });

  const [nuevoNombreDesc, setNuevoNombreDesc] = useState("");
  const [mostrarNuevoDesc, setMostrarNuevoDesc] = useState(false);

  const precioNum = Number(precio) || 0;

  function actualizarPorcentaje(index: number, nuevoPorcentaje: number) {
    const sanitized = Math.min(100, Math.max(0, Math.round(nuevoPorcentaje)));
    setDescuentos((prev) =>
      prev.map((d, i) => (i === index ? { ...d, porcentaje: sanitized } : d)),
    );
  }

  function eliminarDescuento(index: number) {
    setDescuentos((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarDescuento() {
    const nom = nuevoNombreDesc.trim();
    if (!nom) return;
    const nuevoId = "desc_" + Date.now();
    setDescuentos((prev) => [
      ...prev,
      { id: nuevoId, nombre: nom, porcentaje: 0 },
    ]);
    setNuevoNombreDesc("");
    setMostrarNuevoDesc(false);
  }

  return (
    <form action={formAction} className="space-y-4">
      {esEdicion ? (
        <input type="hidden" name="id" value={planInicial!.id} />
      ) : null}
      <input
        type="hidden"
        name="descuentos"
        value={JSON.stringify(descuentos)}
      />

      <div
        className={`grid gap-4 items-end ${
          personalizado
            ? "sm:grid-cols-[1fr_auto_auto_auto]"
            : "sm:grid-cols-[1fr_auto_auto]"
        }`}
      >
        <div>
          <Field
            label="Nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Mensualidad, Pase Diario…"
            required
          />
        </div>

        <div>
          <Field
            label="Precio base ($)"
            name="precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="numeric"
            placeholder="25000"
          />
        </div>

        {personalizado ? (
          <div>
            <Field
              label="Días corridos"
              name="duracion_dias"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value) || 30)}
              inputMode="numeric"
              placeholder="30"
              required
            />
          </div>
        ) : (
          <input type="hidden" name="duracion_dias" value={30} />
        )}

        <div className="flex gap-2">
          {esEdicion && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-3 rounded-[5px] border border-rule bg-paper text-sm text-ink-soft hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          ) : null}
          <Button type="submit" loading={pending}>
            {pending
              ? "Guardando…"
              : esEdicion
              ? "Guardar cambios"
              : "Crear plan"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={personalizado}
            onChange={(e) => {
              setPersonalizado(e.target.checked);
              if (!e.target.checked) setDuracion(30);
            }}
            className="size-4 accent-ink"
          />
          Personalizar duración (por defecto: 30 días corridos / 1 mes)
        </label>
      </div>

      {/* SECCIÓN DE DESCUENTOS SETEABLES POR EL DUEÑO */}
      <div className="rounded-[6px] border border-rule bg-paper/60 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Descuentos configurables para este plan
            </span>
            <p className="text-xs text-ink-soft/80 mt-0.5">
              Arrancan en 0%. Asigná el porcentaje que desees aplicar al cobrar.
            </p>
          </div>
          {!mostrarNuevoDesc ? (
            <button
              type="button"
              onClick={() => setMostrarNuevoDesc(true)}
              className="text-xs font-medium text-ink-soft hover:text-ink underline transition-colors"
            >
              + Agregar otra categoría
            </button>
          ) : null}
        </div>

        {mostrarNuevoDesc ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Ej: Familiar, Convenio, Docente..."
              value={nuevoNombreDesc}
              onChange={(e) => setNuevoNombreDesc(e.target.value)}
              className="h-8 px-2.5 rounded-[5px] border border-rule bg-paper text-xs text-ink outline-none focus:border-ink flex-1"
            />
            <button
              type="button"
              onClick={agregarDescuento}
              className="h-8 px-3 rounded-[5px] bg-paper-3 border border-rule text-xs font-medium text-ink hover:border-ink"
            >
              Añadir
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarNuevoDesc(false);
                setNuevoNombreDesc("");
              }}
              className="text-xs text-ink-soft hover:text-ink px-1"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {descuentos.map((d, index) => {
            const precioCalculado =
              precioNum > 0
                ? Math.round(precioNum * (1 - (d.porcentaje || 0) / 100))
                : 0;

            return (
              <div
                key={d.id || index}
                className="flex items-center justify-between gap-3 p-2.5 rounded-[5px] border border-rule bg-paper-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-ink block truncate">
                    {d.nombre}
                  </span>
                  <span className="text-[11px] text-ink-soft block">
                    {d.porcentaje > 0 && precioNum > 0 ? (
                      <>
                        Precio final:{" "}
                        <strong className="text-ok font-mono">
                          ${precioCalculado.toLocaleString("es-AR")}
                        </strong>
                      </>
                    ) : (
                      "Sin descuento activo (0%)"
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={d.porcentaje}
                    onChange={(e) =>
                      actualizarPorcentaje(index, Number(e.target.value))
                    }
                    className="w-14 h-8 px-2 rounded-[5px] border border-rule bg-paper text-xs text-right font-mono outline-none focus:border-ink"
                  />
                  <span className="text-xs font-mono text-ink-soft">%</span>
                  <button
                    type="button"
                    onClick={() => eliminarDescuento(index)}
                    className="text-xs text-ink-soft/60 hover:text-danger p-1 transition-colors"
                    title="Eliminar este descuento"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-ok">Plan guardado con éxito.</p>
      ) : null}
    </form>
  );
}
