import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema } from "@/lib/tema";
import { AjustesForm } from "./ajustes-form";
import { AvisoMorosidadForm } from "./aviso-morosidad-form";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";

export default async function AjustesPage() {
  const profile = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("id, nombre, tema, logo_url, dias_aviso_morosidad")
    .eq("id", profile.gimnasio_id)
    .single();

  return (
    <div className="stagger">
      <h1 className="text-3xl mb-2">Ajustes</h1>
      <p className="text-sm text-ink-soft mb-4">
        Personalizá los colores y la tipografía de tu gimnasio. Los cambios se
        aplican en tu panel y en la app de tus clientes.
      </p>
      <div className="mb-8">
        <VerTutorialDeNuevo />
      </div>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <h2 className="text-lg mb-4">Tema del gimnasio</h2>
        {gym ? (
          <AjustesForm
            gimnasioId={gym.id}
            tema={parseTema(gym.tema)}
            logoUrl={gym.logo_url ?? null}
          />
        ) : null}
      </div>

      {gym ? (
        <div className="card-cut card-cut-lg mt-6 border border-rule bg-paper-2 p-6">
          <h2 className="text-lg mb-1">Aviso de vencimiento</h2>
          <p className="text-sm text-ink-soft mb-4">
            Mandamos un push automático al socio unos días antes de que se le
            venza la cuota, para que la renueve a tiempo.
          </p>
          <AvisoMorosidadForm
            gimnasioId={gym.id}
            diasAviso={gym.dias_aviso_morosidad ?? 5}
          />
        </div>
      ) : null}
    </div>
  );
}
