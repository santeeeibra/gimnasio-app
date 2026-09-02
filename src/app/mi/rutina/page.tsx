import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  NIVEL_LABEL,
  OBJETIVO_LABEL,
  type Ejercicio,
  type Enfasis,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

type Prefs = {
  equipo?: PreferenciaEquipo;
  sexo?: Sexo;
  enfasis?: Enfasis[];
} | null;
import { generarMiRutina } from "./actions";
import { GenerarRutinaForm } from "./generar-form";
import { RutinaEditor, type DiaEditable } from "./rutina-editor";
import { BuilderManual } from "./builder-manual";
import { BannerMotivacional } from "@/components/rutinas/banner-motivacional";

export const dynamic = "force-dynamic";

export default async function MiRutinaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, sexo")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const clienteSexo = (cliente?.sexo as Sexo | null) ?? null;

  const { data: rutina } = cliente
    ? await supabase
        .from("rutinas")
        .select(
          "id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, origen",
        )
        .eq("cliente_id", cliente.id)
        .maybeSingle()
    : { data: null };

  const [{ data: itemsData }, { data: ejerciciosData }] = await Promise.all([
    rutina
      ? supabase
          .from("rutina_items")
          .select(
            "id, dia, orden, series, repeticiones, nota, tecnica, ejercicio:ejercicios(id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion)",
          )
          .eq("rutina_id", rutina.id)
          .order("dia")
          .order("orden")
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from("ejercicios")
      .select(
        "id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion",
      ),
  ]);

  const ejercicios = (ejerciciosData ?? []) as Ejercicio[];

  // SPEC modo manual: nunca es el flujo por default, siempre detrás de un
  // <details> cerrado, debajo del generador automático.
  const entradaManual = (
    <details className="group">
      <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1.5 text-sm text-ink-soft underline underline-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">
          ¿Ya entrenás y querés armar tu rutina a mano?
        </span>
        <span className="hidden group-open:inline">Cerrar armado manual</span>
      </summary>
      <div className="mt-3 rounded-[6px] border border-rule bg-paper-2 p-4 animate-fade-in">
        <p className="mb-3 text-xs leading-snug text-ink-soft">
          Elegí ejercicios, series y reps, y sumá una técnica de intensidad por
          ejercicio si la usás. Se guarda como tu rutina y reemplaza la que
          tengas.
        </p>
        <BuilderManual ejercicios={ejercicios} />
      </div>
    </details>
  );

  return (
    <main className="stagger max-w-md mx-auto px-5 py-6 space-y-6">
      <div>
        <Link
          href="/mi"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl mt-2">Tu rutina</h1>
        {rutina ? (
          <p className="text-sm text-ink-soft">
            {rutina.origen === "manual"
              ? "Armada a mano"
              : (OBJETIVO_LABEL[rutina.objetivo as Objetivo] ??
                rutina.objetivo)}
            {rutina.nivel
              ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}`
              : ""}
            {rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}
          </p>
        ) : null}
      </div>

      <BannerMotivacional />

      {!rutina ? (
        <>
          <p className="text-sm text-ink-soft">
            Respondé estas preguntas y armamos tu plan. Después podés ajustar
            series, repeticiones y cambiar ejercicios que no conozcas.
          </p>
          <div id="generar-rutina-auto" className="scroll-mt-4">
            <GenerarRutinaForm action={generarMiRutina} />
          </div>
          {entradaManual}
        </>
      ) : (
        <>
          <details className="group">
            <summary className="ml-auto flex w-fit cursor-pointer select-none list-none items-center gap-1.5 rounded-[5px] border border-rule px-3 py-2 text-sm text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-180"
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span className="group-open:hidden">Regenerar rutina</span>
              <span className="hidden group-open:inline">Cerrar</span>
            </summary>
            <div
              id="generar-rutina-auto"
              className="mt-3 scroll-mt-4 rounded-[6px] border border-rule bg-paper-2 p-4 animate-fade-in"
            >
              <p className="mb-3 text-xs text-ink-soft">
                Cambiá lo que haga falta y armamos un plan nuevo. Reemplaza los
                ejercicios actuales.
              </p>
              <GenerarRutinaForm
                action={generarMiRutina}
                tieneRutina
                defaults={{
                  objetivo: rutina.objetivo as Objetivo,
                  nivel: (rutina.nivel as Nivel) ?? undefined,
                  dias: rutina.dias_por_semana ?? undefined,
                  preferencia: (rutina.preferencias as Prefs)?.equipo ?? undefined,
                  sexo: (rutina.preferencias as Prefs)?.sexo ?? undefined,
                  enfasis: (rutina.preferencias as Prefs)?.enfasis ?? undefined,
                }}
              />
            </div>
          </details>

          {entradaManual}

          <RutinaEditor
            dias={agruparPorDia(
              (itemsData ?? []) as any[],
              (rutina.dias_titulos as string[] | null) ?? null,
            )}
            ejercicios={ejercicios}
            mostrarTecnica={rutina.origen === "manual"}
          />
        </>
      )}
    </main>
  );
}

function agruparPorDia(
  items: any[],
  titulos: string[] | null,
): DiaEditable[] {
  const porDia = new Map<number, DiaEditable>();
  for (const it of items) {
    const n = it.dia as number;
    if (!porDia.has(n)) {
      porDia.set(n, {
        numero: n,
        titulo: titulos?.[n - 1] ?? `Día ${n}`,
        items: [],
      });
    }
    porDia.get(n)!.items.push({
      id: it.id,
      series: it.series ?? 3,
      repeticiones: it.repeticiones ?? "10",
      nota: it.nota ?? "",
      tecnica: (it.tecnica ?? null) as DiaEditable["items"][number]["tecnica"],
      ejercicio: (it.ejercicio ?? null) as Ejercicio | null,
    });
  }
  return [...porDia.values()].sort((a, b) => a.numero - b.numero);
}
