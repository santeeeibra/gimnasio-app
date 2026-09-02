import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Gym = {
  id: string;
  nombre: string | null;
  slug: string | null;
  estado: string | null;
  creado_at: string | null;
};

export default async function AdminGimnasiosPage() {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const [{ data: gyms }, { data: clientes }] = await Promise.all([
    db
      .from("gimnasios")
      .select("id, nombre, slug, estado, creado_at")
      .order("creado_at", { ascending: true }),
    db.from("clientes").select("gimnasio_id, estado_cuota, en_prueba"),
  ]);

  await registrarAccionAdmin(admin.id, "listar_gyms", null, {
    total: gyms?.length ?? 0,
  });

  const porGym = new Map<string, { total: number; vencidos: number }>();
  for (const c of (clientes ?? []) as {
    gimnasio_id: string;
    estado_cuota: string | null;
  }[]) {
    const g = porGym.get(c.gimnasio_id) ?? { total: 0, vencidos: 0 };
    g.total += 1;
    if (c.estado_cuota === "vencida") g.vencidos += 1;
    porGym.set(c.gimnasio_id, g);
  }

  const lista = (gyms ?? []) as Gym[];

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Gimnasios</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {lista.length} en total. Vista de soporte, solo lectura.
      </p>

      {lista.length === 0 ? (
        <p className="text-sm text-ink-soft">No hay gimnasios.</p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {lista.map((g) => {
            const stats = porGym.get(g.id) ?? { total: 0, vencidos: 0 };
            return (
              <li key={g.id}>
                <Link
                  href={`/admin/gimnasios/${g.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base">
                      {g.nombre ?? "(sin nombre)"}
                    </span>
                    <span className="block truncate text-xs text-ink-soft">
                      {g.slug ?? "—"} · {g.estado ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-ink-soft">
                    {stats.total} socios
                    <br />
                    {stats.vencidos} vencidos
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
