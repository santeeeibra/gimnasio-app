import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireDueno, claveInicial } from "@/lib/auth";
import { Panel, linkClasses, pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { AccesoSocio } from "./acceso-socio";
import { EditarDatos } from "./editar-datos";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import {
  NIVEL_LABEL,
  OBJETIVO_LABEL,
  RANGO_LABEL,
  RIR_LABEL,
  SPLIT_LABEL,
  TECNICA_LABEL,
  VOLUMEN_LABEL,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type OpcionesAvanzadas,
  type PreferenciaEquipo,
  type Sexo,
  type Tecnica,
} from "@/lib/rutina/tipos";

type Prefs = {
  equipo?: PreferenciaEquipo;
  sexo?: Sexo;
  enfasis?: Enfasis[];
  zonasDolor?: Molestia[];
  avanzado?: OpcionesAvanzadas | null;
  explicacionGeneral?: string;
} | null;
import { PagoForm } from "./pago-form";
import { RutinaPanelDueno } from "./rutina-panel";
import { FotoSocioUploader } from "./foto-socio-uploader";
import { CardPeso } from "@/components/peso/card-peso";
import { guardarPesoSocio, obtenerPesosSocio } from "@/lib/peso/actions";
import { DescargarRutinaPdf } from "@/components/pdf/descargar-rutina-pdf";
import type { DiaEditable } from "@/app/mi/rutina/rutina-editor";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dueno = await requireDueno();
  const supabase = await createClient();

  const [{ data: cliente }, { data: gym }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_inicio, fecha_vencimiento, plan_id, sexo, email, foto_url, en_prueba, prueba_iniciada_en, acceso_habilitado, profile:profiles(id, nombre, dni, telefono, debe_cambiar_clave), plan:planes(nombre)",
      )
      .eq("id", id)
      .maybeSingle()
      .then(async (res) => {
        if (res.error) {
          return await supabase
            .from("clientes")
            .select(
              "id, estado_cuota, fecha_inicio, fecha_vencimiento, plan_id, sexo, email, foto_url, en_prueba, prueba_iniciada_en, acceso_habilitado, profile:profiles(id, nombre, dni, telefono, debe_cambiar_clave), plan:planes(nombre)",
            )
            .eq("id", id)
            .maybeSingle();
        }
        return res;
      }),
    supabase
      .from("gimnasios")
      .select("slug, nombre, logo_url")
      .eq("id", dueno.gimnasio_id)
      .single(),
  ]);

  if (!cliente) notFound();

  const { count: ingresosCount } = await supabase
    .from("registros_entrada")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);
  const pruebaVencida = !!(cliente as any).en_prueba && (ingresosCount ?? 0) > 0;

  const [planesResult, { data: pagosData }, { data: rutinaData }] =
    await Promise.all([
      supabase
        .from("planes")
        .select("id, nombre, precio, duracion_dias, descuentos")
        .eq("activo", true)
        .order("nombre")
        .then(async (res) => {
          if (res.error) {
            return await supabase
              .from("planes")
              .select("id, nombre, precio, duracion_dias")
              .eq("activo", true)
              .order("nombre");
          }
          return res;
        }),
      supabase
        .from("pagos")
        .select("id, monto, fecha_pago, cubre_hasta, comprobante_ref, plan:planes(nombre)")
        .eq("cliente_id", id)
        .order("fecha_pago", { ascending: false }),
      supabase
        .from("rutinas")
        .select(
          "id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, origen, actualizado_at, rutina_items(dia, orden, tecnica, ejercicio:ejercicios(nombre))",
        )
        .eq("cliente_id", id)
        .maybeSingle(),
    ]);

  const planesData = planesResult.data;

  const c = cliente as any;
  const dias = diasRestantes(c.fecha_vencimiento);
  const estado = estadoDesdeDias(dias);
  const bloqueado = c.acceso_habilitado === false;
  const planes = (planesData ?? []) as any[];
  const pagos = (pagosData ?? []) as any[];
  const rutina = rutinaData as any;
  const esManual = rutina?.origen === "manual";
  const rutinaItems = [...((rutina?.rutina_items ?? []) as any[])].sort(
    (a, b) => (a.dia - b.dia) || ((a.orden ?? 0) - (b.orden ?? 0)),
  );
  const rutinaPorDia = new Map<number, string[]>();
  for (const it of rutinaItems) {
    if (!it.ejercicio?.nombre) continue;
    const arr = rutinaPorDia.get(it.dia) ?? [];
    const tec = it.tecnica as Tecnica | null;
    arr.push(tec ? `${it.ejercicio.nombre} · ${TECNICA_LABEL[tec]}` : it.ejercicio.nombre);
    rutinaPorDia.set(it.dia, arr);
  }

  function agruparPorDia(items: any[], titulos: string[] | null): DiaEditable[] {
    const porDia = new Map<number, DiaEditable>();
    for (const it of items) {
      const n = it.dia as number;
      if (!porDia.has(n)) porDia.set(n, { numero: n, titulo: titulos?.[n - 1] ?? `Día ${n}`, items: [] });
      porDia.get(n)!.items.push({
        id: it.id ?? String(n),
        series: it.series ?? 3,
        repeticiones: it.repeticiones ?? "10",
        nota: it.nota ?? "",
        tecnica: it.tecnica ?? null,
        ejercicio: it.ejercicio ?? null,
      });
    }
    return [...porDia.values()].sort((a, b) => a.numero - b.numero);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/panel/clientes" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Clientes
        </Link>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <FotoSocioUploader
              gimnasioId={dueno.gimnasio_id}
              clienteId={id}
              fotoUrlInicial={c.foto_url ?? null}
              nombre={c.profile?.nombre ?? "Socio"}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">{c.profile?.nombre}</h1>
              <p className="text-sm text-ink-soft">
                DNI {c.profile?.dni}
                {c.profile?.telefono ? ` · ${c.profile.telefono}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="text-xs text-ink-soft">Estado</p>
            <p
              className={`text-lg font-display ${
                estado === "vencido"
                  ? "text-danger"
                  : estado === "por_vencer"
                    ? "text-warn"
                    : "text-ok"
              }`}
            >
              {ESTADO_LABEL[estado]}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Plan</p>
            <p className="text-lg">{c.plan?.nombre ?? "sin plan"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Vence</p>
            <p className="text-lg">
              {c.fecha_vencimiento ?? "—"}
              {dias !== null ? (
                <span className="text-sm text-ink-soft">
                  {" "}
                  ({dias < 0 ? `hace ${Math.abs(dias)} d` : dias === 0 ? "vence hoy" : `en ${dias} d`})
                </span>
              ) : null}
            </p>
          </div>
          {bloqueado ? (
            <div>
              <p className="text-xs text-ink-soft">Acceso</p>
              <p className="text-lg font-display text-danger">
                Pendiente de pago
              </p>
            </div>
          ) : null}
          {c.en_prueba ? (
            <div>
              <p className="text-xs text-ink-soft">Día de prueba</p>
              <p
                className={`text-lg font-display ${
                  pruebaVencida ? "text-danger" : "text-ink"
                }`}
              >
                {pruebaVencida ? "Vencida — falta cobrar" : "En prueba"}
              </p>
            </div>
          ) : null}
        </div>
        {c.en_prueba ? (
          <p className="mt-3 text-sm text-ink-soft">
            Registrá un pago abajo para convertir al cliente: se le asigna el
            plan y se apaga el día de prueba.
          </p>
        ) : null}
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Acceso</h2>
        <AccesoSocio
          clienteId={c.id}
          gimnasio={gym?.nombre ?? ""}
          slug={gym?.slug ?? ""}
          dni={c.profile?.dni ?? ""}
          claveInicial={claveInicial(c.profile?.dni ?? "")}
          yaCambio={c.profile?.debe_cambiar_clave === false}
          bloqueado={bloqueado}
        />

        <div className="mt-5">
          <EditarDatos
            clienteId={c.id}
            nombre={c.profile?.nombre ?? ""}
            dni={c.profile?.dni ?? ""}
            telefono={c.profile?.telefono ?? null}
            email={(c.email as string | null) ?? null}
            sexo={(c.sexo as Sexo | null) ?? null}
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="text-lg">Rutina</h2>
            {rutina ? (
              <span className="shrink-0 rounded-full border border-rule px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                {esManual ? "A mano" : "Generada"}
              </span>
            ) : null}
          </div>
          {rutina ? (
            <span className="text-xs text-ink-soft">
              {esManual
                ? "Armada a mano"
                : (OBJETIVO_LABEL[rutina.objetivo as Objetivo] ??
                  rutina.objetivo)}
              {rutina.nivel
                ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}`
                : ""}
              {rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}
            </span>
          ) : null}
          {rutina && (
            <DescargarRutinaPdf
              clienteNombre={c.profile?.nombre ?? ""}
              gimnasioNombre={gym?.nombre ?? ""}
              rutinaNombre={`${esManual ? "Manual" : (OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo)}${rutina.nivel ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}` : ""}${rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}`}
              dias={agruparPorDia(rutinaItems, rutina.dias_titulos as string[] | null)}
              logoUrl={gym?.logo_url ?? null}
            />
          )}
        </div>

        {rutina && !esManual && (rutina.preferencias as Prefs)?.avanzado ? (
          (() => {
            const av = (rutina.preferencias as Prefs)!.avanzado!;
            const chips = [
              av.split !== "auto" ? SPLIT_LABEL[av.split] : null,
              av.rango !== "estandar" ? RANGO_LABEL[av.rango] : null,
              av.volumen !== "estandar" ? VOLUMEN_LABEL[av.volumen] : null,
              av.rir !== "2-3" ? RIR_LABEL[av.rir] : null,
              av.tecnicaAislamientos !== "ninguna"
                ? `Aislam.: ${TECNICA_LABEL[av.tecnicaAislamientos]}`
                : null,
              ...av.evitar.map((m) => `Evita ${m}`),
            ].filter(Boolean) as string[];
            if (chips.length === 0) return null;
            return (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-rule px-2 py-0.5 text-[11px] text-ink-soft"
                  >
                    {c}
                  </span>
                ))}
              </div>
            );
          })()
        ) : null}

        {rutina ? (
          <ul className="mt-3 mb-4 space-y-2 text-sm">
            {[...rutinaPorDia.keys()]
              .sort((a, b) => a - b)
              .map((d) => (
                <li key={d}>
                  <span className="font-medium">
                    {(rutina.dias_titulos as string[] | null)?.[d - 1] ??
                      `Día ${d}`}
                  </span>
                  <span className="text-ink-soft">
                    {" — "}
                    {(rutinaPorDia.get(d) ?? []).join(", ")}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 mb-4 text-sm text-ink-soft">
            Sin rutina todavía. El cliente también puede generarla desde su panel.
          </p>
        )}

        {rutina && !esManual && (rutina.preferencias as Prefs)?.explicacionGeneral ? (
          <details className="mb-4 text-xs text-ink-soft">
            <summary
              className={`w-fit cursor-pointer select-none ${linkClasses.inline}`}
            >
              Por qué está armada así
            </summary>
            <p className="mt-1.5 leading-snug">
              {(rutina.preferencias as Prefs)!.explicacionGeneral}
            </p>
          </details>
        ) : null}

        <RutinaPanelDueno
          clienteId={c.id}
          tieneRutina={!!rutina}
          clienteSexo={(c.sexo as Sexo | null) ?? null}
          defaults={
            rutina
              ? {
                  objetivo: rutina.objetivo as Objetivo,
                  nivel: (rutina.nivel as Nivel) ?? undefined,
                  dias: rutina.dias_por_semana ?? undefined,
                  preferencia: (rutina.preferencias as Prefs)?.equipo ?? undefined,
                  sexo: (rutina.preferencias as Prefs)?.sexo ?? undefined,
                  enfasis: (rutina.preferencias as Prefs)?.enfasis ?? undefined,
                  zonasDolor:
                    (rutina.preferencias as Prefs)?.zonasDolor ?? undefined,
                }
              : undefined
          }
        />
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Peso corporal</h2>
        <CardPeso
          clienteId={c.id}
          creadoPor="dueno"
          action={guardarPesoSocio.bind(null, c.id)}
          fetchRegistros={obtenerPesosSocio.bind(null, c.id)}
        />
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Registrar un pago</h2>
        <PagoForm
          clienteId={c.id}
          planes={planes}
          planActual={c.plan_id}
        />
      </Panel>

      <div>
        <h2 className="text-lg mb-3">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin pagos registrados.</p>
        ) : (
          <ul className="border border-rule rounded-[6px] divide-y divide-rule text-sm">
            {pagos.map((p) => {
              const ref: string | null = p.comprobante_ref ?? null;
              const esUrl =
                ref && (ref.startsWith("http://") || ref.startsWith("https://"));
              return (
                <li
                  key={p.id}
                  className="px-4 py-3 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {p.fecha_pago} · {p.plan?.nombre ?? "—"}
                    </span>
                    <span className="text-ink-soft">
                      ${p.monto} · cubre hasta {p.cubre_hasta}
                    </span>
                  </div>
                  {ref ? (
                    esUrl ? (
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ink-soft underline underline-offset-2 truncate hover:text-ink"
                      >
                        🔗 Ver comprobante
                      </a>
                    ) : (
                      <p className="text-xs text-ink-soft truncate">
                        Ref: {ref}
                      </p>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
