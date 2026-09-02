import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui";
import { parseTema } from "@/lib/tema";
import { AjustesForm } from "./ajustes-form";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";

export default async function AjustesPage() {
  const profile = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("id, nombre, tema, logo_url")
    .eq("id", profile.gimnasio_id)
    .single();

  return (
    <div>
      <h1 className="text-3xl mb-2">Ajustes</h1>
      <p className="text-sm text-ink-soft mb-4">
        Personalizá los colores y la tipografía de tu gimnasio. Los cambios se
        aplican en tu panel y en la app de tus clientes.
      </p>
      <div className="mb-8">
        <VerTutorialDeNuevo />
      </div>

      <Panel className="p-6">
        <h2 className="text-lg mb-4">Tema del gimnasio</h2>
        {gym ? (
          <AjustesForm
            gimnasioId={gym.id}
            tema={parseTema(gym.tema)}
            logoUrl={gym.logo_url ?? null}
          />
        ) : null}
      </Panel>
    </div>
  );
}
