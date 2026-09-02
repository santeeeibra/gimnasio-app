import Link from "next/link";
import { requireDueno } from "@/lib/auth";
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

  const [{ data: gym }, cupo, { data: ultimoPago }] = await Promise.all([
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
      .select("id, estado, monto_ars, creado_at")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const estado = gym?.estado ?? "prueba";
  const plan = (gym?.plan ?? null) as {
    nombre: string;
    precio_mensual: number;
  } | null;
  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")
    : null;

  return (
    <div className="stagger max-w-lg space-y-6">
      <div>
        <Link
          href="/panel"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Resumen
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

      {ultimoPago ? (
        <p className="text-sm text-ink-soft">
          Último pago:{" "}
          <span
            className={
              ultimoPago.estado === "aprobado"
                ? "text-ok"
                : ultimoPago.estado === "rechazado"
                  ? "text-danger"
                  : "text-ink"
            }
          >
            {PAGO_ESTADO_LABEL[ultimoPago.estado] ?? ultimoPago.estado}
          </span>{" "}
          ·{" "}
          {new Date(ultimoPago.creado_at).toLocaleDateString("es-AR")}
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
        />
      </div>

      <div className="card-cut border border-rule bg-paper-2 p-5">
        <h2 className="mb-3 text-lg">¿Dudas con el plan?</h2>
        <SolicitarForm />
      </div>
    </div>
  );
}
