import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanForm, type PlanRow } from "./plan-form";

export const dynamic = "force-dynamic";

export default async function AdminPlanesPage() {
  await requireSuperadmin();
  const db = createAdminClient();

  const { data } = await db
    .from("planes_plataforma")
    .select("id, nombre, max_socios, precio_mensual, activo, orden")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });

  const planes = (data ?? []) as PlanRow[];

  // Socios por gimnasio con plan asignado, para mostrar cuántos gyms usa cada
  // plan (referencia rápida, no bloquea nada).
  const { data: gyms } = await db
    .from("gimnasios")
    .select("plan_plataforma_id")
    .not("plan_plataforma_id", "is", null);
  const usoPorPlan = new Map<string, number>();
  for (const g of gyms ?? []) {
    const k = (g as { plan_plataforma_id: string }).plan_plataforma_id;
    usoPorPlan.set(k, (usoPorPlan.get(k) ?? 0) + 1);
  }

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Planes de plataforma</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Catálogo global. <code>Máx. socios</code> vacío = ilimitado. El precio es
        informativo (no hay cobro automático todavía). El cupo se aplica al dar
        de alta clientes cuando esté la fase 3.
      </p>

      <ul className="card-cut mb-8 border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
        {planes.length === 0 ? (
          <li className="px-5 py-4 text-sm text-ink-soft">Sin planes.</li>
        ) : (
          planes.map((p) => (
            <li key={p.id} className="px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                  {p.nombre}
                  {!p.activo ? (
                    <span className="ml-2 text-xs text-ink-soft">(inactivo)</span>
                  ) : null}
                </span>
                <span className="text-xs text-ink-soft">
                  {p.max_socios == null ? "sin límite" : `tope ${p.max_socios}`}
                  {" · "}
                  {p.precio_mensual.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                  /mes
                  {" · "}
                  {usoPorPlan.get(p.id) ?? 0} gyms
                </span>
              </div>
              <PlanForm plan={p} />
            </li>
          ))
        )}
      </ul>

      <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-ink-soft">
        Nuevo plan
      </h2>
      <div className="card-cut border border-rule bg-paper-2 p-5">
        <PlanForm />
      </div>
    </div>
  );
}
