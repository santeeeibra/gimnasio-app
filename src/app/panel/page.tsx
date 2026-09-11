import Link from "next/link";
import {
  CreditCard,
  UserPlus,
  ScanLine,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarClock,
  Activity,
  ChevronRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { linkClasses } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDueno } from "@/lib/auth";
import { diasRestantes, estadoDesdeDias } from "@/lib/cuota";
import { cupoSocios } from "@/lib/plataforma/cupo";
import type { ClienteVista } from "./clientes/cliente-row";
import { OnboardingDueno } from "./onboarding-dueno";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { WidgetAsistenciaSala } from "@/components/panel/widget-asistencia-sala";
import { obtenerPedidosActivos } from "./asistencia/actions";
import { GatingPlanInicialBanner } from "@/components/plataforma/gating-plan-inicial";

export default async function ResumenPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();
  const adminDb = createAdminClient();

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth(); // 0 a 11
  const pad2 = (n: number) => String(n).padStart(2, "0");

  const inicioMesActualStr = `${anioActual}-${pad2(mesActual + 1)}-01`;
  const fechaMesAnterior = new Date(anioActual, mesActual - 1, 1);
  const inicioMesAnteriorStr = `${fechaMesAnterior.getFullYear()}-${pad2(fechaMesAnterior.getMonth() + 1)}-01`;

  // Inicio de hoy en horario local (para asistencias)
  const inicioHoy = new Date(anioActual, mesActual, ahora.getDate());
  const inicioHoyISO = inicioHoy.toISOString();

  // Ventana de 30 días para la constancia de entrenamiento
  const hace30 = new Date(anioActual, mesActual, ahora.getDate() - 30);
  const hace30Str = `${hace30.getFullYear()}-${pad2(hace30.getMonth() + 1)}-${pad2(hace30.getDate())}`;

  const [
    { data: gym },
    cupo,
    { data: clientesData },
    { count: planesCount },
    pedidosRes,
    { data: pagosData },
    asistenciasRes,
    { data: progresoData },
    { data: entradasData },
  ] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("estado, nombre")
      .eq("id", dueno.gimnasio_id)
      .single(),
    cupoSocios(adminDb, dueno.gimnasio_id),
    supabase
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_vencimiento, plan_id, foto_url, en_prueba, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
      )
      .eq("gimnasio_id", dueno.gimnasio_id)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: true })
      .then(async (res) => {
        if (res.error) {
          return await supabase
            .from("clientes")
            .select(
              "id, estado_cuota, fecha_vencimiento, plan_id, en_prueba, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
            )
            .eq("gimnasio_id", dueno.gimnasio_id)
            .order("fecha_vencimiento", { ascending: true, nullsFirst: true });
        }
        return res;
      }),
    supabase
      .from("planes")
      .select("id", { count: "exact", head: true })
      .eq("gimnasio_id", dueno.gimnasio_id),
    obtenerPedidosActivos(),
    supabase
      .from("pagos")
      .select("monto, fecha_pago, estado")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .eq("estado", "confirmado")
      .gte("fecha_pago", inicioMesAnteriorStr),
    supabase
      .from("registros_entrada")
      .select("id", { count: "exact", head: true })
      .eq("gimnasio_id", dueno.gimnasio_id)
      .gte("creado_en", inicioHoyISO),
    supabase
      .from("registro_progreso")
      .select("cliente_id, fecha")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .gte("fecha", hace30Str),
    supabase
      .from("registros_entrada")
      .select("cliente_id, creado_en")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .gte("creado_en", `${hace30Str}T00:00:00.000Z`),
  ]);

  const pedidosActivos = pedidosRes?.pedidos ?? [];
  const estadoGimnasio = gym?.estado ?? "prueba";
  const soloLectura = estadoGimnasio === "solo_lectura";

  const cupoCasiLleno = cupo.max != null && cupo.usados / cupo.max >= 0.9;
  const mostrarBannerPlan =
    !soloLectura && (estadoGimnasio === "prueba" || !cupo.ok || cupoCasiLleno);

  // 1. Métricas de Ingresos (mes actual vs anterior)
  const pagos = (pagosData ?? []) as { monto: number | string; fecha_pago: string }[];
  let ingresosMesActual = 0;
  let ingresosMesAnterior = 0;

  for (const p of pagos) {
    const m = Number(p.monto) || 0;
    if (p.fecha_pago >= inicioMesActualStr) {
      ingresosMesActual += m;
    } else if (p.fecha_pago >= inicioMesAnteriorStr && p.fecha_pago < inicioMesActualStr) {
      ingresosMesAnterior += m;
    }
  }

  let variacionPct: number | null = null;
  let variacionPositiva = true;
  if (ingresosMesAnterior > 0) {
    const diff = ingresosMesActual - ingresosMesAnterior;
    variacionPct = Math.round((diff / ingresosMesAnterior) * 100);
    variacionPositiva = variacionPct >= 0;
  } else if (ingresosMesActual > 0) {
    variacionPct = 100;
    variacionPositiva = true;
  }

  // 2. Socios activos vs total (criterio oficial de estado de cuota)
  const clientes = (clientesData ?? []) as unknown as ClienteVista[];
  const totalSocios = clientes.length;

  const clientesConDias = clientes.map((c) => {
    const dias = diasRestantes(c.fecha_vencimiento);
    const estado = estadoDesdeDias(dias);
    return { ...c, dias, estadoCalculado: estado };
  });

  const sociosActivos = clientesConDias.filter((c) => c.estadoCalculado !== "vencido").length;
  const alDiaCount = clientesConDias.filter((c) => c.estadoCalculado === "al_dia").length;
  const porVencerCount = clientesConDias.filter(
    (c) => c.dias !== null && c.dias >= 0 && c.dias <= 6,
  ).length;
  const vencidosCount = clientesConDias.filter((c) => c.estadoCalculado === "vencido").length;
  const pctActivos = totalSocios > 0 ? Math.round((sociosActivos / totalSocios) * 100) : 0;

  // 3. Vencen esta semana (máximo 5, ordenados ascendente por días restantes)
  const vencenEstaSemana = clientesConDias
    .filter((c) => c.dias !== null && c.dias >= 0 && c.dias <= 6)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
    .slice(0, 5);

  // 4. Asistencias de hoy
  const asistenciasHoy = asistenciasRes?.count ?? 0;

  // 5. En prueba sin convertir
  const enPruebaCount = clientes.filter((c) => !!c.en_prueba).length;

  // 6. Constancia de entrenamiento (uso real de la app, distinto de cuota al día)
  //    "Atleta activo" = registró progreso o check-in en la ventana.
  const hace7Ms = new Date(anioActual, mesActual, ahora.getDate() - 7).getTime();
  const activos7 = new Set<string>();
  const activos30 = new Set<string>();
  const entrenosPorDow = [0, 0, 0, 0, 0, 0, 0]; // domingo .. sábado

  const registrarActividad = (clienteId: string, fechaISO: string) => {
    if (!clienteId) return;
    activos30.add(clienteId);
    const d = new Date(
      fechaISO.length === 10 ? `${fechaISO}T12:00:00` : fechaISO,
    );
    const t = d.getTime();
    if (Number.isNaN(t)) return;
    if (t >= hace7Ms) activos7.add(clienteId);
    entrenosPorDow[d.getDay()]++;
  };

  for (const r of (progresoData ?? []) as { cliente_id: string; fecha: string }[]) {
    registrarActividad(r.cliente_id, r.fecha);
  }
  for (const r of (entradasData ?? []) as {
    cliente_id: string;
    creado_en: string;
  }[]) {
    registrarActividad(r.cliente_id, r.creado_en);
  }

  const activos7Count = activos7.size;
  const activos30Count = activos30.size;
  const pctEntrenando =
    totalSocios > 0 ? Math.round((activos7Count / totalSocios) * 100) : 0;
  const maxDow = Math.max(1, ...entrenosPorDow);
  const dowLabels = ["D", "L", "M", "M", "J", "V", "S"];
  const dowTop =
    activos30Count > 0
      ? entrenosPorDow.indexOf(Math.max(...entrenosPorDow))
      : -1;
  const dowTopNombre =
    dowTop >= 0
      ? ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"][
          dowTop
        ]
      : null;

  return (
    <div className="stagger space-y-6">
      <WidgetAsistenciaSala
        iniciales={pedidosActivos}
        gimnasioId={dueno.gimnasio_id}
      />

      {/* Banner Solo Lectura */}
      {soloLectura && (
        <div className="rounded-[12px] border-2 border-danger bg-danger/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-danger shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-base font-display font-semibold text-danger">
                Período de prueba finalizado
              </h2>
              <p className="mt-1 text-sm text-ink">
                Tu gimnasio está en modo solo lectura. Activá un plan para seguir usando todas las funciones de la app.
              </p>
              <div className="mt-3">
                <Link
                  href="/panel/plan"
                  className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Activar plan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Cupo / Plan Inicial (40 alumnos) */}
      {cupo.esGratuito ? (
        <GatingPlanInicialBanner
          usados={cupo.usados}
          max={cupo.max ?? 40}
          esGratuito={cupo.esGratuito}
        />
      ) : mostrarBannerPlan ? (
        <div className="rounded-[12px] border border-rule bg-paper-2 p-4">
          <p className="text-sm text-ink leading-relaxed">
            {!cupo.ok
              ? "Llegaste al tope de socios de tu plan."
              : cupoCasiLleno
                ? `Estás cerca del tope de socios (${cupo.usados}/${cupo.max}).`
                : "Estás en período de prueba."}{" "}
            <Link
              href="/panel/plan"
              className={linkClasses.inline}
            >
              Ver tu plan
            </Link>
          </p>
        </div>
      ) : null}

      {/* Tarjeta Modo Check-in (Móvil) */}
      <div className="md:hidden">
        <Link
          href="/checkin"
          className="flex items-center justify-between p-4 rounded-[14px] border border-volt/35 bg-paper-2 shadow-sm active:scale-[0.98] transition-all min-h-11"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="size-11 rounded-[10px] bg-volt/20 border border-volt/30 text-ink grid place-items-center shrink-0">
              <ScanLine className="size-5 text-volt" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="block text-sm font-semibold text-ink leading-tight">
                  Modo Check-in
                </span>
                <span className="rounded-full bg-volt/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink border border-volt/30">
                  Elite
                </span>
              </div>
              <span className="block text-xs text-ink-soft mt-0.5 truncate">
                Terminal de recepción para ingreso de socios
              </span>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-ink-soft shrink-0 ml-2" />
        </Link>
      </div>

      {/* Onboarding y Acceso PWA */}
      <OnboardingDueno
        tienePlanes={(planesCount ?? 0) > 0}
        tieneSocios={totalSocios > 0}
      />

      <BotonInstalarApp variant="card" />

      {/* ─────────────────────────────────────────────────────────────
          GRID DE MÉTRICAS OPERATIVAS REALES (Mobile: 1 col, Desktop: 2-4 cols)
          ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
            Métricas del Gimnasio
          </span>
          <span className="text-xs text-ink-soft font-medium">
            {ahora.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Ingresos del Mes Actual */}
          <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
                  Ingresos del Mes
                </span>
                <span className="size-7 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center shrink-0">
                  <CreditCard className="size-3.5" />
                </span>
              </div>
              <p className="mt-3 text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                ${ingresosMesActual.toLocaleString("es-AR")}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-rule/60 flex items-center justify-between gap-2">
              {variacionPct !== null ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-[6px] shrink-0 ${
                      variacionPositiva
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-danger/15 text-danger border border-danger/25"
                    }`}
                  >
                    {variacionPositiva ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {variacionPositiva ? "▲" : "▼"} {Math.abs(variacionPct)}%
                  </span>
                  <span className="text-[11px] text-ink-soft truncate">
                    vs mes anterior (${ingresosMesAnterior.toLocaleString("es-AR")})
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-ink-soft truncate">
                  Sin cobros anteriores registrados
                </span>
              )}
            </div>
          </div>

          {/* 2. Socios Activos vs Total */}
          <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
                  Socios Activos
                </span>
                <span className="size-7 rounded-[8px] bg-volt/20 border border-volt/30 text-ink grid place-items-center shrink-0">
                  <Users className="size-3.5 text-volt" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                  {sociosActivos}
                </span>
                <span className="text-sm font-medium text-ink-soft">
                  / {totalSocios} total
                </span>
                <span className="ml-auto text-xs font-semibold text-volt">
                  {pctActivos}%
                </span>
              </div>

              {/* Barra de progreso de socios activos */}
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-paper border border-rule overflow-hidden">
                <div
                  className="h-full rounded-full bg-volt transition-all duration-500"
                  style={{ width: `${pctActivos}%` }}
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-rule/60 flex items-center justify-between text-[11px] text-ink-soft">
              <span>{alDiaCount} al día</span>
              <span>·</span>
              <span className={porVencerCount > 0 ? "text-ink font-medium" : ""}>
                {porVencerCount} por vencer
              </span>
              <span>·</span>
              <span className={vencidosCount > 0 ? "text-danger font-medium" : ""}>
                {vencidosCount} vencidos
              </span>
            </div>
          </div>

          {/* 4. Asistencias de Hoy */}
          <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
                  Asistencias Hoy
                </span>
                <span className="size-7 rounded-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center shrink-0">
                  <Activity className="size-3.5" />
                </span>
              </div>
              <p className="mt-3 text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                {asistenciasHoy}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-rule/60 flex items-center justify-between text-[11px] text-ink-soft">
              <span>Check-ins de recepción</span>
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
          </div>

          {/* 5. En prueba sin convertir */}
          <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
                  En Prueba Sin Convertir
                </span>
                <span className="size-7 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 grid place-items-center shrink-0">
                  <Clock className="size-3.5" />
                </span>
              </div>
              <p className="mt-3 text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                {enPruebaCount}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-rule/60 flex items-center justify-between text-[11px]">
              <span className="text-ink-soft">Día de prueba gratis</span>
              <Link
                href="/panel/clientes"
                className="text-ink hover:text-volt font-medium inline-flex items-center gap-0.5 transition-colors"
              >
                Ver socios <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONSTANCIA DE ENTRENAMIENTO (uso real de la app)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
            Constancia de Entrenamiento
          </span>
          <span className="text-xs text-ink-soft font-medium">Últimos 30 días</span>
        </div>

        <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                  {activos7Count}
                </span>
                <span className="text-sm font-medium text-ink-soft">
                  / {totalSocios} entrenando
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Registraron un entrenamiento en los últimos 7 días
                {activos30Count > activos7Count
                  ? ` · ${activos30Count} en el mes`
                  : ""}
              </p>
            </div>
            <span className="text-sm font-semibold text-volt shrink-0">
              {pctEntrenando}%
            </span>
          </div>

          {activos30Count === 0 ? (
            <p className="mt-4 text-xs text-ink-soft">
              Todavía nadie registra entrenamientos. Cuando tus socios usen la
              rutina en la app, vas a ver acá quiénes son constantes.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-end justify-between gap-1.5 h-16">
                {entrenosPorDow.map((n, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 min-w-0"
                  >
                    <div
                      className="w-full max-w-[28px] rounded-[4px] bg-volt/70"
                      style={{ height: `${Math.round((n / maxDow) * 100)}%` }}
                      title={`${n} entrenamientos`}
                    />
                    <span className="text-[10px] text-ink-soft">
                      {dowLabels[i]}
                    </span>
                  </div>
                ))}
              </div>
              {dowTopNombre && (
                <p className="mt-3 pt-3 border-t border-rule/60 text-[11px] text-ink-soft">
                  Tu día más concurrido son los{" "}
                  <span className="text-ink font-medium">{dowTopNombre}</span>.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECCIÓN DETALLE: VENCEN ESTA SEMANA & ACCIONES RÁPIDAS
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* 3. Vencen esta semana (2 columnas en desktop) */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-semibold text-ink">
                Vencen esta semana
              </h2>
              {porVencerCount > 0 && (
                <span className="rounded-full bg-volt/20 px-2 py-0.5 text-[11px] font-semibold text-ink border border-volt/30">
                  {porVencerCount}
                </span>
              )}
            </div>
            <Link
              href="/panel/clientes"
              className={`text-xs ${linkClasses.inline}`}
            >
              Ver todos los clientes
            </Link>
          </div>

          {vencenEstaSemana.length === 0 ? (
            <div className="rounded-[14px] border border-rule bg-paper-2 px-5 py-8 text-center">
              <span
                aria-hidden
                className="mx-auto mb-3 block size-2 rounded-full bg-volt"
              />
              <p className="font-display text-base font-semibold text-ink">
                Nadie vence esta semana
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Todos los socios tienen su cuota al día o ya regularizada.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-rule rounded-[14px] border border-rule bg-paper-2 overflow-hidden shadow-sm">
              {vencenEstaSemana.map((c) => {
                const iniciales = c.profile?.nombre
                  ? c.profile.nombre
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()
                  : "👤";

                const esHoy = c.dias === 0;

                return (
                  <li key={c.id}>
                    <Link
                      href={`/panel/clientes/${c.id}`}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 hover:bg-paper-3/50 active:bg-paper-3 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {c.foto_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={c.foto_url}
                            alt=""
                            className="size-9 rounded-full object-cover shrink-0 border border-rule bg-paper-3"
                          />
                        ) : (
                          <span className="size-9 rounded-full bg-paper-3 text-ink-soft border border-rule grid place-items-center text-xs font-semibold shrink-0 uppercase tracking-wider">
                            {iniciales}
                          </span>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate leading-snug">
                            {c.profile?.nombre ?? "Socio sin nombre"}
                          </p>
                          <p className="text-xs text-ink-soft truncate mt-0.5">
                            {c.plan?.nombre ?? "Sin plan asignado"} · DNI {c.profile?.dni ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-[8px] px-2.5 py-1 text-xs font-semibold border ${
                            esHoy
                              ? "bg-danger/15 text-danger border-danger/30"
                              : "bg-volt/15 text-ink border-volt/30"
                          }`}
                        >
                          {esHoy
                            ? "Vence hoy"
                            : c.dias === 1
                              ? "Queda 1 día"
                              : `Quedan ${c.dias} días`}
                        </span>
                        <ChevronRight className="size-4 text-ink-soft/50" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Acciones Rápidas del Día a Día (1 columna en desktop) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft font-semibold">
              Operativa Rápida
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Cobrar cuota */}
            <Link
              href="/panel/clientes"
              className="flex items-center justify-between p-3.5 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/20 active:scale-[0.98] transition-all min-h-11 shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="size-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-ink leading-tight">
                    Cobrar cuota
                  </span>
                  <span className="block text-xs text-ink-soft mt-0.5 truncate">
                    Buscar socio y registrar pago
                  </span>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink transition-colors shrink-0 ml-2" />
            </Link>

            {/* Nuevo socio */}
            <Link
              href="/panel/clientes"
              className="flex items-center justify-between p-3.5 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/20 active:scale-[0.98] transition-all min-h-11 shadow-sm group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-[10px] bg-volt/20 border border-volt/35 text-ink grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="size-4 text-volt" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-ink leading-tight">
                    Nuevo socio
                  </span>
                  <span className="block text-xs text-ink-soft mt-0.5 truncate">
                    Alta rápida con DNI
                  </span>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink transition-colors shrink-0 ml-2" />
            </Link>

            {/* Modo Check-in (Desktop) */}
            <div className="hidden md:block">
              <Link
                href="/checkin"
                className="flex items-center justify-between p-3.5 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/20 active:scale-[0.98] transition-all min-h-11 shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
                    <ScanLine className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="block text-sm font-semibold text-ink leading-tight">
                        Modo Check-in
                      </span>
                      <span className="rounded-full bg-volt/20 px-1.5 py-0.2 text-[9px] font-semibold uppercase text-ink">
                        Elite
                      </span>
                    </div>
                    <span className="block text-xs text-ink-soft mt-0.5 truncate">
                      Terminal de recepción
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink transition-colors shrink-0 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

