"use client";

import { useActionState } from "react";
import { cambiarEstadoGimnasio } from "../../actions";
import { Button } from "@/components/ui";
import { hapticoImpactoMedio, hapticoError } from "@/lib/ui/hapticos";

const OPCIONES: { value: string; label: string }[] = [
  { value: "prueba", label: "Prueba" },
  { value: "activo", label: "Activo" },
  { value: "solo_lectura", label: "Solo lectura" },
  { value: "suspendido", label: "Suspendido (corta el login)" },
];

export function EstadoForm({
  gimnasioId,
  gimnasioNombre,
  estadoActual,
}: {
  gimnasioId: string;
  gimnasioNombre: string;
  estadoActual: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    cambiarEstadoGimnasio,
    null,
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const estado = new FormData(e.currentTarget).get("estado");
        if (estado === "suspendido") {
          const ok = window.confirm(
            `¿Suspender "${gimnasioNombre || "este gimnasio"}"?\n\n` +
              "Corta el acceso de login del dueño Y de todos los socios: " +
              'van a ver "contactá a soporte". El dueño NO puede revertirlo solo.',
          );
          if (!ok) {
            e.preventDefault();
            hapticoError();
            return;
          }
        }
        hapticoImpactoMedio();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <select
        name="estado"
        defaultValue={estadoActual ?? "prueba"}
        className="h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-ink"
      >
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Button type="submit" loading={pending}>
        {pending ? "Guardando…" : "Cambiar estado"}
      </Button>
      {state?.msg ? (
        <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
