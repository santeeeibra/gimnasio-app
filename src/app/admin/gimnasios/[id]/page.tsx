import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export default async function AdminGimnasioDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const { data: gym } = await db
    .from("gimnasios")
    .select("id, nombre, slug, estado, dias_aviso_morosidad, creado_at")
    .eq("id", id)
    .single();

  if (!gym) notFound();

  const [{ data: clientes }, { data: pagos }] = await Promise.all([
    db
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_vencimiento, en_prueba, profile:profiles(nombre, dni)",
      )
      .eq("gimnasio_id", id)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: true }),
    db
      .from("pagos")
      .select("id, monto, fecha_pago, cliente:clientes!inner(gimnasio_id)")
      .eq("cliente.gimnasio_id", id)
      .order("fecha_pago", { ascending: false })
      .limit(10),
  ]);

  await registrarAccionAdmin(admin.id, "ver_gym", id, {
    slug: gym.slug,
    socios: clientes?.length ?? 0,
  });

  const socios = (clientes ?? []) as unknown as {
    id: string;
    estado_cuota: string | null;
    fecha_vencimiento: string | null;
    en_prueba: boolean | null;
    profile: { nombre: string | null; dni: string | null } | null;
  }[];

  const ultimosPagos = (pagos ?? []) as unknown as {
    id: string;
    monto: number | null;
    fecha_pago: string | null;
  }[];

  return (
    <div className="stagger">
      <Link
        href="/admin/gimnasios"
        className="text-sm underline decoration-rule underline-offset-2 hover:decoration-ink"
      >
        ← Gimnasios
      </Link>

      <h1 className="mt-4 mb-1 text-lg">{gym.nombre ?? "(sin nombre)"}</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {gym.slug ?? "—"} · estado {gym.estado ?? "—"} · aviso morosidad{" "}
        {gym.dias_aviso_morosidad ?? "—"} días
      </p>

      <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-ink-soft">
        Socios ({socios.length})
      </h2>
      {socios.length === 0 ? (
        <p className="mb-8 text-sm text-ink-soft">Sin socios.</p>
      ) : (
        <ul className="card-cut mb-8 border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {socios.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate">
                  {s.profile?.nombre ?? "(sin nombre)"}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  DNI {s.profile?.dni ?? "—"}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-ink-soft">
                {s.en_prueba ? "prueba" : (s.estado_cuota ?? "—")}
                <br />
                {s.fecha_vencimiento
                  ? new Date(s.fecha_vencimiento).toLocaleDateString("es-AR")
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-ink-soft">
        Últimos pagos
      </h2>
      {ultimosPagos.length === 0 ? (
        <p className="text-sm text-ink-soft">Sin pagos registrados.</p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {ultimosPagos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="text-ink-soft">
                {p.fecha_pago
                  ? new Date(p.fecha_pago).toLocaleDateString("es-AR")
                  : "—"}
              </span>
              <span>
                {p.monto == null
                  ? "—"
                  : p.monto.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
