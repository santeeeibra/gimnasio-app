import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperadmin } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
import {
  ORIGEN_LABEL,
  haceCuanto,
  humanizarError,
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
      <h1 className="mb-1 text-lg font-bold">Errores y Avisos del Sistema</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Los últimos 30 incidentes registrados en la plataforma con diagnóstico automático.
        {gimnasioId ? (
          <>
            {" "}
            Filtrado por{" "}
            <span className="text-ink font-medium">
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
          No hay errores registrados. Todo viene funcionando con normalidad.
        </p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {lista.map((e) => {
            const info = humanizarError(e.mensaje);
            return (
              <li key={e.id} className="px-5 py-4 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
                      {etiquetaOrigen(e.origen)}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {info.titulo}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {haceCuanto(e.creado_en)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-ink-soft flex-wrap">
                  <span className="font-medium">
                    {e.gimnasio_id
                      ? (nombrePorGym.get(e.gimnasio_id) ?? "Gimnasio desconocido")
                      : "Sin gimnasio asignado"}
                  </span>
                  {info.codigo && (
                    <>
                      <span>•</span>
                      <span className="font-mono bg-paper px-1.5 py-0.5 rounded border border-rule text-[11px]">
                        Código: {info.codigo}
                      </span>
                    </>
                  )}
                </div>

                <p className="text-sm text-ink-soft leading-relaxed">
                  {info.mensajeClaro}
                </p>

                {info.detalleTecnico && (
                  <details className="text-xs group pt-1">
                    <summary className="cursor-pointer text-ink-soft/80 hover:text-ink font-medium select-none flex items-center gap-1.5 transition-colors">
                      <span>▶ Ver detalle técnico</span>
                    </summary>
                    <pre className="mt-2 p-2.5 rounded-[8px] bg-paper font-mono text-[11px] text-ink-soft border border-rule overflow-x-auto whitespace-pre-wrap break-all">
                      {info.detalleTecnico}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
