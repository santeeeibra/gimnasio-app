import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITE_BYTES, mb, pctUso } from "@/lib/monitor-db";
import { ORIGEN_LABEL, haceCuanto } from "@/lib/admin/errores";
import { linkClasses } from "@/components/ui";
import {
  HeartPulse,
  Database,
  CreditCard,
  BellRing,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSaludPage() {
  await requireSuperadmin();
  const db = createAdminClient();

  const t0 = Date.now();
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: sizeData },
    { data: ultimosPagos },
    { data: ultimoAvisoCron },
    { data: ultimosErrores },
    { data: gymsMp },
    { count: totalErrores24h },
  ] = await Promise.all([
    db.rpc("db_size_bytes"),
    db
      .from("pagos")
      .select("id, monto, estado, proveedor, creado_at, clientes(nombre, gimnasios(nombre, slug))")
      .order("creado_at", { ascending: false })
      .limit(6),
    db
      .from("clientes")
      .select("ultimo_aviso_morosidad_enviado_en")
      .not("ultimo_aviso_morosidad_enviado_en", "is", null)
      .order("ultimo_aviso_morosidad_enviado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("errores_app")
      .select("id, origen, mensaje, creado_en, gimnasios(nombre, slug)")
      .order("creado_en", { ascending: false })
      .limit(6),
    db
      .from("gimnasios")
      .select("id, nombre, slug, mp_collector_id, mp_vinculado_at")
      .not("mp_collector_id", "is", null),
    db.from("errores_app").select("id", { count: "exact", head: true }).gte("creado_en", hace24h),
  ]);

  const dbLatenciaMs = Date.now() - t0;
  const bytesDb = typeof sizeData === "number" ? sizeData : null;
  const pctDb = bytesDb == null ? 0 : pctUso(bytesDb);

  const vapidOk = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const mpKeysOk = !!(process.env.MP_CONNECT_CLIENT_ID && process.env.MP_CONNECT_CLIENT_SECRET);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6 stagger">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 text-ok px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border border-ok/25">
              <span className="size-2 rounded-full bg-ok animate-pulse" />
              Sistemas Operativos
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
            <HeartPulse className="size-6 text-ok" />
            Salud de la Plataforma
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Monitoreo en tiempo real de base de datos, Mercado Pago, Cron de cuotas y errores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="text-xs px-3 py-1.5 rounded-[10px] border border-rule bg-paper hover:bg-paper-2 text-ink font-medium"
          >
            ← Ir al Cockpit
          </Link>
        </div>
      </div>

      {/* Grid Semáforo 4 Pilares */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Supabase DB */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold">
              <Database className="size-4 text-ink-soft" /> Supabase DB
            </span>
            <span className="font-mono text-[11px] text-ok">{dbLatenciaMs}ms</span>
          </div>
          <div className="pt-1">
            <div className="text-lg font-bold text-ink">
              {bytesDb ? `${mb(bytesDb)} MB` : "Conectado"}
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-soft mt-0.5">
              <span>{pctDb}% de 500 MB</span>
              <span className={pctDb > 80 ? "text-danger" : "text-ok"}>
                {pctDb > 80 ? "Alerta cupo" : "Espacio óptimo"}
              </span>
            </div>
            <div className="w-full bg-paper-2 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${pctDb > 80 ? "bg-danger" : "bg-ok"}`}
                style={{ width: `${Math.min(100, Math.max(2, pctDb))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Mercado Pago Connect */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold">
              <CreditCard className="size-4 text-ink-soft" /> Mercado Pago
            </span>
            {mpKeysOk ? (
              <CheckCircle2 className="size-4 text-ok" />
            ) : (
              <XCircle className="size-4 text-warn" />
            )}
          </div>
          <div className="pt-1">
            <div className="text-lg font-bold text-ink">
              {gymsMp?.length ?? 0} Gyms
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              {gymsMp?.length ? "OAuth vinculado activo" : "Sin gyms conectados"}
            </p>
            <span className="inline-block mt-1 text-[10px] text-ok bg-ok/10 px-1.5 py-0.5 rounded font-medium">
              Webhooks operativos
            </span>
          </div>
        </div>

        {/* 3. Cron de Cuotas */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="size-4 text-ink-soft" /> Cron Cuotas
            </span>
            <CheckCircle2 className="size-4 text-ok" />
          </div>
          <div className="pt-1">
            <div className="text-lg font-bold text-ink">
              {ultimoAvisoCron?.ultimo_aviso_morosidad_enviado_en
                ? String(ultimoAvisoCron.ultimo_aviso_morosidad_enviado_en)
                : "Activo"}
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Último aviso de morosidad
            </p>
            <span className="inline-block mt-1 text-[10px] text-ink-soft bg-paper-2 px-1.5 py-0.5 rounded font-mono">
              Vercel Cron diario (9:00 AM)
            </span>
          </div>
        </div>

        {/* 4. Notificaciones Web Push */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold">
              <BellRing className="size-4 text-ink-soft" /> Web Push
            </span>
            {vapidOk ? (
              <CheckCircle2 className="size-4 text-ok" />
            ) : (
              <XCircle className="size-4 text-danger" />
            )}
          </div>
          <div className="pt-1">
            <div className="text-lg font-bold text-ink">
              {vapidOk ? "VAPID OK" : "Sin Claves"}
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              {(totalErrores24h ?? 0) === 0 ? "Cero fallas 24h" : `${totalErrores24h} fallas 24h`}
            </p>
            <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
              (totalErrores24h ?? 0) === 0 ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"
            }`}>
              {(totalErrores24h ?? 0) === 0 ? "100% Saludable" : "Revisar logs"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid 2 Columnas: Últimos Pagos y Últimos Errores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pagos Recientes */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rule/60 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-ink-soft" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                Últimos Pagos Registrados
              </h2>
            </div>
            <span className="text-[11px] text-ink-soft">Tiempo real</span>
          </div>

          {!ultimosPagos || ultimosPagos.length === 0 ? (
            <p className="text-xs text-ink-soft py-4 text-center">No hay pagos registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {ultimosPagos.map((p) => {
                const cliente = (p as any).clientes;
                const gym = cliente?.gimnasios;
                const esMp = p.proveedor === "mercadopago";

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs p-2 rounded-[8px] bg-paper-2/50 border border-rule/50"
                  >
                    <div>
                      <div className="font-semibold text-ink">
                        {cliente?.nombre ?? "Socio"}
                        <span className="text-[10px] font-normal text-ink-soft ml-1.5">
                          ({gym?.nombre ?? "Gym"})
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          esMp ? "bg-cyan-500/10 text-cyan-600" : "bg-paper-2 text-ink-soft"
                        }`}>
                          {esMp ? "Mercado Pago" : "Manual"}
                        </span>
                        <span>•</span>
                        <span>{haceCuanto(p.creado_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-ink">
                        ${Number(p.monto).toLocaleString("es-AR")}
                      </div>
                      <span className="text-[10px] text-ok font-medium">
                        {p.estado}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Errores Recientes */}
        <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rule/60 pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-ink-soft" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                Registro de Errores ({totalErrores24h ?? 0} en 24h)
              </h2>
            </div>
            <Link href="/admin/errores" className={`text-xs ${linkClasses.inline}`}>
              Ver todos →
            </Link>
          </div>

          {!ultimosErrores || ultimosErrores.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <CheckCircle2 className="size-6 text-ok mx-auto" />
              <p className="text-xs font-semibold text-ink">Cero errores registrados</p>
              <p className="text-[11px] text-ink-soft">La aplicación no reportó excepciones recientes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimosErrores.map((e) => {
                const gym = (e as any).gimnasios;
                const origenTxt = ORIGEN_LABEL[e.origen as keyof typeof ORIGEN_LABEL] ?? e.origen;

                return (
                  <div
                    key={e.id}
                    className="text-xs p-2 rounded-[8px] bg-danger/5 border border-danger/20 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-danger">{origenTxt}</span>
                      <span className="text-[10px] text-ink-soft">{haceCuanto(e.creado_en)}</span>
                    </div>
                    <p className="text-ink text-[11px] font-mono line-clamp-1">
                      {e.mensaje}
                    </p>
                    {gym?.nombre && (
                      <p className="text-[10px] text-ink-soft">
                        Gimnasio: {gym.nombre}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
