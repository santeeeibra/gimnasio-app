import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import { parseTema, temaToVars } from "@/lib/tema";
import {
  agruparItems,
  normalizarCodigo,
  type PlantillaItem,
  type PlantillaRow,
} from "@/lib/rutina/plantillas";
import { CargarForm } from "./cargar-form";

export const dynamic = "force-dynamic";

export default async function RutinaCompartidaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const codigo = normalizarCodigo(slug);
  const admin = createAdminClient();

  const { data: plantillaData } = await admin
    .from("rutina_plantillas")
    .select(
      "id, gimnasio_id, nombre, codigo, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, items, activa, veces_cargada",
    )
    .eq("codigo", codigo)
    .maybeSingle();

  const plantilla = plantillaData as (PlantillaRow & { activa: boolean }) | null;

  if (!plantilla || !plantilla.activa) {
    return (
      <main className="min-h-dvh bg-paper text-ink flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-xl font-display">Rutina no disponible</h1>
          <p className="text-sm text-ink-soft">
            El código <span className="font-mono">{codigo}</span> no existe o el
            entrenador lo pausó.
          </p>
          <Link href="/login" className="inline-block text-sm text-accent underline underline-offset-2">
            Ir a iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  const { data: gym } = await admin
    .from("gimnasios")
    .select("nombre, logo_url, tema")
    .eq("id", plantilla.gimnasio_id)
    .maybeSingle();

  const tema = parseTema(gym?.tema);
  const profile = await getSessionProfile();
  const logueado = Boolean(profile);

  const dias = agruparItems(
    (plantilla.items ?? []) as PlantillaItem[],
    (plantilla.dias_titulos as string[] | null) ?? null,
  );
  const totalEjercicios = dias.reduce((n, d) => n + d.items.length, 0);
  const meta = [
    plantilla.objetivo,
    plantilla.nivel,
    plantilla.dias_por_semana ? `${plantilla.dias_por_semana} días` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div style={temaToVars(tema)} className="min-h-dvh bg-paper text-ink">
      <main className="mx-auto max-w-md px-5 pt-8 pb-16 space-y-6">
        <header className="flex items-center gap-3">
          {gym?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gym.logo_url}
              alt={gym?.nombre ?? ""}
              className="size-12 rounded-[12px] object-contain border border-rule bg-paper-2"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-[12px] border border-rule bg-paper-2 text-accent">
              <Dumbbell className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
              Rutina de
            </p>
            <p className="truncate font-display text-lg text-ink">
              {gym?.nombre ?? "tu entrenador"}
            </p>
          </div>
        </header>

        <div className="rounded-[18px] border border-rule bg-paper-2 p-5 shadow-sm space-y-1">
          <h1 className="text-2xl font-display">{plantilla.nombre}</h1>
          <p className="text-sm text-ink-soft">
            {meta || "Plan de entrenamiento"} · {totalEjercicios} ejercicios
          </p>
        </div>

        <section className="rounded-[18px] border border-rule bg-paper-2 p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-ink">
            {logueado
              ? "Cargá esta rutina en tu cuenta:"
              : "Creá tu cuenta y empezá hoy:"}
          </p>
          <CargarForm codigo={plantilla.codigo} logueado={logueado} />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-ink-soft">
            Qué incluye
          </h2>
          {dias.map((d) => (
            <div
              key={d.numero}
              className="rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm"
            >
              <p className="mb-2 font-display text-base text-ink">{d.titulo}</p>
              <ul className="space-y-1.5">
                {d.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-ink">
                      {it.ejercicio_nombre ?? "Ejercicio"}
                    </span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {it.series ?? "-"} × {it.repeticiones ?? "-"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-ink-soft">
          Con SysGym seguís tus series, pesos y descansos. Gratis para vos.
        </p>
      </main>
    </div>
  );
}
