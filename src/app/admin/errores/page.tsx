import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
import {
  ORIGEN_LABEL,
  haceCuanto,
  type OrigenError,
} from "@/lib/admin/errores";

export const dynamic = "force-dynamic";

type Fila = {
  id: number;
  gimnasio_id: string | null;
  origen: string;
  mensaje: string;
  creado_en: string;
};

export default async function AdminErroresPage({
  searchParams,
}: {
  searchParams: Promise<{ gimnasio_id?: string }>;
}) {
  await requireSuperadmin();
  const db = createAdminClient();

  const { gimnasio_id: gimnasioId } = await searchParams;

  let erroresQuery = db
    .from("errores_app")
    .select("id, gimnasio_id, origen, mensaje, creado_en")
    .order("creado_en", { ascending: false })
    .limit(30);
  if (gimnasioId) erroresQuery = erroresQuery.eq("gimnasio_id", gimnasioId);

  const [{ data: errores }, { data: gyms }] = await Promise.all([
    erroresQuery,
    db.from("gimnasios").select("id, nombre"),
  ]);

  const nombrePorGym = new Map(
    ((gyms ?? []) as { id: string; nombre: string | null }[]).map((g) => [
      g.id,
      g.nombre ?? "(sin nombre)",
    ]),
  );

  const lista = (errores ?? []) as Fila[];

  const etiquetaOrigen = (o: string) =>
    ORIGEN_LABEL[o as OrigenError] ?? o;

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Errores</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Los últimos 30 problemas que registró la app. Sirven para el semáforo de
        la lista de gimnasios.
        {gimnasioId ? (
          <>
            {" "}
            Filtrado por{" "}
            <span className="text-ink">
              {nombrePorGym.get(gimnasioId) ?? "un gimnasio"}
            </span>
            .{" "}
            <Link href="/admin/errores" className={linkClasses.inline}>
              Ver todos
            </Link>
          </>
        ) : null}
      </p>

      {lista.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No hay errores registrados. Todo viene funcionando.
        </p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {lista.map((e) => (
            <li key={e.id} className="px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">
                  {etiquetaOrigen(e.origen)}
                </span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {haceCuanto(e.creado_en)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                {e.gimnasio_id
                  ? (nombrePorGym.get(e.gimnasio_id) ?? "Gimnasio desconocido")
                  : "Sin gimnasio asignado"}
              </p>
              <p className="mt-2 break-words text-sm text-ink-soft">
                {e.mensaje}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
