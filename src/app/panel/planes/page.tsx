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
    <div className="stagger space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Planes de socios</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Los planes de membresía que les cobrás a tus socios. Por defecto están seteados a{" "}
          <strong className="text-ink font-medium">30 días corridos</strong> con descuentos
          configurables (estudiantes, jubilados, etc.). Para tu propio plan de la plataforma, andá a{" "}
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
