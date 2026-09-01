import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui";
import { AjustesForm } from "./ajustes-form";

export default async function AjustesPage() {
  const profile = await requireDueno();
  const supabase = await createClient();
  
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("id, nombre, color_primario, color_acento, color_fondo")
    .eq("id", profile.gimnasio_id)
    .single();

  return (
    <div>
      <h1 className="text-3xl mb-2">Ajustes</h1>
      <p className="text-sm text-ink-soft mb-8">
        Personalizá los colores de tu gimnasio. Los cambios se aplican
        inmediatamente en tu panel y en la app de tus clientes.
      </p>

      <Panel className="p-6 max-w-4xl">
        <h2 className="text-lg mb-4">Colores del gimnasio</h2>
        {gym ? <AjustesForm gimnasio={gym} /> : null}
      </Panel>
    </div>
  );
}
