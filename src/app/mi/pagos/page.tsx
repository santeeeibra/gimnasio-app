import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DatosTransferencia } from "@/components/mi/datos-transferencia";
import { createAdminClient } from "@/lib/supabase/admin";
import { estadoCobroAutomatico } from "@/lib/pagos/cobro-socio";
import { PagarMpButton } from "./pagar-mp-button";

export const dynamic = "force-dynamic";

const money = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const fecha = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default async function MisPagosPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: gym }, { data: cli }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("pago_alias, pago_cbu, pago_titular")
      .eq("id", profile.gimnasio_id)
      .single(),
    supabase
      .from("clientes")
      .select("id, email, mp_preapproval_id, fecha_vencimiento, plan:planes(nombre, precio)")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  // El gate del cobro automático lee columnas sensibles (token de MP), así que
  // va con service_role y nunca baja al cliente: sólo el booleano.
  const cobroAuto = await estadoCobroAutomatico(
    createAdminClient(),
    profile.gimnasio_id,
  );
  const planSocio = (cli as any)?.plan as
    | { nombre: string; precio: number | string }
    | null
    | undefined;
  const montoCuota = Number(planSocio?.precio ?? 0);
  const puedePagarOnline = cobroAuto.activo && Boolean(planSocio) && montoCuota > 0;

  const { data: pagosData } = cli
    ? await supabase
        .from("pagos")
        .select("id, monto, fecha_pago, cubre_hasta, plan:planes(nombre)")
        .eq("cliente_id", cli.id)
        .eq("estado", "confirmado")
        .order("fecha_pago", { ascending: false })
    : { data: [] as any[] };

  const pagos = (pagosData ?? []) as any[];
  const cubiertoHasta = cli?.fecha_vencimiento ?? null;

  return (
    <main className="stagger max-w-md mx-auto p-5 pb-24 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-ink">Mis pagos</h1>
        <Link href="/mi" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4 shrink-0" />
          Volver
        </Link>
      </div>

      {cubiertoHasta ? (
        <div
          className={`rounded-[14px] border p-5 shadow-sm ${
            new Date(cubiertoHasta + "T23:59:59") < new Date()
              ? "border-danger/40 bg-danger/5"
              : "border-rule bg-paper-2"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wider ${
              new Date(cubiertoHasta + "T23:59:59") < new Date() ? "text-danger" : "text-ink-soft"
            }`}
          >
            {new Date(cubiertoHasta + "T23:59:59") < new Date()
              ? "Tu cuota venció el"
              : "Tu cuota está paga hasta"}
          </p>
          <p
            className={`font-display text-2xl font-extrabold mt-1 ${
              new Date(cubiertoHasta + "T23:59:59") < new Date() ? "text-danger" : "text-ink"
            }`}
          >
            {fecha(cubiertoHasta)}
          </p>
        </div>
      ) : null}

      {puedePagarOnline ? (
        <PagarMpButton
          monto={montoCuota}
          plan={planSocio!.nombre}
          clienteId={cli?.id}
          email={cli?.email}
          suscrito={Boolean(cli?.mp_preapproval_id)}
        />
      ) : null}

      <DatosTransferencia
        alias={gym?.pago_alias ?? null}
        cbu={gym?.pago_cbu ?? null}
        titular={gym?.pago_titular ?? null}
      />

      {pagos.length === 0 ? (
        <div className="rounded-[14px] border border-rule bg-paper-2 p-8 text-center text-sm text-ink-soft shadow-sm">
          Todavía no hay pagos registrados.
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft px-1">Historial de pagos</p>
          <ul className="overflow-hidden rounded-[14px] border border-rule bg-paper-2 divide-y divide-rule shadow-sm">
            {pagos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{fecha(p.fecha_pago)}</p>
                  <p className="truncate text-xs text-ink-soft mt-0.5">
                    {p.plan?.nombre ?? "Plan"} · cubre hasta {fecha(p.cubre_hasta)}
                  </p>
                </div>
                <span className="shrink-0 font-hero text-base font-bold tabular-nums text-ink">
                  {money(Number(p.monto) || 0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
