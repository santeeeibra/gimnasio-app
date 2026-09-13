"use client";

import { entrarComoAction, salirImpersonacionAction } from "./impersonar-actions";
import { ArrowRight, UserCheck, ShieldCheck, LogOut, Sparkles, ExternalLink } from "lucide-react";
import type { ImpFlag } from "@/lib/impersonation";
import { hapticoImpactoMedio } from "@/lib/ui/hapticos";

interface VistaSwitcherProps {
  duenoProfileId: string | null;
  duenoNombre: string | null;
  duenoDni: string | null;
  socioProfileId: string | null;
  socioNombre: string | null;
  socioDni: string | null;
  gimnasioNombre: string;
  gimnasioSlug: string;
  impersonacion: ImpFlag | null;
}

export function VistaSwitcher({
  duenoProfileId,
  duenoNombre,
  duenoDni,
  socioProfileId,
  socioNombre,
  socioDni,
  gimnasioNombre,
  gimnasioSlug,
  impersonacion,
}: VistaSwitcherProps) {
  return (
    <div className="space-y-4">
      {/* Si hay una emulación / impersonación en curso, cartel destacado de estado */}
      {impersonacion ? (
        <div className="card-cut relative overflow-hidden rounded-[18px] border-2 border-amber-500/50 bg-amber-500/10 p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-black shadow-md">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Sesión de Emulación Activa
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    {impersonacion.rol === "dueno" ? "Dueño" : "Socio"}
                  </span>
                </div>
                <p className="mt-0.5 text-base font-bold text-ink">
                  Viendo como: <span className="underline decoration-amber-500">{impersonacion.nombre}</span> · {impersonacion.gym}
                </p>
                <p className="text-xs text-ink-soft">
                  Las acciones que realices en /panel o /mi afectarán los datos de este usuario con permisos reales.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={impersonacion.rol === "dueno" ? "/panel" : "/mi"}
                onClick={() => hapticoImpactoMedio()}
                className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-amber-500/40 bg-paper px-4 text-xs font-bold text-ink transition-colors hover:bg-paper-2"
              >
                <span>Ir a la pantalla emulada</span>
                <ExternalLink className="size-3.5" />
              </a>

              <form action={salirImpersonacionAction} onSubmit={() => hapticoImpactoMedio()}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-amber-500 px-5 text-xs font-black text-black shadow-md transition-transform hover:brightness-105 active:scale-[0.97]"
                >
                  <LogOut className="size-4 stroke-[2.5]" />
                  <span>Salir y volver al Dev Panel</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {/* Grid de Switcher 1-Click: Dueño vs Socio */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* TARJETA DUEÑO */}
        <div className="card-cut group relative flex flex-col justify-between overflow-hidden rounded-[18px] border border-volt/50 bg-gradient-to-br from-volt/10 via-paper-2 to-paper-2 p-5 shadow-sm transition-all hover:border-volt hover:shadow-md">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-volt/15 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-volt/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-volt-ink border border-volt/40">
                <ShieldCheck className="size-3.5" />
                Vista Dueño · /panel
              </span>
              <span className="rounded-[10px] bg-paper/80 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-soft border border-rule">
                {gimnasioSlug}
              </span>
            </div>

            <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
              🏋️‍♂️ Ver como Dueño
            </h3>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              Inicia sesión instantánea como administrador del gimnasio. Acceso a métricas de facturación, altas de socios, cobros, rutinas y ajustes de plataforma.
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft font-mono bg-paper/70 rounded-[10px] p-2 border border-rule/60">
              <span className="font-bold text-ink">{duenoNombre ?? "Dueño Test"}</span>
              <span>·</span>
              <span className="tabular-nums font-mono">DNI {duenoDni ?? "12345678"}</span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-rule/60">
            {duenoProfileId ? (
              <form action={entrarComoAction} onSubmit={() => hapticoImpactoMedio()}>
                <input type="hidden" name="profile_id" value={duenoProfileId} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-volt px-5 font-bold text-volt-ink shadow-sm transition-all duration-150 hover:brightness-105 active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-sm font-black">Entrar como Dueño (Ir a /panel)</span>
                  <ArrowRight className="size-4 stroke-[3]" />
                </button>
              </form>
            ) : (
              <p className="text-xs text-danger">No se encontró el perfil de dueño para {gimnasioSlug}.</p>
            )}
          </div>
        </div>

        {/* TARJETA SOCIO / CLIENTE */}
        <div className="card-cut group relative flex flex-col justify-between overflow-hidden rounded-[18px] border border-blue-500/40 bg-gradient-to-br from-blue-500/10 via-paper-2 to-paper-2 p-5 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-200 border border-blue-500/30">
                <UserCheck className="size-3.5" />
                Vista Cliente · /mi
              </span>
              <span className="rounded-[10px] bg-paper/80 px-2 py-0.5 font-mono text-[11px] font-bold text-ink-soft border border-rule">
                {gimnasioSlug}
              </span>
            </div>

            <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-ink">
              👤 Ver como Cliente / Socio
            </h3>
            <p className="mt-1 text-xs text-ink-soft leading-relaxed">
              Inicia sesión como alumno del gimnasio. Vista de interfaz móvil: carnet digital interactivo, estado de cuota, rutina del día con cronómetro y check-in.
            </p>

            <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft font-mono bg-paper/70 rounded-[10px] p-2 border border-rule/60">
              <span className="font-bold text-ink">{socioNombre ?? "Socio Test"}</span>
              <span>·</span>
              <span className="tabular-nums font-mono">DNI {socioDni ?? "20000000"}</span>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-rule/60">
            {socioProfileId ? (
              <form action={entrarComoAction} onSubmit={() => hapticoImpactoMedio()}>
                <input type="hidden" name="profile_id" value={socioProfileId} />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-ink px-5 font-bold text-paper shadow-sm transition-all duration-150 hover:bg-ink/90 active:scale-[0.98] cursor-pointer"
                >
                  <span className="text-sm font-black">Entrar como Socio (Ir a /mi)</span>
                  <ArrowRight className="size-4 stroke-[3]" />
                </button>
              </form>
            ) : (
              <p className="text-xs text-danger">No se encontró el perfil de cliente para {gimnasioSlug}.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
