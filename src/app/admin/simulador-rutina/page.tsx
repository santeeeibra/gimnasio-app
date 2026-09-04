import { requireSuperadmin } from "@/lib/auth";
import { SimuladorForm } from "./simulador-form";

export const dynamic = "force-dynamic";

export default async function AdminSimuladorRutinaPage() {
  await requireSuperadmin();

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Simulador de rutinas</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Corre el motor con las mismas variables que el form del cliente, sin
        crear un socio y sin escribir en <code>rutinas</code> /{" "}
        <code>rutina_items</code>. Solo visible para soporte.
      </p>
      <SimuladorForm />
    </div>
  );
}
