import { requireStaffODueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars, polaridadTema, resolverMotion } from "@/lib/tema";
import { OfflineProvider } from "@/components/offline/provider";
import { PantallaReposo } from "@/components/checkin/pantalla-reposo";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";
import { CheckinBloqueadoElite } from "./bloqueado-elite";

export default async function CheckinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaffODueno();
  const supabase = await createClient();
  const [{ data: gym }, infoPlan] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("nombre, tema, logo_url")
      .eq("id", profile.gimnasio_id)
      .single(),
    verificarPlanGimnasio(supabase, profile.gimnasio_id),
  ]);

  const tema = parseTema(gym?.tema);

  if (!infoPlan.permiteCheckin) {
    return (
      <div
        className="capa-ambiental flex min-h-screen flex-col bg-paper text-ink"
        style={temaToVars(tema)}
        data-estilo-visual={tema.estiloVisual}
        data-theme-polarity={polaridadTema(tema)}
        data-motion={resolverMotion(tema)}
      >
        <header className="flex items-center gap-2.5 border-b border-rule px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          {gym?.logo_url ? (
            <span className="size-8 shrink-0 overflow-hidden rounded-[10px] border border-rule bg-paper-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gym.logo_url}
                alt=""
                className="h-full w-full object-contain"
                decoding="async"
              />
            </span>
          ) : null}
          <span className="min-w-0 truncate font-display text-sm">
            {gym?.nombre}
          </span>
          <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            Check-in
          </span>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <CheckinBloqueadoElite />
        </main>
      </div>
    );
  }

  const fondo = tema.checkinFondo;
  const conFondo = fondo.activo && !!fondo.imagenUrl;

  return (
    <div
      className="capa-ambiental relative flex min-h-screen flex-col bg-paper text-ink"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      {conFondo ? (
        <>
          <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fondo.imagenUrl!}
              alt=""
              className="h-full w-full object-cover"
              decoding="async"
            />
            <span
              className="absolute inset-0 bg-paper"
              style={{ opacity: fondo.oscurecido / 100 }}
            />
          </div>
        </>
      ) : null}

      <OfflineProvider />
      <PantallaReposo
        config={tema.reposoCheckin}
        nombre={gym?.nombre ?? ""}
        logoUrl={gym?.logo_url ?? null}
      />
      <header
        className={`relative z-10 flex items-center gap-2.5 border-b px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] ${
          conFondo ? "border-white/10" : "border-rule"
        }`}
      >
        {gym?.logo_url ? (
          <span className="size-8 shrink-0 overflow-hidden rounded-[6px] border border-rule bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gym.logo_url}
              alt=""
              className="h-full w-full object-contain"
              decoding="async"
            />
          </span>
        ) : null}
        <span className="min-w-0 truncate font-display text-sm">
          {gym?.nombre}
        </span>
        <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-ink-soft">
          Check-in
        </span>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>

      {/* Marca SysGym: discreta, no compite con el branding del gimnasio. */}
      <p
        className={`relative z-10 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] text-center text-[10px] uppercase tracking-[0.16em] ${
          conFondo ? "text-white/50" : "text-ink-soft/70"
        }`}
      >
        Gestionado con SysGym
      </p>
    </div>
  );
}
