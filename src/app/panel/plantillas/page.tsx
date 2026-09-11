import Link from "next/link";
import { ChevronLeft, Share2 } from "lucide-react";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pillClasses } from "@/components/ui";
import { PlantillasClient } from "./plantillas-client";

export const dynamic = "force-dynamic";

export default async function PlantillasPage() {
  const profile = await requireDueno();
  const supabase = await createClient();

  const { data } = await supabase
    .from("rutina_plantillas")
    .select("id, nombre, codigo, objetivo, nivel, dias_por_semana, activa, veces_cargada, creada_at")
    .eq("gimnasio_id", profile.gimnasio_id)
    .order("creada_at", { ascending: false });

  const plantillas = (data ?? []) as {
    id: string;
    nombre: string;
    codigo: string;
    objetivo: string | null;
    nivel: string | null;
    dias_por_semana: number | null;
    activa: boolean;
    veces_cargada: number;
    creada_at: string;
  }[];

  return (
    <main className="stagger max-w-md mx-auto px-5 pt-6 pb-28 space-y-6">
      <div>
        <Link href="/panel" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Volver
        </Link>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-rule bg-paper-2 text-accent">
            <Share2 aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl">Rutinas para compartir</h1>
            <p className="text-sm text-ink-soft">
              Publicá una rutina como plantilla y pasás el link o el código a tus
              alumnos. Cada uno la carga en un tap y queda como socio tuyo.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm">
        <p className="text-sm text-ink">
          Para crear una plantilla nueva: armá la rutina en{" "}
          <Link href="/mi/rutina" className="font-medium text-accent underline underline-offset-2">
            Tu rutina
          </Link>{" "}
          y tocá <span className="font-medium">“Compartir con alumnos”</span>.
        </p>
      </div>

      <PlantillasClient plantillas={plantillas} />
    </main>
  );
}
