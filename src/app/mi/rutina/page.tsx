import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  NIVEL_LABEL,
  OBJETIVO_LABEL,
  type Ejercicio,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

type Prefs = {
  equipo?: PreferenciaEquipo;
  sexo?: Sexo;
  enfasis?: Enfasis[];
  zonasDolor?: Molestia[];
} | null;
import { pillClasses } from "@/components/ui";
import { ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { generarMiRutina } from "./actions";
import { GenerarRutinaForm } from "./generar-form";
import { RutinaEditor, type DiaEditable } from "./rutina-editor";
import { BuilderManual } from "./builder-manual";
import { BannerMotivacional } from "@/components/rutinas/banner-motivacional";

export const dynamic = "force-dynamic";

export default async function MiRutinaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // `ejercicios` no depende de nada: se dispara ya, en paralelo con los
  // round-trips de `clientes` y `rutinas`.
  const ejerciciosPromise = supabase
    .from("ejercicios")
    .select(
      "id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion",
    );

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
    ejerciciosPromise,
  ]);

  const ejercicios = (ejerciciosData ?? []) as Ejercicio[];

  // SPEC modo manual: nunca es el flujo por default, siempre detrás de un
  // <details> cerrado, debajo del generador automático.
  // Controles de personalización (armado manual y modo avanzado).
  // Se presentan como tarjetas de acción sólidas con superficie Obsidian (bg-paper-2,
  // borde preciso, feedback táctil e íconos con acento) en lugar de botones fantasma transparentes.
  const entradaManual = (
    <details className="group">
      <summary
        className="flex w-full cursor-pointer select-none list-none items-center justify-between rounded-[12px] border border-rule bg-paper-2 p-3 text-sm font-medium text-ink transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-3 hover:border-ink/20 active:scale-[0.99] shadow-sm [&::-webkit-details-marker]:hidden"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
            <Plus aria-hidden className="size-4 transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-45" />
          </span>
          <span className="truncate group-open:hidden">
            ¿Ya entrenás y querés armar tu rutina a mano?
          </span>
          <span className="hidden truncate group-open:inline">
            Cerrar armado manual
          </span>
        </div>
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-90" />
      </summary>
      <div className="mt-2.5 rounded-[14px] border border-rule bg-paper-2 p-4 animate-fade-in shadow-sm">
        <p className="mb-3 text-xs leading-snug text-ink-soft">
          Elegí ejercicios, series y reps, y sumá una técnica de intensidad por
          ejercicio si la usás. Se guarda como tu rutina y reemplaza la que
          tengas.
        </p>
        <BuilderManual ejercicios={ejercicios} />
      </div>
    </details>
  );

  const linkAvanzado = (
    <Link
      href="/mi/rutina/avanzado"
      className="flex w-full items-center justify-between rounded-[12px] border border-rule bg-paper-2 p-3 text-sm font-medium text-ink transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-3 hover:border-ink/20 active:scale-[0.99] shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
          <SlidersHorizontal aria-hidden className="size-4" />
        </span>
        <span className="truncate">Modo avanzado — afinar el plan</span>
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft" />
    </Link>
  );

  const opcionesPersonalizacion = (
    <div className="space-y-2.5">
      {entradaManual}
      {linkAvanzado}
    </div>
  );

  const regenerarDetails = rutina ? (
    <details className="group">
      <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1.5 rounded-[10px] border border-rule px-3 py-2 text-sm text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 active:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 [&::-webkit-details-marker]:hidden">
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
        className="mt-3 w-[min(22rem,calc(100vw-2.5rem))] scroll-mt-4 rounded-[14px] border border-rule bg-paper-2 p-4 animate-fade-in"
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
            zonasDolor: (rutina.preferencias as Prefs)?.zonasDolor ?? undefined,
          }}
        />
      </div>
    </details>
  ) : null;

  // pb generoso: en mobile, abajo del scroll conviven la bottom nav (~38px) y
  // el timer de descanso — colapsado ~62px, expandido ~214px — ambos fijos.
  // pb-64 (256px) deja el último ejercicio visible incluso con el timer abierto.
  return (
    <main className="stagger max-w-md mx-auto px-5 pt-6 pb-64 space-y-6">
      <div>
        <Link href="/mi" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Volver
        </Link>
        {/* §6: acción secundaria de la sección va en la fila del encabezado
            (justify-between), nunca como hijo suelto del stack con ml-auto. */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl">Tu rutina</h1>
            {rutina ? (
              <p className="text-sm text-ink-soft">
                {rutina.origen === "manual"
                  ? "Armada a mano"
                  : (OBJETIVO_LABEL[rutina.objetivo as Objetivo] ??
                    rutina.objetivo)}
                {rutina.nivel
                  ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}`
                  : ""}
                {rutina.dias_por_semana
                  ? ` · ${rutina.dias_por_semana} días`
                  : ""}
              </p>
            ) : null}
          </div>
          {regenerarDetails ? (
            <div className="shrink-0">{regenerarDetails}</div>
          ) : null}
        </div>
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
          {opcionesPersonalizacion}
        </>
      ) : (
        <>
          {opcionesPersonalizacion}

          {(() => {
            const p = rutina.preferencias as
              | { explicacion?: string[]; explicacionGeneral?: string }
              | null;
            const pasos = p?.explicacion ?? [];
            if (rutina.origen === "manual" || pasos.length === 0) return null;
            return (
              <details className="group rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm">
                <summary
                  className="flex w-fit cursor-pointer select-none list-none items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors [&::-webkit-details-marker]:hidden"
                >
                  <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-90 text-accent" />
                  <span className="group-open:hidden">Explicame esta rutina</span>
                  <span className="hidden group-open:inline">Cerrar explicación</span>
                </summary>
                <div className="mt-3 space-y-2 text-sm leading-snug animate-fade-in">
                  {p?.explicacionGeneral ? (
                    <p className="text-ink-soft">{p.explicacionGeneral}</p>
                  ) : null}
                  <ol className="space-y-2">
                    {pasos.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 font-display text-ink-soft">
                          Día {i + 1}
                        </span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            );
          })()}

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
