import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
import { PlanesManager, type PlanItem } from "./planes-manager";

export default async function PlanesPage() {
  await requireDueno();
  const supabase = await createClient();

  // Intenta leer con columna descuentos (migración 0032). Si falla porque aún no fue corrida,
  // hace fallback seguro a las columnas base.
  let planesRaw: any[] | null = null;
  const resConDescuentos = await supabase
    .from("planes")
    .select("id, nombre, precio, duracion_dias, activo, descuentos")
    .order("creado_at");

  if (resConDescuentos.error) {
    const res = await supabase
      .from("planes")
      .select("id, nombre, precio, duracion_dias, activo")
      .order("creado_at");
    planesRaw = res.data;
  } else {
    planesRaw = resConDescuentos.data;
  }

  const planes = (planesRaw ?? []) as unknown as PlanItem[];

  return (
    <div className="owner-screen stagger space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planes de socios</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Administrá las membresías y sus descuentos. Duración predeterminada:{" "}
          <strong className="text-ink font-medium">30 días corridos</strong>; podés personalizarla en cada plan. La suscripción de tu gimnasio está en{" "}
          <a href="/panel/plan" className={linkClasses.inline}>
            Mi plan
          </a>
          .
        </p>
      </div>

      <PlanesManager planes={planes} />
    </div>
  );
}
