import { requireSuperadmin } from "@/lib/auth";
import { PushPruebaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AdminPushPruebaPage() {
  await requireSuperadmin();

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Push de prueba</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Se envía solo a los dispositivos que vos tenés suscriptos (mismo perfil
        de superadmin). No llega a ningún cliente ni dueño.
      </p>
      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <PushPruebaForm />
      </div>
    </div>
  );
}
