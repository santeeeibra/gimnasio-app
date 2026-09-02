import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDueno } from "@/lib/auth";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { AltaForm } from "./alta-form";
import { ClienteRow, type ClienteVista } from "./cliente-row";

export default async function ClientesPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();
  const cupo = await cupoSocios(createAdminClient(), dueno.gimnasio_id);

  const [{ data: clientesData }, { data: planesData }, { data: registrosData }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select(
          "id, estado_cuota, fecha_vencimiento, plan_id, en_prueba, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
        )
        .order("fecha_vencimiento", { ascending: true, nullsFirst: true }),
      supabase
        .from("planes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("registros_entrada").select("cliente_id"),
    ]);

  const clientes = (clientesData ?? []) as unknown as ClienteVista[];
  const planes = (planesData ?? []) as { id: string; nombre: string }[];
  const conIngreso = new Set(
    ((registrosData ?? []) as { cliente_id: string }[]).map((r) => r.cliente_id),
  );

  return (
    <div className="stagger space-y-10">
      <div>
        <h1 className="text-3xl mb-1">Clientes</h1>
        <p className="text-sm text-ink-soft">{clientes.length} en total</p>
      </div>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg">Nuevo cliente</h2>
          {cupo.max != null ? (
            <span
              className={`text-xs ${cupo.ok ? "text-ink-soft" : "text-danger"}`}
            >
              {cupo.usados} / {cupo.max} socios
            </span>
          ) : null}
        </div>
        {planes.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Primero creá al menos un plan en la sección Planes.
          </p>
        ) : (
          <AltaForm planes={planes} full={!cupo.ok} />
        )}
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay clientes cargados.</p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {clientes.map((c) => (
            <ClienteRow
              key={c.id}
              cliente={c}
              pruebaVencida={!!c.en_prueba && conIngreso.has(c.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
