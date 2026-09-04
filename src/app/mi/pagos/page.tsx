import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DatosTransferencia } from "@/components/mi/datos-transferencia";

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
      .select("id, fecha_vencimiento")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  const { data: pagosData } = cli
    ? await supabase
        .from("pagos")
        .select("id, monto, fecha_pago, cubre_hasta, plan:planes(nombre)")
        .eq("cliente_id", cli.id)
        .order("fecha_pago", { ascending: false })
    : { data: [] as any[] };

  const pagos = (pagosData ?? []) as any[];
  const cubiertoHasta = cli?.fecha_vencimiento ?? null;

  return (
    <main className="stagger max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl">Mis pagos</h1>
        <Link href="/mi" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Volver
        </Link>
      </div>

      {cubiertoHasta ? (
        <div className="card-cut border border-rule bg-paper-2 p-4">
          <p className="text-xs text-ink-soft">Tu cuota está paga hasta</p>
          <p className="font-display text-xl">{fecha(cubiertoHasta)}</p>
        </div>
      ) : null}

      <DatosTransferencia
        alias={gym?.pago_alias ?? null}
        cbu={gym?.pago_cbu ?? null}
        titular={gym?.pago_titular ?? null}
      />

      {pagos.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay pagos registrados.</p>
      ) : (
        <ul className="card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
          {pagos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fecha(p.fecha_pago)}</p>
                <p className="truncate text-xs text-ink-soft">
                  {p.plan?.nombre ?? "Plan"} · cubre hasta {fecha(p.cubre_hasta)}
                </p>
              </div>
              <span className="shrink-0 font-display text-sm tabular-nums">
                {money(Number(p.monto) || 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
