import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkClasses } from "@/components/ui";
import { ImportadorSocios } from "@/app/admin/gimnasios/[id]/importar-socios/importador-socios";
import { importarTandaSociosDuenoAction } from "./actions";
import { cupoSocios } from "@/lib/plataforma/cupo";

export const dynamic = "force-dynamic";

export default async function ImportarSociosDuenoPage() {
  const dueno = await requireDueno();
  const db = createAdminClient();

  const [{ data: gym }, { data: planesData }, { data: profilesExistentes }, cupo] =
    await Promise.all([
      db.from("gimnasios").select("id, nombre, slug").eq("id", dueno.gimnasio_id).single(),
      db
        .from("planes")
        .select("id, nombre")
        .eq("gimnasio_id", dueno.gimnasio_id)
        .eq("activo", true)
        .order("nombre"),
      db.from("profiles").select("dni").eq("gimnasio_id", dueno.gimnasio_id).eq("rol", "cliente"),
      cupoSocios(db, dueno.gimnasio_id),
    ]);

  const dnisExistentes = (profilesExistentes ?? []).map((p) => p.dni);
  const disponibles = cupo.max == null ? null : Math.max(0, cupo.max - cupo.usados);

  return (
    <div className="stagger">
      <Link href="/panel/clientes" className={`text-sm ${linkClasses.inline}`}>
        ← Volver a Clientes
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          Importación masiva de socios
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Subí una planilla con tus socios existentes (de Excel, otro sistema, etc.) y los
          cargamos todos de una.
        </p>
        {disponibles != null ? (
          <p className="text-xs text-ink-soft mt-1">
            Cupo disponible en tu plan: <b>{disponibles}</b> socios
            {cupo.plan ? ` (${cupo.plan})` : ""}.
          </p>
        ) : null}
      </div>

      <ImportadorSocios
        gimnasioId={gym?.id ?? dueno.gimnasio_id}
        gimnasioNombre={gym?.nombre ?? ""}
        gimnasioSlug={gym?.slug ?? ""}
        planes={(planesData ?? []) as { id: string; nombre: string }[]}
        dnisExistentes={dnisExistentes}
        importarAction={importarTandaSociosDuenoAction}
        volverHref="/panel/clientes"
        volverLabel="Ver mis clientes →"
      />
    </div>
  );
}
