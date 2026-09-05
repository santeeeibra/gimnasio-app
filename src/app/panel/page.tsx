import Link from "next/link";
import { CreditCard, UserPlus, ScanLine, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { linkClasses } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDueno } from "@/lib/auth";
import { diasRestantes } from "@/lib/cuota";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { ClienteRow, type ClienteVista } from "./clientes/cliente-row";
import { OnboardingDueno } from "./onboarding-dueno";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";

export default async function ResumenPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const adminDb = createAdminClient();
  const [{ data: gym }, cupo, { data }, { count: planesCount }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("estado")
      .eq("id", dueno.gimnasio_id)
      .single(),
    cupoSocios(adminDb, dueno.gimnasio_id),
    supabase
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_vencimiento, plan_id, foto_url, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
      )
      .order("fecha_vencimiento", { ascending: true, nullsFirst: true })
      .then(async (res) => {
        if (res.error) {
          return await supabase
            .from("clientes")
            .select(
              "id, estado_cuota, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
            )
            .order("fecha_vencimiento", { ascending: true, nullsFirst: true });
        }
        return res;
      }),
    supabase
      .from("planes")
      .select("id", { count: "exact", head: true })
      .eq("gimnasio_id", dueno.gimnasio_id),
  ]);

  const estadoGimnasio = gym?.estado ?? "prueba";
  const soloLectura = estadoGimnasio === "solo_lectura";

  const cupoCasiLleno =
    cupo.max != null && cupo.usados / cupo.max >= 0.9;
  const mostrarBannerPlan =
    !soloLectura &&
    (estadoGimnasio === "prueba" || !cupo.ok || cupoCasiLleno);

  const clientes = (data ?? []) as unknown as ClienteVista[];
  const total = clientes.length;
  const alDia = clientes.filter((c) => c.estado_cuota === "al_dia").length;
  const porVencer = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d !== null && d >= 0 && d <= 6;
  });
  const vencidos = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d === null || d < 0;
  });

  // El número que importa: primero lo urgente, si no hay, la calma.
  const hero =
    vencidos.length > 0
      ? {
          n: vencidos.length,
          l: vencidos.length === 1 ? "cuota vencida" : "cuotas vencidas",
          tone: "text-danger",
        }
      : porVencer.length > 0
        ? {
            n: porVencer.length,
            l:
              porVencer.length === 1
                ? "cuota vence esta semana"
                : "cuotas vencen esta semana",
            tone: "text-warn",
          }
        : {
            n: alDia,
            l: alDia === 1 ? "cliente al día" : "clientes al día",
            tone: "text-ink",
          };

  const atencion = [...vencidos, ...porVencer];

  return (
    <div className="stagger">
      {soloLectura && (
        <div className="mb-6 rounded-lg border-2 border-danger bg-danger/10 p-4">
          <h2 className="mb-2 text-lg font-display text-danger">
            Período de prueba finalizado
          </h2>
          <p className="mb-3 text-sm text-ink">
            Tu gimnasio está en modo solo lectura. Activá un plan para seguir usando todas las funciones de la app.
          </p>
          <Link
            href="/panel/plan"
            className="inline-block rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Activar plan
          </Link>
        </div>
      )}

      {mostrarBannerPlan && (
        <div className="mb-6 rounded-[6px] border border-rule bg-paper-2 p-4">
          <p className="text-sm">
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
      )}

      {/* GUÍA DE PRIMEROS PASOS / ONBOARDING PROGRESIVO */}
      <OnboardingDueno
        tienePlanes={(planesCount ?? 0) > 0}
        tieneSocios={total > 0}
      />

      {/* ACCESO A PANTALLA DE INICIO (PWA) */}
      <div className="mb-8">
        <BotonInstalarApp variant="card" />
      </div>

      {/* ACCIONES RÁPIDAS DEL DÍA A DÍA */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3.5 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-ink-soft font-bold">
              Acciones Rápidas
            </span>
            <span className="size-1.5 rounded-full bg-volt animate-pulse" />
          </div>
          <span className="text-xs text-ink-soft/70 font-medium">
            Operativa de recepción
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cobrar cuota */}
          <Link
            href="/panel/clientes"
            className="group relative flex items-center justify-between p-4 rounded-xl border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/30 transition-all duration-200 active:scale-[0.98] shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 grid place-items-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/15 transition-all shadow-sm">
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-ink leading-tight">
                  Cobrar cuota
                </span>
                <span className="block text-xs text-ink-soft mt-0.5 truncate">
                  Buscar socio y registrar pago
                </span>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-ink-soft/40 group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Nuevo socio */}
          <Link
            href="/panel/clientes"
            className="group relative flex items-center justify-between p-4 rounded-xl border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/30 transition-all duration-200 active:scale-[0.98] shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-volt/20 border border-volt/35 text-volt-ink dark:text-volt grid place-items-center shrink-0 group-hover:scale-105 group-hover:bg-volt/30 transition-all shadow-sm">
                <UserPlus className="size-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-ink leading-tight">
                  Nuevo socio
                </span>
                <span className="block text-xs text-ink-soft mt-0.5 truncate">
                  Alta rápida con DNI
                </span>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-ink-soft/40 group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>

          {/* Modo Check-in */}
          <Link
            href="/checkin"
            className="group relative flex items-center justify-between p-4 rounded-xl border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/30 transition-all duration-200 active:scale-[0.98] shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="size-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400 grid place-items-center shrink-0 group-hover:scale-105 group-hover:bg-cyan-500/15 transition-all shadow-sm">
                <ScanLine className="size-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-ink leading-tight">
                  Modo Check-in
                </span>
                <span className="block text-xs text-ink-soft mt-0.5 truncate">
                  Pantalla ingreso recepción
                </span>
              </div>
            </div>
            <ArrowUpRight className="size-4 text-ink-soft/40 group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
          </Link>
        </div>
      </div>

      <div className="mb-8 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Resumen de socios
        </span>
        <Link
          href="/panel/clientes"
          className={`text-sm ${linkClasses.inline}`}
        >
          Ver todos
        </Link>
      </div>

      <div className="futurista-fondo mb-10 card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <p
          key={hero.n}
          className={`futurista-num-in font-display leading-[0.82] tracking-tight text-[clamp(4rem,22vw,7rem)] ${hero.tone}`}
        >
          {hero.n}
        </p>
        <p className="mt-2 text-base text-ink-soft">{hero.l}</p>
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>
            <span className="font-medium text-ink">{total}</span> en total
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{alDia}</span> al día
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{porVencer.length}</span> por
            vencer
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{vencidos.length}</span>{" "}
            {vencidos.length === 1 ? "vencida" : "vencidas"}
          </span>
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg">Atención esta semana</h2>
        {atencion.length === 0 ? (
          <div className="card-cut border border-rule bg-paper-2 px-5 py-9 text-center">
            <span
              aria-hidden
              className="mx-auto mb-3 block size-2 rounded-full bg-volt"
            />
            <p className="font-display text-xl">Todo en orden</p>
            <p className="mt-1 text-sm text-ink-soft">
              Nadie con la cuota por vencer esta semana.
            </p>
          </div>
        ) : (
          <ul className="stagger card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
            {atencion.map((c) => (
              <ClienteRow key={c.id} cliente={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
