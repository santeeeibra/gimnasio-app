import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTema } from "@/lib/tema";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { diasRestantes } from "@/lib/cuota";
import { AjustesForm } from "./ajustes-form";
import { AvisoMorosidadForm } from "./aviso-morosidad-form";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";

const ESTADO_LABEL: Record<string, string> = {
  prueba: "En prueba",
  activo: "Activo",
  solo_lectura: "Solo lectura",
};

export default async function AjustesPage() {
  const profile = await requireDueno();
  const supabase = await createClient();
  const db = createAdminClient();

  const [{ data: gym }, cupo, { data: planPlat }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select(
        "id, nombre, tema, logo_url, dias_aviso_morosidad, estado, plan_plataforma_vence_el",
      )
      .eq("id", profile.gimnasio_id)
      .single(),
    cupoSocios(db, profile.gimnasio_id),
    db
      .from("gimnasios")
      .select("plan:planes_plataforma(nombre)")
      .eq("id", profile.gimnasio_id)
      .single(),
  ]);

  const estado = gym?.estado ?? "prueba";
  const planNombre =
    (planPlat?.plan as unknown as { nombre: string } | null)?.nombre ?? null;
  const venceDias = diasRestantes(gym?.plan_plataforma_vence_el ?? null);
  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")
    : null;

  return (
    <div className="stagger">
      <h1 className="text-3xl mb-2">Ajustes</h1>
      <p className="text-sm text-ink-soft mb-6">
        Tu plan, el aviso de vencimiento y el tema del gimnasio.
      </p>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg">Tu plan</h2>
          <Link
            href="/panel/plan"
            className="shrink-0 text-sm underline underline-offset-2 decoration-rule hover:decoration-ink"
          >
            Ver y pagar →
          </Link>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-soft">Estado</dt>
            <dd className={estado === "solo_lectura" ? "text-danger" : undefined}>
              {ESTADO_LABEL[estado] ?? estado}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">Plan</dt>
            <dd>{planNombre ?? "Sin plan"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">Socios</dt>
            <dd className={cupo.ok ? undefined : "text-danger"}>
              {cupo.max == null
                ? `${cupo.usados}`
                : `${cupo.usados} / ${cupo.max}`}
            </dd>
          </div>
          {vence ? (
            <div className="flex gap-2">
              <dt className="text-ink-soft">Vence</dt>
              <dd
                className={
                  venceDias !== null && venceDias <= 7
                    ? "text-warn"
                    : undefined
                }
              >
                {vence}
              </dd>
            </div>
          ) : null}
        </dl>

        {estado === "solo_lectura" ? (
          <p className="mt-3 text-sm text-danger">
            Tu gimnasio está en solo lectura. Pagá el plan para reactivarlo.
          </p>
        ) : !cupo.ok ? (
          <p className="mt-3 text-sm text-danger">
            Llegaste al tope de socios de tu plan.
          </p>
        ) : estado === "prueba" ? (
          <p className="mt-3 text-sm text-ink-soft">
            Estás en período de prueba. Activá tu plan cuando quieras.
          </p>
        ) : venceDias !== null && venceDias <= 7 ? (
          <p className="mt-3 text-sm text-warn">
            Tu plan vence pronto. Registrá el pago para no quedar en solo
            lectura.
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <VerTutorialDeNuevo />
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

      <div className="card-cut card-cut-lg mt-6 border border-rule bg-paper-2 p-6">
        <h2 className="text-lg mb-4">Tema del gimnasio</h2>
        <p className="text-sm text-ink-soft mb-4">
          Colores y tipografía. Se aplican en tu panel y en la app de tus
          clientes.
        </p>
        {gym ? (
          <AjustesForm
            gimnasioId={gym.id}
            tema={parseTema(gym.tema)}
            logoUrl={gym.logo_url ?? null}
          />
        ) : null}
      </div>
    </div>
  );
}
