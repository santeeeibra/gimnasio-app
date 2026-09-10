import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema } from "@/lib/tema";
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
import { ChevronLeft, ChevronRight, CreditCard, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { generarMiRutina } from "./actions";
import { GenerarRutinaForm } from "./generar-form";
import { RutinaEditor, type DiaEditable } from "./rutina-editor";
import { BuilderManual } from "./builder-manual";
import { BannerMotivacional } from "@/components/rutinas/banner-motivacional";
import { DescargarRutinaPdf } from "@/components/pdf/descargar-rutina-pdf";
import { BotonGoogleCalendar } from "@/components/rutina/boton-google-calendar";
import { BotonActualizar } from "@/components/ui/boton-actualizar";
import { ExplicacionModal } from "@/components/rutina/explicacion-modal";
import { ModalAvanzadoAfinarPlan } from "./modal-avanzado";

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
    .select("id, sexo, gimnasio_id, estado_cuota, acceso_habilitado, en_prueba, fecha_vencimiento")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const clienteSexo = (cliente?.sexo as Sexo | null) ?? null;

  const { data: gymData } = cliente
    ? await supabase
        .from("gimnasios")
        .select("nombre, logo_url, tema, tipo_cuenta, estado, pago_alias, pago_cbu, pago_titular, slug")
        .eq("id", cliente.gimnasio_id ?? "")
        .maybeSingle()
    : { data: null };

  const temaGym = parseTema(gymData?.tema);
  const coloresLogro = {
    paper: temaGym.paper,
    ink: temaGym.ink,
    volt: temaGym.volt,
    voltInk: temaGym.voltInk,
  };

  const esIndividual =
    gymData?.tipo_cuenta === "individual" ||
    profile.rol === "dueno" ||
    Boolean(gymData?.slug?.startsWith("user-"));
  const cuotaVencida =
    !esIndividual &&
    (cliente?.estado_cuota === "vencido" || cliente?.acceso_habilitado === false) &&
    !cliente?.en_prueba;

  const { data: rutina } = cliente
    ? await supabase
        .from("rutinas")
        .select(
          "id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, origen",
        )
        .eq("cliente_id", cliente.id)
        .maybeSingle()
    : { data: null };

  const prefs = (rutina?.preferencias as Prefs) ?? null;

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

  // Datos para el PDF de descarga: peso corporal actual + último peso por ejercicio.
  const [{ data: pesoRows }, { data: progresoRows }] = cliente
    ? await Promise.all([
        supabase
          .from("registro_peso")
          .select("peso")
          .eq("cliente_id", cliente.id)
          .order("fecha", { ascending: false })
          .limit(1),
        supabase
          .from("registro_progreso")
          .select("ejercicio_id, peso, fecha")
          .eq("cliente_id", cliente.id)
          .order("fecha", { ascending: false }),
      ])
    : [{ data: null }, { data: null }];

  const pesoCorporal =
    pesoRows && pesoRows.length > 0 ? Number(pesoRows[0].peso) : null;

  const pesosPorEjercicio: Record<string, number> = {};
  for (const r of (progresoRows ?? []) as { ejercicio_id: string; peso: number }[]) {
    if (r.ejercicio_id && pesosPorEjercicio[r.ejercicio_id] === undefined) {
      pesosPorEjercicio[r.ejercicio_id] = Number(r.peso);
    }
  }

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
    <ModalAvanzadoAfinarPlan
      rutina={rutina}
      clienteSexo={clienteSexo}
      prefs={prefs}
    />
  );

  const regenerarDetails = rutina ? (
    <details
      id="generar-rutina-auto"
      className="group rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm"
    >
      <summary className="flex cursor-pointer select-none list-none items-center justify-between text-sm font-medium text-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99] [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
            <RotateCcw aria-hidden className="size-4" />
          </span>
          <span className="truncate group-open:hidden">Regenerar rutina</span>
          <span className="hidden truncate group-open:inline">
            Cerrar generador
          </span>
        </div>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-open:rotate-90"
        />
      </summary>
      <div className="mt-3 pt-3 border-t border-rule animate-fade-in">
        <p className="mb-3 text-xs leading-snug text-ink-soft">
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

  const opcionesPersonalizacion = (
    <div className="space-y-2.5">
      {regenerarDetails}
      {entradaManual}
      {linkAvanzado}
    </div>
  );

  // pb generoso: en mobile, abajo del scroll conviven la bottom nav (~38px) y
  // el timer de descanso — colapsado ~62px, expandido ~214px — ambos fijos.
  // pb-64 (256px) deja el último ejercicio visible incluso con el timer abierto.
  return (
    <main className="stagger max-w-md mx-auto px-5 pt-6 pb-64 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Link href="/mi" className={pillClasses.neutra}>
            <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
            Volver
          </Link>
          <BotonActualizar variante="pill" label="Actualizar" />
        </div>
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
          {rutina && cliente && !cuotaVencida ? (
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <BotonGoogleCalendar
                tituloPlan={`${OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo}${rutina.nivel ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel]}` : ""}`}
                gimnasioNombre={gymData?.nombre ?? "SysGym"}
                dias={agruparPorDia(
                  (itemsData ?? []) as any[],
                  (rutina.dias_titulos as string[] | null) ?? null,
                )}
              />
              <DescargarRutinaPdf
                clienteNombre={profile.nombre ?? ""}
                gimnasioNombre={gymData?.nombre ?? ""}
                rutinaNombre={`${OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo}${rutina.nivel ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel]}` : ""}${rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}`}
                dias={agruparPorDia((itemsData ?? []) as any[], (rutina.dias_titulos as string[] | null) ?? null)}
                logoUrl={gymData?.logo_url ?? null}
                pesoCorporal={pesoCorporal}
                pesosPorEjercicio={pesosPorEjercicio}
              />
            </div>
          ) : null}
        </div>
      </div>

      <BannerMotivacional />

      {cuotaVencida ? (
        <div className="rounded-[20px] border border-danger/30 bg-paper-2 p-6 text-center shadow-xl space-y-4 animate-scale-in">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-danger/10 text-danger">
            <CreditCard className="size-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-danger/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-danger">
              Cuota vencida · Acceso pausado
            </span>
            <h2 className="text-xl font-bold tracking-tight text-ink font-display pt-1">
              Tu cuota en {gymData?.nombre ?? "el gimnasio"} está vencida
            </h2>
            <p className="text-sm text-ink-soft max-w-sm mx-auto">
              Renová tu cuota ahora para continuar con tu entrenamiento y registrar tus series. Al acreditarse el pago, tu rutina se habilita de inmediato.
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto space-y-2">
            <Link
              href="/mi/pagos"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent font-bold text-sm text-accent-ink shadow-md shadow-accent/20 transition-transform active:scale-[0.98] hover:opacity-95"
            >
              <CreditCard className="size-4" />
              <span>Pagar cuota con Mercado Pago</span>
            </Link>
            <Link
              href="/mi"
              className="flex h-10 w-full items-center justify-center rounded-[10px] text-xs font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Ver datos de transferencia o volver
            </Link>
          </div>
        </div>
      ) : !rutina ? (
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
              <ExplicacionModal
                explicacionGeneral={p?.explicacionGeneral}
                pasos={pasos}
              />
            );
          })()}

          <RutinaEditor
            dias={agruparPorDia(
              (itemsData ?? []) as any[],
              (rutina.dias_titulos as string[] | null) ?? null,
            )}
            ejercicios={ejercicios}
            mostrarTecnica={rutina.origen === "manual"}
            clienteId={cliente?.id}
            creadoPor="cliente"
            esIndividual={esIndividual}
            gimnasioNombre={gymData?.nombre ?? ""}
            logoUrl={gymData?.logo_url ?? null}
            colores={coloresLogro}
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
