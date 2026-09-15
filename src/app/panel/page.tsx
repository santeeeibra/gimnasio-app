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
  Coins,
  Receipt,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { linkClasses } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffODueno } from "@/lib/auth";
import { diasRestantes, estadoDesdeDias } from "@/lib/cuota";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";
import type { ClienteVista } from "./clientes/cliente-row";
import { OnboardingDueno } from "./onboarding-dueno";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { WidgetAsistenciaSala } from "@/components/panel/widget-asistencia-sala";
import { obtenerPedidosActivos } from "./asistencia/actions";
import { GatingPlanInicialBanner } from "@/components/plataforma/gating-plan-inicial";

export default async function ResumenPage() {
  const dueno = await requireStaffODueno();
  const esStaff = dueno.rol === "staff";
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
    { data: sesionCajaRaw },
    planInfo,
  ] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("estado, nombre")
      .eq("id", dueno.gimnasio_id)
      .single(),
    esStaff
      ? Promise.resolve({ ok: true, usados: 0, max: null, esGratuito: false } as any)
      : cupoSocios(adminDb, dueno.gimnasio_id),
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
    esStaff
      ? Promise.resolve({ data: [] as any[] })
      : supabase
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
    adminDb
      .from("caja_sesiones")
      .select(`
        id,
        turno_nombre,
        abierta_en,
        monto_inicial_efectivo,
        perfil_abrio:profiles!caja_sesiones_abierta_por_fkey(nombre)
      `)
      .eq("gimnasio_id", dueno.gimnasio_id)
      .eq("estado", "abierta")
      .maybeSingle(),
    verificarPlanGimnasio(adminDb, dueno.gimnasio_id),
  ]);

  const sesionCaja = (sesionCajaRaw as unknown as {
    id: string;
    turno_nombre: string;
    abierta_en: string;
    monto_inicial_efectivo: number;
    perfil_abrio: { nombre: string } | null;
  } | null);

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

      {/* Banner de Bienvenida y Accesos para Staff */}
      {esStaff ? (
        <div className="rounded-[14px] border border-rule bg-paper-2 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-volt/20 px-2 py-0.5 text-[10px] font-bold text-ink uppercase tracking-wider border border-volt/30">
                Recepción · Staff
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-ink mt-1.5">
              ¡Hola, {dueno.nombre}!
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Acceso operativo al gimnasio: podés dar de alta socios, cobrar cuotas y gestionar el ingreso.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/panel/clientes"
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-ink px-4 py-2 text-xs font-semibold text-paper hover:opacity-90 active:scale-95 transition-all"
            >
              <Users className="size-4" />
              <span>Ver Socios</span>
            </Link>
            <Link
              href="/checkin"
              className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-volt/20 border border-volt/35 px-4 py-2 text-xs font-semibold text-ink hover:bg-volt/30 active:scale-95 transition-all"
            >
              <ScanLine className="size-4 text-volt" />
              <span>Check-in</span>
            </Link>
          </div>
        </div>
      ) : null}

      {/* Banner Solo Lectura (Solo Dueño) */}
      {!esStaff && soloLectura && (
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

      {/* Banner Cupo / Plan Inicial (40 alumnos, Solo Dueño) */}
      {!esStaff && cupo.esGratuito ? (
        <GatingPlanInicialBanner
          usados={cupo.usados}
          max={cupo.max ?? 40}
          esGratuito={cupo.esGratuito}
        />
      ) : !esStaff && mostrarBannerPlan ? (
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

      {/* Onboarding y Acceso PWA (Solo Dueño) */}
      {!esStaff ? (
        <>
          <OnboardingDueno
            tienePlanes={(planesCount ?? 0) > 0}
            tieneSocios={totalSocios > 0}
          />
          <BotonInstalarApp variant="card" />
        </>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          MOSTRADOR OPERATIVO: ESTADO DE CAJA, ATAJOS Y ATENCIÓN DEL DÍA
          ───────────────────────────────────────────────────────────── */}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-bold tracking-tight text-ink">Mostrador Operativo</h1>
          <p className="text-xs sm:text-sm 2xl:text-base text-ink-soft mt-0.5">
            Turno de recepción, cobro de cuotas y atención diaria de socios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs 2xl:text-sm text-ink-soft font-mono bg-paper-2 border border-rule px-3 2xl:px-4 py-1.5 2xl:py-2 rounded-[8px] 2xl:rounded-[10px] capitalize">
            {ahora.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>

      {/* 1. Estado de Caja del Turno */}
      {planInfo?.permiteControlCaja ? (
        sesionCaja ? (
          <div className="rounded-[16px] 2xl:rounded-[22px] border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 2xl:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 2xl:gap-4.5 min-w-0">
              <div className="size-11 2xl:size-14 rounded-[12px] 2xl:rounded-[16px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 grid place-items-center shrink-0">
                <Coins className="size-6 2xl:size-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs 2xl:text-sm font-black uppercase tracking-wider text-emerald-400">
                    <span className="size-2 2xl:size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    Caja Abierta · {sesionCaja.turno_nombre}
                  </span>
                  {sesionCaja.perfil_abrio?.nombre ? (
                    <span className="text-xs 2xl:text-sm text-ink-soft truncate">
                      por {sesionCaja.perfil_abrio.nombre}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm sm:text-base 2xl:text-xl font-bold text-ink mt-0.5">
                  Fondo inicial: ${sesionCaja.monto_inicial_efectivo.toLocaleString("es-AR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/panel/caja"
                className="px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-[10px] 2xl:rounded-[12px] bg-ink text-paper text-xs 2xl:text-sm font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 shadow-xs"
              >
                Gestionar Turno <ArrowUpRight className="size-3.5 2xl:size-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-[16px] 2xl:rounded-[22px] border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 2xl:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5 2xl:gap-4.5 min-w-0">
              <div className="size-11 2xl:size-14 rounded-[12px] 2xl:rounded-[16px] bg-amber-500/15 border border-amber-500/25 text-amber-400 grid place-items-center shrink-0">
                <Coins className="size-6 2xl:size-7" />
              </div>
              <div className="min-w-0">
                <span className="text-xs 2xl:text-sm font-black uppercase tracking-wider text-amber-400">
                  ○ Sin turno de caja abierto
                </span>
                <p className="text-xs sm:text-sm 2xl:text-base text-ink-soft mt-0.5">
                  Abrí el turno para registrar cobros en efectivo y controlar gastos de mostrador.
                </p>
              </div>
            </div>
            <Link
              href="/panel/caja"
              className="px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-[10px] 2xl:rounded-[12px] bg-[#10e7a0] text-black text-xs 2xl:text-sm font-black hover:brightness-105 transition-all inline-flex items-center gap-1.5 shadow-xs shrink-0"
            >
              + Abrir Turno de Caja
            </Link>
          </div>
        )
      ) : null}

      {/* 2. Acciones Frecuentes / Atajos Rápidos */}
      <div className="space-y-2.5">
        <span className="text-[11px] 2xl:text-xs uppercase tracking-[0.08em] text-ink-soft font-bold px-0.5">
          Atajos Rápidos de Mostrador
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 2xl:gap-5">
          {/* Cobrar Cuota */}
          <Link
            href="/panel/clientes"
            className="group p-4 2xl:p-5.5 rounded-[16px] 2xl:rounded-[20px] border border-rule bg-paper-2 hover:border-volt/40 hover:bg-paper-2/80 active:scale-[0.98] transition-all flex flex-col justify-between shadow-xs min-h-[110px] 2xl:min-h-[135px]"
          >
            <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-emerald-500/15 text-emerald-400 grid place-items-center group-hover:scale-105 transition-transform">
              <CreditCard className="size-5 2xl:size-6" />
            </div>
            <div className="mt-2.5">
              <p className="text-sm 2xl:text-base font-bold text-ink group-hover:text-emerald-400 transition-colors">
                Cobrar Cuota
              </p>
              <p className="text-[11px] 2xl:text-xs text-ink-soft mt-0.5">
                Buscar socio y cobrar
              </p>
            </div>
          </Link>

          {/* Nuevo Socio */}
          <Link
            href="/panel/clientes"
            className="group p-4 2xl:p-5.5 rounded-[16px] 2xl:rounded-[20px] border border-rule bg-paper-2 hover:border-volt/40 hover:bg-paper-2/80 active:scale-[0.98] transition-all flex flex-col justify-between shadow-xs min-h-[110px] 2xl:min-h-[135px]"
          >
            <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-cyan-400/15 text-cyan-400 grid place-items-center group-hover:scale-105 transition-transform">
              <UserPlus className="size-5 2xl:size-6" />
            </div>
            <div className="mt-2.5">
              <p className="text-sm 2xl:text-base font-bold text-ink group-hover:text-cyan-400 transition-colors">
                Nuevo Socio
              </p>
              <p className="text-[11px] 2xl:text-xs text-ink-soft mt-0.5">
                Alta rápida con DNI
              </p>
            </div>
          </Link>

          {/* Caja Diaria */}
          <Link
            href="/panel/caja"
            className="group p-4 2xl:p-5.5 rounded-[16px] 2xl:rounded-[20px] border border-rule bg-paper-2 hover:border-volt/40 hover:bg-paper-2/80 active:scale-[0.98] transition-all flex flex-col justify-between shadow-xs min-h-[110px] 2xl:min-h-[135px]"
          >
            <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-volt/15 text-volt grid place-items-center group-hover:scale-105 transition-transform">
              <Coins className="size-5 2xl:size-6" />
            </div>
            <div className="mt-2.5">
              <p className="text-sm 2xl:text-base font-bold text-ink group-hover:text-volt transition-colors">
                Caja y Turnos
              </p>
              <p className="text-[11px] 2xl:text-xs text-ink-soft mt-0.5">
                Fondo, gastos y arqueo
              </p>
            </div>
          </Link>

          {/* Modo Check-in */}
          <Link
            href="/checkin"
            className="group p-4 2xl:p-5.5 rounded-[16px] 2xl:rounded-[20px] border border-rule bg-paper-2 hover:border-volt/40 hover:bg-paper-2/80 active:scale-[0.98] transition-all flex flex-col justify-between shadow-xs min-h-[110px] 2xl:min-h-[135px]"
          >
            <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-purple-500/15 text-purple-400 grid place-items-center group-hover:scale-105 transition-transform">
              <ScanLine className="size-5 2xl:size-6" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-center gap-1.5">
                <p className="text-sm 2xl:text-base font-bold text-ink group-hover:text-purple-400 transition-colors">
                  Modo Check-in
                </p>
                <span className="rounded-full bg-volt/20 px-1.5 py-0.2 text-[8px] 2xl:text-[9px] font-bold uppercase text-ink">
                  Elite
                </span>
              </div>
              <p className="text-[11px] 2xl:text-xs text-ink-soft mt-0.5">
                Terminal para recepción
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Indicadores Operativos del Día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 2xl:gap-5">
        <div className="rounded-[14px] 2xl:rounded-[18px] border border-rule bg-paper-2 p-4 2xl:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] 2xl:text-xs uppercase tracking-wider text-ink-soft font-semibold">Check-ins Hoy</span>
            <p className="text-2xl 2xl:text-3xl font-display font-bold text-ink mt-0.5">{asistenciasHoy}</p>
            <span className="text-[11px] 2xl:text-xs text-ink-soft">Socios que ingresaron</span>
          </div>
          <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-volt/15 text-volt grid place-items-center shrink-0">
            <Users className="size-5 2xl:size-6" />
          </div>
        </div>

        <div className="rounded-[14px] 2xl:rounded-[18px] border border-rule bg-paper-2 p-4 2xl:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] 2xl:text-xs uppercase tracking-wider text-ink-soft font-semibold">Cuotas Vencidas</span>
            <p className={`text-2xl 2xl:text-3xl font-display font-bold mt-0.5 ${vencidosCount > 0 ? "text-danger" : "text-ink"}`}>
              {vencidosCount}
            </p>
            <span className="text-[11px] 2xl:text-xs text-ink-soft">Para cobrar en recepción</span>
          </div>
          <div className={`size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] grid place-items-center shrink-0 ${vencidosCount > 0 ? "bg-danger/15 text-danger" : "bg-paper-3 text-ink-soft"}`}>
            <AlertCircle className="size-5 2xl:size-6" />
          </div>
        </div>

        <div className="rounded-[14px] 2xl:rounded-[18px] border border-rule bg-paper-2 p-4 2xl:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] 2xl:text-xs uppercase tracking-wider text-ink-soft font-semibold">Vencen Esta Semana</span>
            <p className="text-2xl 2xl:text-3xl font-display font-bold text-ink mt-0.5">{porVencerCount}</p>
            <span className="text-[11px] 2xl:text-xs text-ink-soft">Próximos 7 días</span>
          </div>
          <div className="size-10 2xl:size-12 rounded-[10px] 2xl:rounded-[14px] bg-amber-500/15 text-amber-400 grid place-items-center shrink-0">
            <CalendarClock className="size-5 2xl:size-6" />
          </div>
        </div>
      </div>

      {/* 4. Distribución Operativa en 2 Columnas (Desktop) */}
      {/* Alerta full-width: solo ocupa lugar cuando hay pedidos de sala activos */}
      <WidgetAsistenciaSala
        iniciales={pedidosActivos}
        gimnasioId={dueno.gimnasio_id}
      />

      <div className="pt-2">
        {/* Socios con atención pendiente (Vencidos o por vencer) */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between px-0.5">
            <span className="text-sm font-bold text-ink">
              Cobros y Vencimientos Próximos
            </span>
            <Link href="/panel/clientes" className={`text-xs ${linkClasses.inline}`}>
              Ver todos los clientes →
            </Link>
          </div>

          {vencenEstaSemana.length === 0 ? (
            <div className="rounded-[14px] border border-rule bg-paper-2 px-5 py-8 text-center">
              <span aria-hidden="true" className="mx-auto mb-2 block size-2 rounded-full bg-volt" />
              <p className="text-sm font-semibold text-ink">Al día</p>
              <p className="mt-1 text-xs text-ink-soft">
                No hay cuotas por vencer en los próximos 7 días.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-rule rounded-[14px] border border-rule bg-paper-2 overflow-hidden shadow-xs">
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
                            className="size-8.5 rounded-full object-cover shrink-0 border border-rule bg-paper-3"
                          />
                        ) : (
                          <span className="size-8.5 rounded-full bg-paper-3 text-ink-soft border border-rule grid place-items-center text-xs font-semibold shrink-0 uppercase tracking-wider">
                            {iniciales}
                          </span>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate leading-snug">
                            {c.profile?.nombre ?? "Socio sin nombre"}
                          </p>
                          <p className="text-[11px] text-ink-soft truncate mt-0.5">
                            {c.plan?.nombre ?? "Sin plan"} · DNI {c.profile?.dni ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-[6px] px-2 py-0.5 text-xs font-bold border ${
                            esHoy
                              ? "bg-danger/15 text-danger border-danger/30"
                              : "bg-volt/15 text-ink border-volt/30"
                          }`}
                        >
                          {esHoy
                            ? "Vence hoy"
                            : c.dias === 1
                              ? "1 día"
                              : `${c.dias} días`}
                        </span>
                        <ChevronRight className="size-4 text-ink-soft/50" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Banner discreto para finanzas / métricas completas */}
          {!esStaff ? (
            <div className="pt-2">
              <Link
                href="/panel/ingresos"
                className="w-full flex items-center justify-between p-3 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 transition-colors text-xs text-ink-soft hover:text-ink"
              >
                <span>📈 ¿Querés ver los ingresos y facturación histórica?</span>
                <span className="font-semibold text-ink inline-flex items-center gap-1">
                  Ir a Ingresos →
                </span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
