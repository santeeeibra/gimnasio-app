import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { DATOS_TRANSFERENCIA } from "@/lib/pagos/manual";
import { SolicitarForm } from "./solicitar-form";
import { PagoForm } from "./pago-form";

const PAGO_ESTADO_LABEL: Record<string, string> = {
  pendiente: "pendiente de confirmación",
  aprobado: "aprobado",
  rechazado: "rechazado",
};

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  prueba: "En prueba",
  activo: "Activo",
  solo_lectura: "Solo lectura",
};

export default async function PanelPlanPage() {
  const dueno = await requireDueno();
  const db = createAdminClient();

  const [{ data: gym }, cupo, { data: pagosData }] = await Promise.all([
    db
      .from("gimnasios")
      .select(
        "estado, plan_plataforma_vence_el, plan:planes_plataforma(nombre, precio_mensual)",
      )
      .eq("id", dueno.gimnasio_id)
      .single(),
    cupoSocios(db, dueno.gimnasio_id),
    db
      .from("pagos_plataforma")
      .select("id, estado, monto_ars, dias, creado_at, confirmado_at")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .order("creado_at", { ascending: false })
      .limit(12),
  ]);

  const pagos = ((pagosData ?? []) as {
    id: string;
    estado: string;
    monto_ars: number | string;
    dias: number;
    creado_at: string;
    confirmado_at: string | null;
  }[]).map((p) => ({ ...p, monto_ars: Number(p.monto_ars) }));

  const estado = gym?.estado ?? "prueba";
  const planRaw = (gym?.plan ?? null) as {
    nombre: string;
    precio_mensual: number | string;
  } | null;
  // Supabase devuelve numeric como string.
  const plan = planRaw
    ? { nombre: planRaw.nombre, precio_mensual: Number(planRaw.precio_mensual) }
    : null;
  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")
    : null;

  return (
    <div className="stagger max-w-lg space-y-6">
      <div>
        <Link href="/panel" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Resumen
        </Link>
        <h1 className="mt-2 text-2xl">Tu plan</h1>
      </div>

      <dl className="card-cut border border-rule bg-paper-2 p-5 text-sm">
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-ink-soft">Estado</dt>
          <dd
            className={estado === "solo_lectura" ? "text-danger" : undefined}
          >
            {ESTADO_LABEL[estado] ?? estado}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-ink-soft">Plan</dt>
          <dd>{plan?.nombre ?? "Sin plan asignado"}</dd>
        </div>
        <div className="flex justify-between gap-3 py-1.5">
          <dt className="text-ink-soft">Socios</dt>
          <dd className={cupo.ok ? undefined : "text-danger"}>
            {cupo.max == null
              ? `${cupo.usados} · sin límite`
              : `${cupo.usados} / ${cupo.max}`}
          </dd>
        </div>
        {plan && plan.precio_mensual > 0 ? (
          <div className="flex justify-between gap-3 py-1.5">
            <dt className="text-ink-soft">Precio</dt>
            <dd>
              {plan.precio_mensual.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
              /mes
            </dd>
          </div>
        ) : null}
        {vence ? (
          <div className="flex justify-between gap-3 py-1.5">
            <dt className="text-ink-soft">Vence</dt>
            <dd>{vence}</dd>
          </div>
        ) : null}
      </dl>

      {!cupo.ok ? (
        <p className="text-sm text-danger">
          Llegaste al tope de socios de tu plan. No vas a poder dar de alta más
          clientes hasta ampliarlo.
        </p>
      ) : estado === "prueba" ? (
        <p className="text-sm text-ink-soft">
          Estás en período de prueba. Cuando quieras, pedí la activación y te
          pasamos los planes disponibles.
        </p>
      ) : null}

      <div className="card-cut border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-lg">Pagar el plan</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Se registra el pago del período (30 días). Al confirmarse, tu plan se
          renueva y el gimnasio queda activo.
        </p>
        <PagoForm
          alias={DATOS_TRANSFERENCIA.alias}
          titular={DATOS_TRANSFERENCIA.titular}
          hayPendiente={pagos.some((p) => p.estado === "pendiente")}
        />
      </div>

      {pagos.length > 0 ? (
        <div className="card-cut border border-rule bg-paper-2 p-5">
          <h2 className="mb-3 text-lg">Historial de pagos</h2>
          <ul className="divide-y divide-rule text-sm">
            {pagos.map((p) => {
              const fecha = new Date(
                p.confirmado_at ?? p.creado_at,
              ).toLocaleDateString("es-AR");
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block">
                      {p.monto_ars.toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}{" "}
                      <span className="text-ink-soft">· {p.dias} días</span>
                    </span>
                    <span className="block text-xs text-ink-soft">{fecha}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs ${
                      p.estado === "aprobado"
                        ? "text-ok"
                        : p.estado === "rechazado"
                          ? "text-danger"
                          : "text-ink-soft"
                    }`}
                  >
                    {PAGO_ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="card-cut border border-rule bg-paper-2 p-5">
        <h2 className="mb-3 text-lg">¿Dudas con el plan?</h2>
        <SolicitarForm />
      </div>
    </div>
  );
}
