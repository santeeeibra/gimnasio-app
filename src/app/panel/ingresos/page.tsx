import { redirect } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui";
import { VerificarPinModal } from "./verificar-pin-modal";
import { ListadoIngresos } from "./listado-ingresos";

export default async function IngresosPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("pin_ingresos, logo_url, nombre")
    .eq("id", dueno.gimnasio_id)
    .single();

  // Si no tiene PIN configurado, redirigir a configurar
  if (!gym?.pin_ingresos) {
    redirect("/panel/ingresos/configurar-pin");
  }

  return (
    <div>
      <h1 className="text-2xl mb-6">Ingresos</h1>
      
      {/* Modal de verificación de PIN - se muestra en el cliente */}
      <VerificarPinModal />
      
      {/* Listado de ingresos - solo se renderiza después de verificar el PIN */}
      <ListadoIngresos
        gimnasioNombre={gym?.nombre ?? ''}
        logoUrl={gym?.logo_url ?? null}
      />
    </div>
  );
}
