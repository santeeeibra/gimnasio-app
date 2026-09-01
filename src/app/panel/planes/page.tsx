import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { Panel } from "@/components/ui";
import { PlanForm } from "./plan-form";
import { alternarPlan } from "./actions";

export default async function PlanesPage() {
  await requireDueno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, activo")
    .order("creado_at");

  const planes = (data ?? []) as {
    id: string;
    nombre: string;
    precio: number;
    duracion_dias: number;
    activo: boolean;
  }[];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Planes</h1>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Nuevo plan</h2>
        <PlanForm />
      </Panel>

      {planes.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no cargaste ningún plan.</p>
      ) : (
        <ul className="border border-rule rounded-[6px] divide-y divide-rule">
          {planes.map((p) => (
            <li
              key={p.id}
              className="px-4 py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {p.nombre}{" "}
                  {!p.activo ? (
                    <span className="text-xs text-ink-soft">(inactivo)</span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-soft">
                  ${p.precio} · {p.duracion_dias} días
                </p>
              </div>
              <form action={alternarPlan}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="activo" value={String(p.activo)} />
                <button className="text-xs underline underline-offset-2 text-ink-soft hover:text-ink">
                  {p.activo ? "Desactivar" : "Reactivar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
