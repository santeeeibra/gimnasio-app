import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { DATOS_TRANSFERENCIA } from "@/lib/pagos/manual";
import {
  type TipoPago,
  TIPO_PAGO_LABEL,
  EARLY_BIRD_PCT,
  diasRestantesPrueba,
  enVentanaEarlyBird,
} from "@/lib/plataforma/precios";
import { estadoCobroAutomatico } from "@/lib/pagos/cobro-socio";
import { connectConfigurado } from "@/lib/pagos/mercadopago-connect";
import { MpConnectCard } from "./mp-connect-card";
import { SolicitarForm } from "./solicitar-form";
import { PagoForm } from "./pago-form";
import { TourDueno } from "./tour-dueno";

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

export default async function PanelPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const dueno = await requireDueno();
  const db = createAdminClient();
  const { mp: avisoMp } = await searchParams;
  const cobroAuto = await estadoCobroAutomatico(db, dueno.gimnasio_id);

  const [{ data: gym }, cupo, { data: pagosData }, { data: planesData }] =
    await Promise.all([
      db
        .from("gimnasios")
        .select(
          "estado, creado_at, plan_plataforma_id, plan_plataforma_vence_el, tour_pago_visto, plan:planes_plataforma(id, nombre, precio_mensual)",
        )
        .eq("id", dueno.gimnasio_id)
        .single(),
      cupoSocios(db, dueno.gimnasio_id),
      db
        .from("pagos_plataforma")
        .select(
          "id, tipo, estado, monto_ars, monto_original_ars, descuento_pct, dias, creado_at, confirmado_at, plan:planes_plataforma(nombre)",
        )
        .eq("gimnasio_id", dueno.gimnasio_id)
        .order("creado_at", { ascending: false })
        .limit(12),
      db
        .from("planes_plataforma")
        .select("id, nombre, max_socios, precio_mensual, orden")
        .eq("activo", true)
        .order("orden", { ascending: true })
        .order("precio_mensual", { ascending: true }),
    ]);

  const planes = ((planesData ?? []) as {
    id: string;
    nombre: string;
    max_socios: number | null;
    precio_mensual: number | string;
    orden: number;
  }[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    max_socios: p.max_socios == null ? null : Number(p.max_socios),
    precio_mensual: Number(p.precio_mensual),
    orden: Number(p.orden),
  }));

  const pagos = ((pagosData ?? []) as unknown as {
    id: string;
    tipo: string | null;
    estado: string;
    monto_ars: number | string;
    monto_original_ars: number | string | null;
    descuento_pct: number | string | null;
    dias: number;
    creado_at: string;
    confirmado_at: string | null;
    plan?: { nombre: string } | null;
  }[]).map((p) => ({
    ...p,
    tipo: (p.tipo ?? "plan_mensual") as TipoPago,
    monto_ars: Number(p.monto_ars),
    monto_original_ars:
      p.monto_original_ars == null ? null : Number(p.monto_original_ars),
    descuento_pct: Number(p.descuento_pct ?? 0),
    plan_nombre: p.plan?.nombre ?? null,
  }));

  // Estado por tipo de cargo: pendiente bloquea; para los cargos únicos, un
  // aprobado también (no se pagan dos veces).
  const estadoPorTipo: Record<TipoPago, "pendiente" | "aprobado" | null> = {
    plan_mensual: null,
    setup: null,
    premium: null,
  };
  for (const p of pagos) {
    if (p.estado === "pendiente") {
      estadoPorTipo[p.tipo] = "pendiente";
    } else if (
      p.estado === "aprobado" &&
      p.tipo !== "plan_mensual" &&
      estadoPorTipo[p.tipo] !== "pendiente"
    ) {
      estadoPorTipo[p.tipo] = "aprobado";
    }
  }

  const creadoAt = gym?.creado_at ?? null;
  const diasPrueba = creadoAt ? diasRestantesPrueba(creadoAt) : 0;
  const earlyBird = creadoAt ? enVentanaEarlyBird(creadoAt) : false;

  const estado = gym?.estado ?? "prueba";
  const planRaw = (gym?.plan ?? null) as {
    id?: string;
    nombre: string;
    precio_mensual: number | string;
  } | null;
  // Supabase devuelve numeric como string.
  let plan = planRaw
    ? {
        id: gym?.plan_plataforma_id ?? planRaw.id ?? null,
        nombre: planRaw.nombre,
        precio_mensual: Number(planRaw.precio_mensual),
      }
    : null;

  // Si está en período de prueba o sin plan explícito, el free tier activa el Plan Básico
  if (!plan && estado === "prueba") {
    const planBasico = planes.find((p) => p.nombre === "Básico");
    if (planBasico) {
      plan = {
        id: planBasico.id,
        nombre: planBasico.nombre,
        precio_mensual: planBasico.precio_mensual,
      };
    }
  }

  const finPruebaDate = creadoAt
    ? new Date(new Date(creadoAt).getTime() + 14 * 86_400_000)
    : null;
  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")
    : estado === "prueba" && finPruebaDate
      ? finPruebaDate.toLocaleDateString("es-AR")
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

      <dl data-tour="plan-estado" className="card-cut border border-rule bg-paper-2 p-5 text-sm">
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
          <dd>
            {plan?.nombre ?? "Básico"}
            {estado === "prueba" ? (
              <span className="ml-1.5 rounded bg-volt/10 px-1.5 py-0.5 text-xs font-medium text-ink">
                Free tier 14 días
              </span>
            ) : null}
          </dd>
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
              {estado === "prueba" ? (
                <span>
                  Gratis{" "}
                  <span className="text-xs text-ink-soft">
                    (luego{" "}
                    {plan.precio_mensual.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                    /mes)
                  </span>
                </span>
              ) : (
                `${plan.precio_mensual.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}/mes`
              )}
            </dd>
          </div>
        ) : null}
        {vence ? (
          <div className="flex justify-between gap-3 py-1.5">
            <dt className="text-ink-soft">
              {estado === "prueba" ? "Prueba vence" : "Vence"}
            </dt>
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
          {diasPrueba > 0
            ? `Prueba gratis (Plan Básico activo): te ${diasPrueba === 1 ? "queda" : "quedan"} ${diasPrueba} ${
                diasPrueba === 1 ? "día" : "días"
              }. Podés abonar tu plan o subir a Pro/Elite cuando quieras.`
            : "Tu prueba gratis terminó. Activá un plan para seguir operando."}
        </p>
      ) : null}

      {earlyBird ? (
        <p className="card-cut border border-rule bg-paper-2 p-4 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            Descuento early-bird −{EARLY_BIRD_PCT}%
          </span>{" "}
          si comprás en los primeros días de tu prueba. Aplica al plan mensual y
          al setup.
        </p>
      ) : null}

      <div data-tour="plan-catalogo" className="card-cut border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-lg">Catálogo y pago de planes</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Seleccioná el plan que mejor se adapte a tu gimnasio para abonar la
          suscripción mensual o contratar servicios adicionales.
        </p>
        <PagoForm
          alias={DATOS_TRANSFERENCIA.alias}
          titular={DATOS_TRANSFERENCIA.titular}
          planes={planes}
          planActualId={plan?.id ?? null}
          sociosActuales={cupo.usados}
          earlyBird={earlyBird}
          estadoPorTipo={estadoPorTipo}
        />
      </div>

      {cobroAuto.elite ? (
        <MpConnectCard
          vinculado={cobroAuto.vinculado}
          vinculadoAt={cobroAuto.vinculadoAt}
          collectorId={cobroAuto.collectorId}
          configurado={connectConfigurado()}
          aviso={avisoMp ?? null}
        />
      ) : null}

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
                      <span className="text-ink-soft">
                        · {TIPO_PAGO_LABEL[p.tipo]}
                        {p.tipo === "plan_mensual"
                          ? ` (${p.plan_nombre ? `Plan ${p.plan_nombre}` : "plan"} · ${p.dias} días)`
                          : ""}
                      </span>
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {fecha}
                      {p.descuento_pct > 0
                        ? ` · early-bird −${p.descuento_pct}%`
                        : ""}
                    </span>
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

      <TourDueno tourVistoInicial={Boolean(gym?.tour_pago_visto)} />
    </div>
  );
}
