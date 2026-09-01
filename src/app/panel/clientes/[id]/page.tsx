import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { Panel } from "@/components/ui";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import { PagoForm } from "./pago-form";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireDueno();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, estado_cuota, fecha_inicio, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  const [{ data: planesData }, { data: pagosData }] = await Promise.all([
    supabase
      .from("planes")
      .select("id, nombre, precio")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("pagos")
      .select("id, monto, fecha_pago, cubre_hasta, plan:planes(nombre)")
      .eq("cliente_id", id)
      .order("fecha_pago", { ascending: false }),
  ]);

  const c = cliente as any;
  const dias = diasRestantes(c.fecha_vencimiento);
  const estado = estadoDesdeDias(dias);
  const planes = (planesData ?? []) as {
    id: string;
    nombre: string;
    precio: number;
  }[];
  const pagos = (pagosData ?? []) as any[];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/panel/clientes"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Clientes
        </Link>
        <h1 className="text-3xl mt-2">{c.profile?.nombre}</h1>
        <p className="text-sm text-ink-soft">
          DNI {c.profile?.dni}
          {c.profile?.telefono ? ` · ${c.profile.telefono}` : ""}
        </p>
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="text-xs text-ink-soft">Estado</p>
            <p
              className={`text-lg font-display ${
                estado === "vencido"
                  ? "text-danger"
                  : estado === "por_vencer"
                    ? "text-warn"
                    : "text-ok"
              }`}
            >
              {ESTADO_LABEL[estado]}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Plan</p>
            <p className="text-lg">{c.plan?.nombre ?? "sin plan"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Vence</p>
            <p className="text-lg">
              {c.fecha_vencimiento ?? "—"}
              {dias !== null ? (
                <span className="text-sm text-ink-soft">
                  {" "}
                  ({dias < 0 ? `hace ${Math.abs(dias)} d` : `en ${dias} d`})
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Registrar un pago</h2>
        <PagoForm
          clienteId={c.id}
          planes={planes}
          planActual={c.plan_id}
        />
      </Panel>

      <div>
        <h2 className="text-lg mb-3">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin pagos registrados.</p>
        ) : (
          <ul className="border border-rule rounded-[6px] divide-y divide-rule text-sm">
            {pagos.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span>
                  {p.fecha_pago} · {p.plan?.nombre ?? "—"}
                </span>
                <span className="text-ink-soft">
                  ${p.monto} · cubre hasta {p.cubre_hasta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
