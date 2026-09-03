import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ComposeForm } from "./compose-form";

export default async function MensajesPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const [{ data: planesData }, { data: clientesData }, { data: msgsData }] =
    await Promise.all([
      supabase
        .from("planes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("clientes")
        .select("profile_id, plan_id, profile:profiles(nombre)")
        .eq("gimnasio_id", dueno.gimnasio_id),
      supabase
        .from("mensajes")
        .select(
          "id, cuerpo, es_masivo, respondible, creado_at, filtro_plan_id, destinatarios:mensaje_destinatarios(leido)",
        )
        .eq("remitente_id", dueno.id)
        .order("creado_at", { ascending: false }),
    ]);

  const planes = (planesData ?? []) as { id: string; nombre: string }[];
  const planNombre = new Map(planes.map((p) => [p.id, p.nombre]));
  const clientes = ((clientesData ?? []) as any[]).map((c) => ({
    profile_id: c.profile_id as string,
    plan_id: (c.plan_id ?? null) as string | null,
    nombre: (c.profile?.nombre ?? "—") as string,
  }));
  const mensajes = (msgsData ?? []) as unknown as {
    id: string;
    cuerpo: string;
    es_masivo: boolean;
    respondible: boolean;
    creado_at: string;
    filtro_plan_id: string | null;
    destinatarios: { leido: boolean }[];
  }[];

  return (
    <div className="stagger space-y-8">
      <h1 className="text-2xl">Mensajes</h1>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
        <h2 className="text-lg mb-4">Nuevo mensaje</h2>
        <ComposeForm planes={planes} clientes={clientes} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg">Enviados</h2>
        {mensajes.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no enviaste mensajes.</p>
        ) : (
          <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule">
            {mensajes.map((m) => {
              const total = m.destinatarios.length;
              const leidos = m.destinatarios.filter((d) => d.leido).length;
              const destino = !m.es_masivo
                ? "Individual"
                : m.filtro_plan_id
                  ? `Plan ${planNombre.get(m.filtro_plan_id) ?? ""}`
                  : "Todos";
              return (
                <li key={m.id}>
                  <Link
                    href={`/panel/mensajes/${m.id}`}
                    className="block px-4 py-3 hover:bg-paper-2"
                  >
                    <p className="text-sm line-clamp-2">{m.cuerpo}</p>
                    <p className="text-xs text-ink-soft mt-1">
                      {destino} · leído {leidos}/{total}
                      {m.respondible ? " · admite respuestas" : ""} ·{" "}
                      {new Date(m.creado_at).toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
