import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { Panel } from "@/components/ui";
import { AltaForm } from "./alta-form";
import { ClienteRow, type ClienteVista } from "./cliente-row";

export default async function ClientesPage() {
  await requireDueno();
  const supabase = await createClient();

  const [{ data: clientesData }, { data: planesData }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
      )
      .order("fecha_vencimiento", { ascending: true, nullsFirst: true }),
    supabase.from("planes").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const clientes = (clientesData ?? []) as unknown as ClienteVista[];
  const planes = (planesData ?? []) as { id: string; nombre: string }[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl mb-1">Clientes</h1>
        <p className="text-sm text-ink-soft">{clientes.length} en total</p>
      </div>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Nuevo cliente</h2>
        {planes.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Primero creá al menos un plan en la sección Planes.
          </p>
        ) : (
          <AltaForm planes={planes} />
        )}
      </Panel>

      {clientes.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay clientes cargados.</p>
      ) : (
        <ul className="border border-rule rounded-[6px] divide-y divide-rule bg-paper-2 overflow-hidden">
          {clientes.map((c) => (
            <ClienteRow key={c.id} cliente={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
