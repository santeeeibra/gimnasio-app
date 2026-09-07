import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITE_BYTES, mb, pctUso, umbralCruzado } from "@/lib/monitor-db";
import { impersonacionActiva } from "@/lib/impersonation";
import { VistaSwitcher } from "./vista-switcher";
import { CredencialesCard } from "./credenciales-card";
import { SelectorPlanRapido } from "./selector-plan-rapido";
import { ResetClavesDev } from "./reset-claves-dev";
import {
  Building2,
  AlertTriangle,
  CreditCard,
  BellRing,
  Dumbbell,
  Database,
  ArrowRight,
  Activity,
  Layers,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = createAdminClient();

  // 1. Verificación de impersonación activa
  const imp = await impersonacionActiva();

  // 2. Métricas de Base de Datos Supabase
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: sizeData },
    { data: estado },
    { data: gymSante },
    { count: totalGyms },
    { count: totalSocios },
    { count: errores24h },
    { data: todosGyms },
  ] = await Promise.all([
    admin.rpc("db_size_bytes"),
    admin.from("monitor_db_estado").select("umbral_avisado, actualizado_at").eq("id", 1).single(),
    admin
      .from("gimnasios")
      .select("id, nombre, slug, estado, plan_plataforma_vence_el, plan:planes_plataforma(id, nombre, max_socios)")
      .eq("slug", "sante")
      .maybeSingle(),
    admin.from("gimnasios").select("id", { count: "exact", head: true }),
    admin.from("clientes").select("id", { count: "exact", head: true }),
    admin.from("errores_app").select("id", { count: "exact", head: true }).gte("creado_en", hace24h),
    admin.from("gimnasios").select("id, nombre, slug").order("nombre", { ascending: true }),
  ]);

  // Si no se encuentra 'sante', buscar primer gimnasio disponible
  let gymTarget = gymSante;
  if (!gymTarget) {
    const { data: firstGym } = await admin
      .from("gimnasios")
      .select("id, nombre, slug, estado, plan_plataforma_vence_el, plan:planes_plataforma(id, nombre, max_socios)")
      .limit(1)
      .maybeSingle();
    gymTarget = firstGym;
  }

  // 3. Obtener perfiles de prueba de Dueño y Socio para ese gimnasio
  let duenoProfile: { id: string; nombre: string | null; dni: string | null } | null = null;
  let socioProfile: { id: string; nombre: string | null; dni: string | null } | null = null;

  if (gymTarget) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, dni, rol, nombre")
      .eq("gimnasio_id", gymTarget.id);

    const profs = profiles ?? [];
    duenoProfile = profs.find((p) => p.dni === "12345678") ?? profs.find((p) => p.rol === "dueno") ?? null;
    socioProfile = profs.find((p) => p.dni === "20000000") ?? profs.find((p) => p.rol === "cliente") ?? null;
  }

  // Cálculos de base de datos
  const bytes = sizeData == null ? null : Number(sizeData);
  const pct = bytes == null ? null : pctUso(bytes);
  const umbral = pct == null ? 0 : umbralCruzado(pct);
  const avisado = (estado?.umbral_avisado as number | undefined) ?? 0;

  const tone =
    umbral >= 90 ? "text-danger" : umbral >= 70 ? "text-warn" : "text-ok";

  const planNombreActual =
    (gymTarget as { plan?: { nombre?: string } | null } | null)?.plan?.nombre ?? "Básico";

  return (
    <div className="space-y-8 stagger">
      {/* HEADER PRINCIPAL */}
      <div className="border-b border-rule pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-volt/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-volt-ink border border-volt/30">
                <Activity className="size-3" />
                Cockpit Dev & Testing
              </span>
              <span className="text-xs text-ink-soft">SysGym Platform Control</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Panel de Desarrollo
            </h1>
          </div>

          {/* Mini contador métricas en vivo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-[12px] border border-rule bg-paper-2/70 px-3 py-1.5">
              <Building2 className="size-4 text-ink-soft" />
              <span className="text-xs font-bold text-ink">{totalGyms ?? 0}</span>
              <span className="text-[11px] text-ink-soft">gyms</span>
            </div>
            <div className="flex items-center gap-2 rounded-[12px] border border-rule bg-paper-2/70 px-3 py-1.5">
              <Users className="size-4 text-ink-soft" />
              <span className="text-xs font-bold text-ink">{totalSocios ?? 0}</span>
              <span className="text-[11px] text-ink-soft">socios</span>
            </div>
            <div className="flex items-center gap-2 rounded-[12px] border border-rule bg-paper-2/70 px-3 py-1.5">
              <AlertTriangle className={`size-4 ${(errores24h ?? 0) > 0 ? "text-warn" : "text-ok"}`} />
              <span className="text-xs font-bold text-ink">{errores24h ?? 0}</span>
              <span className="text-[11px] text-ink-soft">err 24h</span>
            </div>
            <Link
              href="/admin/gimnasios/nuevo"
              className="inline-flex items-center gap-1.5 rounded-[12px] bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper shadow-sm hover:brightness-125 active:scale-95 transition-all"
            >
              + Nuevo Gym
            </Link>
          </div>
        </div>

        <p className="mt-2 text-xs sm:text-sm text-ink-soft max-w-2xl leading-relaxed">
          Probá los flujos reales de la aplicación en 1 clic. Podés entrar como Dueño o como Socio, testear credenciales manuales, cambiar el plan para probar los bloqueos visuales Elite y supervisar el estado de la base de datos.
        </p>
      </div>

      {/* SECCIÓN 1: ACCESO INMEDIATO A VISTAS (1-CLICK SWITCHER) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
            1. Acceso Inmediato a Vistas (1-Click Switcher)
          </h2>
          <span className="text-[11px] text-ink-soft">Abre sesión real sin password</span>
        </div>

        <VistaSwitcher
          duenoProfileId={duenoProfile?.id ?? null}
          duenoNombre={duenoProfile?.nombre ?? null}
          duenoDni={duenoProfile?.dni ?? null}
          socioProfileId={socioProfile?.id ?? null}
          socioNombre={socioProfile?.nombre ?? null}
          socioDni={socioProfile?.dni ?? null}
          gimnasioNombre={gymTarget?.nombre ?? "Sante"}
          gimnasioSlug={gymTarget?.slug ?? "sante"}
          impersonacion={imp}
        />
      </section>

      {/* SECCIÓN 2: TARJETA DE CREDENCIALES DE PRUEBA */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
          2. Credenciales para Login Manual
        </h2>
        <CredencialesCard />
      </section>

      {/* SECCIÓN 3: RESETEO DE CONTRASEÑAS POR GYM O SOCIO */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
          3. Reseteo de Contraseñas (Dueños & Socios por Gym)
        </h2>
        <ResetClavesDev
          gyms={todosGyms ?? []}
          gymInicialId={gymTarget?.id}
        />
      </section>

      {/* SECCIÓN 4: SELECTOR RÁPIDO DE PLAN (TESTING ELITE) */}
      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
          4. Selector Rápido de Plan de Plataforma (Testing Elite)
        </h2>
        <SelectorPlanRapido
          gimnasioSlug={gymTarget?.slug ?? "sante"}
          gimnasioNombre={gymTarget?.nombre ?? "Sante"}
          planActualInicial={planNombreActual}
        />
      </section>

      {/* SECCIÓN 5: DIAGNÓSTICO Y MONITOR DE PLATAFORMA */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-rule pt-6">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.16em] text-ink-soft">
              5. Diagnóstico & Accesos de Consola
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Supervisión de infraestructura Supabase y herramientas de soporte
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs text-ink-soft border border-rule">
            <span className="size-2 rounded-full bg-ok" />
            Supabase Online
          </span>
        </div>

        {/* Tarjeta de Monitor DB */}
        <div className="card-cut rounded-[18px] border border-rule bg-paper-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-ink-soft" />
              <h3 className="text-sm font-semibold text-ink">
                Uso de Base de Datos PostgreSQL
              </h3>
            </div>
            <span className="text-xs text-ink-soft">
              Límite del plan compartido: {(LIMITE_BYTES / 1024 / 1024).toFixed(0)} MB
            </span>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2 items-center">
            <div>
              {pct == null ? (
                <p className="text-sm text-ink-soft">No se pudo medir el tamaño.</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className={`font-display text-4xl sm:text-5xl font-black tracking-tight ${tone}`}>
                      {pct.toFixed(1)}%
                    </span>
                    <span className="text-xs font-medium text-ink-soft">utilizado</span>
                  </div>

                  <p className="mt-1 text-xs text-ink-soft">
                    {mb(bytes!).toFixed(1)} MB de {(LIMITE_BYTES / 1024 / 1024).toFixed(0)} MB asignados
                  </p>

                  {/* Barra visual de progreso */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-paper border border-rule/50">
                    <div
                      className={`h-full transition-all duration-300 ${
                        umbral >= 90 ? "bg-danger" : umbral >= 70 ? "bg-warn" : "bg-ok"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            <dl className="divide-y divide-rule/60 text-xs">
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft">Último aviso disparado</dt>
                <dd className="font-mono font-medium">{avisado === 0 ? "ninguno" : `${avisado}%`}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft">Umbral actual</dt>
                <dd className="font-mono font-medium">{umbral === 0 ? "bajo 70% (normal)" : `${umbral}%`}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-ink-soft">Última medición del cron</dt>
                <dd className="font-mono text-ink-soft">
                  {estado?.actualizado_at
                    ? new Date(estado.actualizado_at).toLocaleString("es-AR")
                    : "sin correr aún"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Accesos rápidos a herramientas de la consola */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/admin/gimnasios"
            className="group flex flex-col justify-between rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-[8px] bg-paper text-ink border border-rule">
                  <Building2 className="size-4" />
                </div>
                <ArrowRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-ink">Gimnasios</h4>
              <p className="mt-1 text-xs text-ink-soft">
                Alta, lista y detalle de todos los gimnasios y sus dueños.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-semibold text-ink-soft group-hover:underline">
              Ver gimnasios →
            </span>
          </Link>

          <Link
            href="/admin/errores"
            className="group flex flex-col justify-between rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-[8px] bg-paper text-ink border border-rule">
                  <AlertTriangle className="size-4 text-warn" />
                </div>
                <ArrowRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-ink">Log de Errores</h4>
              <p className="mt-1 text-xs text-ink-soft">
                Captura de excepciones y stacktraces de clientes en vivo.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-semibold text-ink-soft group-hover:underline">
              Ver errores ({errores24h ?? 0}) →
            </span>
          </Link>

          <Link
            href="/admin/planes"
            className="group flex flex-col justify-between rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-[8px] bg-paper text-ink border border-rule">
                  <CreditCard className="size-4" />
                </div>
                <ArrowRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-ink">Planes Plataforma</h4>
              <p className="mt-1 text-xs text-ink-soft">
                Configurar precios mensuales, cupos de socios y pasarelas.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-semibold text-ink-soft group-hover:underline">
              Gestionar planes →
            </span>
          </Link>

          <Link
            href="/admin/push-prueba"
            className="group flex flex-col justify-between rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-[8px] bg-paper text-ink border border-rule">
                  <BellRing className="size-4" />
                </div>
                <ArrowRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-ink">Push de Prueba</h4>
              <p className="mt-1 text-xs text-ink-soft">
                Disparar notificaciones web push instantáneas a navegadores.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-semibold text-ink-soft group-hover:underline">
              Enviar push →
            </span>
          </Link>

          <Link
            href="/admin/simulador-rutina"
            className="group flex flex-col justify-between rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex size-8 items-center justify-center rounded-[8px] bg-paper text-ink border border-rule">
                  <Dumbbell className="size-4" />
                </div>
                <ArrowRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-ink">Simulador Rutinas</h4>
              <p className="mt-1 text-xs text-ink-soft">
                Probar algoritmos de generación y asignación de ejercicios.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-semibold text-ink-soft group-hover:underline">
              Abrir simulador →
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
