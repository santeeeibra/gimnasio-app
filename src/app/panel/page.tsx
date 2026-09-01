import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { diasRestantes } from "@/lib/cuota";
import { ClienteRow, type ClienteVista } from "./clientes/cliente-row";

export default async function ResumenPage() {
  await requireDueno();
  const supabase = await createClient();

  const { data } = await supabase
    .from("clientes")
    .select(
      "id, estado_cuota, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
    )
    .order("fecha_vencimiento", { ascending: true, nullsFirst: true });

  const clientes = (data ?? []) as unknown as ClienteVista[];
  const total = clientes.length;
  const alDia = clientes.filter((c) => c.estado_cuota === "al_dia").length;
  const porVencer = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d !== null && d >= 0 && d <= 6;
  });
  const vencidos = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d === null || d < 0;
  });

  const stats = [
    { n: total, l: "clientes activos" },
    { n: alDia, l: "al día" },
    { n: porVencer.length, l: "por vencer", alert: porVencer.length > 0 },
    { n: vencidos.length, l: "con cuota vencida", alert: vencidos.length > 0 },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-3xl">Resumen</h1>
        <Link href="/panel/clientes" className="text-sm underline underline-offset-2">
          Ver todos
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule rounded-[6px] overflow-hidden mb-10">
        {stats.map((s) => (
          <div key={s.l} className="bg-white p-4">
            <p
              className={`font-display text-3xl ${s.alert ? "text-danger" : ""}`}
            >
              {s.n}
            </p>
            <p className="text-xs text-ink-soft mt-1">{s.l}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg mb-3">Atención esta semana</h2>
      {porVencer.length === 0 && vencidos.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nadie con la cuota por vencer. Todo en orden.
        </p>
      ) : (
        <ul className="border border-rule rounded-[6px] divide-y divide-rule">
          {[...vencidos, ...porVencer].map((c) => (
            <ClienteRow key={c.id} cliente={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
