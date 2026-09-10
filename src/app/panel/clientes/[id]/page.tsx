import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireDueno, claveInicial } from "@/lib/auth";
import { Panel, linkClasses, pillClasses } from "@/components/ui";
import { ChevronLeft, CreditCard, Sparkles, AlertCircle } from "lucide-react";
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

import { RegistrarPagoModal } from "./registrar-pago-modal";
import { ClienteTabsSeccion } from "./cliente-tabs-seccion";

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

  // Última vez que el socio entrenó (registro de progreso o check-in).
  const [ultimoProgreso, ultimaEntrada] = await Promise.all([
    supabase
      .from("registro_progreso")
      .select("fecha")
      .eq("cliente_id", id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("registros_entrada")
      .select("creado_en")
      .eq("cliente_id", id)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const fechasActividad = [
    ultimoProgreso.data?.fecha as string | undefined,
    (ultimaEntrada.data?.creado_en as string | undefined)?.slice(0, 10),
  ].filter(Boolean) as string[];
  const ultimaActividad = fechasActividad.sort().at(-1) ?? null;
  const diasSinEntrenar = ultimaActividad
    ? Math.floor(
        (Date.now() - new Date(`${ultimaActividad}T12:00:00`).getTime()) /
          86400000,
      )
    : null;

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
          "id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, origen, actualizado_at, rutina_items(id, dia, orden, series, repeticiones, nota, tecnica, ejercicio:ejercicios(id, nombre))",
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
    <div className="space-y-6 max-w-6xl lg:max-w-7xl mx-auto">
      {/* Header Fijo con Acciones Rápidas */}
      <div>
        <Link href="/panel/clientes" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
          Volver a clientes
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rule/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <FotoSocioUploader
              gimnasioId={dueno.gimnasio_id}
              clienteId={id}
              fotoUrlInicial={c.foto_url ?? null}
              nombre={c.profile?.nombre ?? "Socio"}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-ink">{c.profile?.nombre}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    estado === "vencido"
                      ? "bg-danger/15 text-danger border border-danger/30"
                      : estado === "por_vencer"
                        ? "bg-warn/15 text-warn border border-warn/30"
                        : "bg-ok/15 text-ok border border-ok/30"
                  }`}
                >
                  {ESTADO_LABEL[estado]}
                </span>
                {diasSinEntrenar !== null && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      diasSinEntrenar > 10
                        ? "bg-danger/15 text-danger border border-danger/30"
                        : "bg-paper-2 text-ink-soft border border-rule"
                    }`}
                  >
                    {diasSinEntrenar === 0
                      ? "Entrenó hoy"
                      : diasSinEntrenar === 1
                        ? "Entrenó ayer"
                        : `Sin entrenar hace ${diasSinEntrenar} días`}
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-soft mt-0.5">
                DNI {c.profile?.dni}
                {c.profile?.telefono ? ` · ${c.profile.telefono}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RegistrarPagoModal
              clienteId={c.id}
              planes={planes}
              planActual={c.plan_id}
            />
          </div>
        </div>
      </div>

      {/* Banner Guía del Ciclo del Socio (Smart Next-Step Guidance) */}
      {c.en_prueba ? (
        <div className="p-4 rounded-[12px] bg-brand/10 border border-brand/30 flex items-start gap-3">
          <Sparkles className="size-5 text-brand shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-ink">Socio en Día de Prueba</p>
            <p className="text-ink-soft text-xs mt-0.5">
              Registrá un pago a la izquierda para activar su plan definitivo y deshabilitar el pase de prueba.
            </p>
          </div>
        </div>
      ) : estado === "vencido" ? (
        <div className="p-4 rounded-[12px] bg-danger/10 border border-danger/30 flex items-start gap-3">
          <AlertCircle className="size-5 text-danger shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-danger">Cuota Vencida</p>
            <p className="text-ink-soft text-xs mt-0.5">
              El socio {dias !== null && dias < 0 ? `lleva ${Math.abs(dias)} días vencido` : "no tiene cuota al día"}. Usá el panel de Registrar Pago para renovarlo.
            </p>
          </div>
        </div>
      ) : null}

      {/* LAYOUT DE 2 COLUMNAS PARA PC (lg:grid-cols-12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* COLUMNA IZQUIERDA (PAGOS & CAJA - PRIORIDAD 1) - 5 Cols en PC */}
        <div className="lg:col-span-5 space-y-6 lg:space-y-8">
          {/* Card Resumen de Cuota */}
          <Panel className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-rule/50 pb-3">
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="size-4 text-brand" />
                Estado de Cuota
              </h2>
              <span className="text-xs text-ink-soft font-mono">ID: {c.id.slice(0, 8)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-ink-soft">Plan contratado</p>
                <p className="font-medium text-ink">{c.plan?.nombre ?? "Sin plan"}</p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Vencimiento</p>
                <p className="font-medium text-ink">
                  {c.fecha_vencimiento ?? "—"}
                  {dias !== null && (
                    <span className="block text-xs text-ink-soft">
                      ({dias < 0 ? `venció hace ${Math.abs(dias)}d` : dias === 0 ? "vence hoy" : `en ${dias} días`})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Panel>

          {/* Card Formulario Directo Registrar Pago */}
          <Panel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <span>⚡ Registrar Pago</span>
              </h2>
            </div>
            <PagoForm
              clienteId={c.id}
              planes={planes}
              planActual={c.plan_id}
            />
          </Panel>

          {/* Card Historial de Pagos */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink px-1">Historial de Pagos</h2>
            {pagos.length === 0 ? (
              <Panel className="p-4 text-center text-sm text-ink-soft">
                Sin pagos registrados aún.
              </Panel>
            ) : (
              <ul className="border border-rule rounded-[12px] divide-y divide-rule text-sm overflow-hidden bg-surface">
                {pagos.map((p) => {
                  const ref: string | null = p.comprobante_ref ?? null;
                  const esUrl =
                    ref && (ref.startsWith("http://") || ref.startsWith("https://"));
                  return (
                    <li
                      key={p.id}
                      className="px-4 py-3 flex flex-col gap-1 hover:bg-surface-elevated/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">
                          {p.fecha_pago} · {p.plan?.nombre ?? "—"}
                        </span>
                        <span className="font-semibold text-ok">
                          ${p.monto}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-ink-soft">
                        <span>Cubre hasta {p.cubre_hasta}</span>
                        {ref ? (
                          esUrl ? (
                            <a
                              href={ref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand underline underline-offset-2 hover:brightness-110"
                            >
                              🔗 Comprobante
                            </a>
                          ) : (
                            <span className="truncate max-w-[120px]">Ref: {ref}</span>
                          )
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (Pills / Tabs de Gestión: Acceso, Rutina, Peso) - 7 Cols en PC */}
        <div className="lg:col-span-7">
          <ClienteTabsSeccion
            tieneRutina={!!rutina}
            accesoContent={
              <Panel className="p-5">
                <h2 className="text-lg font-semibold text-ink mb-4">Credenciales y Datos de Acceso</h2>
                <AccesoSocio
                  clienteId={c.id}
                  gimnasio={gym?.nombre ?? ""}
                  slug={gym?.slug ?? ""}
                  dni={c.profile?.dni ?? ""}
                  claveInicial={claveInicial(c.profile?.dni ?? "")}
                  yaCambio={c.profile?.debe_cambiar_clave === false}
                  bloqueado={bloqueado}
                />

                <div className="mt-6 pt-5 border-t border-rule/50">
                  <h3 className="text-sm font-semibold text-ink mb-3">Editar Datos Personales</h3>
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
            }
            rutinaContent={
              <Panel className="p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">Rutina de Entrenamiento</h2>
                    {rutina ? (
                      <span className="rounded-full border border-rule px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-ink-soft">
                        {esManual ? "A mano" : "IA / Algoritmo"}
                      </span>
                    ) : null}
                  </div>
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

                {rutina ? (
                  <div className="mb-4">
                    <div className="text-xs text-ink-soft mb-3">
                      {esManual
                        ? "Armada a mano"
                        : (OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo)}
                      {rutina.nivel ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}` : ""}
                      {rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días por semana` : ""}
                    </div>

                    <ul className="space-y-2 text-sm bg-surface-dark/50 p-3.5 rounded-[10px] border border-rule/50">
                      {[...rutinaPorDia.keys()]
                        .sort((a, b) => a - b)
                        .map((d) => (
                          <li key={d} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                            <span className="font-medium text-ink shrink-0">
                              {(rutina.dias_titulos as string[] | null)?.[d - 1] ?? `Día ${d}`}:
                            </span>
                            <span className="text-ink-soft text-xs sm:text-sm">
                              {(rutinaPorDia.get(d) ?? []).join(", ")}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 mb-4 text-sm text-ink-soft">
                    El socio no tiene rutina asignada todavía. Podés generarle una a medida a continuación.
                  </p>
                )}

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
            }
            pesoContent={
              <Panel className="p-5">
                <h2 className="text-lg font-semibold text-ink mb-4">Evolución de Peso Corporal</h2>
                <CardPeso
                  clienteId={c.id}
                  creadoPor="dueno"
                  action={guardarPesoSocio.bind(null, c.id)}
                  fetchRegistros={obtenerPesosSocio.bind(null, c.id)}
                />
              </Panel>
            }
          />
        </div>
      </div>
    </div>
  );
}
