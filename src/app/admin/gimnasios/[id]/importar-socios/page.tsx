import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkClasses } from "@/components/ui";
import { ImportadorSocios } from "./importador-socios";
import { importarTandaSocios, registrarFinImportacion } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportarSociosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSuperadmin();
  const db = createAdminClient();

  // 1. Obtener datos del gimnasio
  const { data: gym } = await db
    .from("gimnasios")
    .select("id, nombre, slug")
    .eq("id", id)
    .single();

  if (!gym) notFound();

  // 2. Obtener planes cargados en este gimnasio
  const { data: planesData } = await db
    .from("planes")
    .select("id, nombre")
    .eq("gimnasio_id", id)
    .eq("activo", true)
    .order("nombre");

  // 3. Obtener DNIs de socios ya existentes en este gimnasio para validar en el preview
  const { data: profilesExistentes } = await db
    .from("profiles")
    .select("dni")
    .eq("gimnasio_id", id)
    .eq("rol", "cliente");

  const dnisExistentes = (profilesExistentes ?? []).map((p) => p.dni);

  return (
    <div className="stagger">
      <Link
        href={`/admin/gimnasios/${gym.id}`}
        className={`text-sm ${linkClasses.inline}`}
      >
        ← Volver a {gym.nombre ?? "gimnasio"}
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Importación masiva de socios
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Gimnasio: <b>{gym.nombre}</b> ({gym.slug})
        </p>
      </div>

      <ImportadorSocios
        gimnasioId={gym.id}
        gimnasioNombre={gym.nombre}
        gimnasioSlug={gym.slug}
        planes={(planesData ?? []) as { id: string; nombre: string }[]}
        dnisExistentes={dnisExistentes}
        importarAction={importarTandaSocios}
        onFinImportacion={registrarFinImportacion.bind(null, gym.id)}
        volverHref={`/admin/gimnasios/${gym.id}`}
        volverLabel="Ver gimnasio en soporte →"
      />
    </div>
  );
}
