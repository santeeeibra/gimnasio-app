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

export default async function MiRutinaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: rutina } = cliente
    ? await supabase
        .from("rutinas")
        .select("id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias")
        .eq("cliente_id", cliente.id)
        .maybeSingle()
    : { data: null };

  const [{ data: itemsData }, { data: ejerciciosData }] = await Promise.all([
    rutina
      ? supabase
          .from("rutina_items")
          .select(
            "id, dia, orden, series, repeticiones, nota, ejercicio:ejercicios(id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion)",
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

  return (
    <main className="max-w-md mx-auto px-5 py-6 space-y-6">
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
            {OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo}
            {rutina.nivel
              ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}`
              : ""}
            {rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}
          </p>
        ) : null}
      </div>

      {!rutina ? (
        <>
          <p className="text-sm text-ink-soft">
            Respondé estas preguntas y armamos tu plan. Después podés ajustar
            series, repeticiones y cambiar ejercicios que no conozcas.
          </p>
          <GenerarRutinaForm action={generarMiRutina} />
        </>
      ) : (
        <>
          <RutinaEditor
            dias={agruparPorDia(
              (itemsData ?? []) as any[],
              (rutina.dias_titulos as string[] | null) ?? null,
            )}
            ejercicios={ejercicios}
          />

          <details className="border-t border-rule pt-4">
            <summary className="-mx-1 px-1 py-2 flex items-center text-sm text-ink-soft cursor-pointer select-none rounded-[5px] transition-colors duration-150 [transition-timing-function:var(--ease-out)] active:bg-paper-2">
              Regenerar rutina
            </summary>
            <div className="mt-4">
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
      ejercicio: (it.ejercicio ?? null) as Ejercicio | null,
    });
  }
  return [...porDia.values()].sort((a, b) => a.numero - b.numero);
}
