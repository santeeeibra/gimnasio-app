import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { linkClasses } from "@/components/ui";
import { VerificarPinModal } from "./verificar-pin-modal";
import { ListadoIngresos } from "./listado-ingresos";

export default async function IngresosPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("pin_ingresos, pin_ingresos_desactivado, logo_url, nombre")
    .eq("id", dueno.gimnasio_id)
    .single();

  const pinDesactivado = gym?.pin_ingresos_desactivado === true;

  // Solo se obliga a configurar PIN si no hay uno Y no se desactivó a propósito.
  if (!gym?.pin_ingresos && !pinDesactivado) {
    redirect("/panel/ingresos/configurar-pin");
  }

  return (
    <div>
      <h1 className="text-2xl mb-6">Ingresos</h1>

      {pinDesactivado ? (
        <p className="mb-4 text-sm">
          <Link
            href="/panel/ingresos/configurar-pin"
            className={linkClasses.inline}
          >
            Activar PIN de nuevo
          </Link>
        </p>
      ) : (
        /* Modal de verificación de PIN - se muestra en el cliente */
        <VerificarPinModal />
      )}

      {/* Listado de ingresos - solo se renderiza después de verificar el PIN
          (o directamente si el PIN está desactivado) */}
      <ListadoIngresos
        gimnasioNombre={gym?.nombre ?? ""}
        logoUrl={gym?.logo_url ?? null}
        pinRequerido={!pinDesactivado}
      />
    </div>
  );
}
