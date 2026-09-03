"use client";

import { useActionState } from "react";
import { forzarEstadoSocio } from "../../actions";
import { Button } from "@/components/ui";

const PRESETS = [
  { v: "cuota_por_vencer", l: "Cuota por vencer (dispara aviso de morosidad)" },
  { v: "cuota_vencida", l: "Cuota vencida" },
  { v: "trial_activo", l: "En prueba (sin ingresos)" },
  { v: "trial_expirado", l: "Prueba vencida (con ingreso)" },
];

const selCls =
  "h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-ink";

export function DisparadoresSocio({
  socios,
}: {
  socios: { id: string; nombre: string }[];
}) {
  const [state, action, pending] = useActionState(forzarEstadoSocio, null);

  if (socios.length === 0) {
    return <p className="text-sm text-ink-soft">Sin socios para forzar.</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">Socio</span>
        <select name="cliente_id" className={selCls}>
          {socios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11px] text-ink-soft">
          Estado a forzar
        </span>
        <select name="preset" className={selCls} defaultValue="cuota_por_vencer">
          {PRESETS.map((p) => (
            <option key={p.v} value={p.v}>
              {p.l}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="ghost" loading={pending}>
        {pending ? "…" : "Aplicar"}
      </Button>
      {state?.msg ? (
        <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
