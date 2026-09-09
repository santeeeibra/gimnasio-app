import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseTema,
  resolverTemaCliente,
  temaToVars,
  polaridadTema,
  resolverMotion,
} from "@/lib/tema";
import { MiBottomNav } from "./mi-nav";
import { Tutorial } from "@/components/tutorial/tutorial";
import { ImpersonationBanner } from "@/components/impersonation/banner";
import { OfflineProvider } from "@/components/offline/provider";
import { SplashScreen } from "@/components/mascota/splash-screen";
import { PullToRefresh } from "@/components/mascota/pull-to-refresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: gym }, cliRes] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("nombre, tema, logo_url")
      .eq("id", profile.gimnasio_id)
      .single(),
    supabase
      .from("clientes")
      .select("acceso_habilitado, tema_personalizado")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  let cli = cliRes.data;
  // Fallback defensivo si la columna tema_personalizado todavía no fue migrada en la DB
  if (cliRes.error && (cliRes.error as { code?: string }).code === "42703") {
    const { data: fallbackCli } = await supabase
      .from("clientes")
      .select("acceso_habilitado")
      .eq("profile_id", profile.id)
      .maybeSingle();
    cli = fallbackCli as typeof cli;
  }

  const temaBase = parseTema(gym?.tema);
  const tema = resolverTemaCliente(
    temaBase,
    (cli as { tema_personalizado?: unknown } | null)?.tema_personalizado,
  );

  // Alta sin pago: el socio existe pero no puede usar la app hasta que el dueño
  // registre el primer pago.
  if (cli && cli.acceso_habilitado === false) {
    return (
      <div
        className="capa-ambiental flex min-h-screen items-center justify-center bg-paper text-ink p-6"
        style={temaToVars(tema)}
        data-estilo-visual={tema.estiloVisual}
        data-theme-polarity={polaridadTema(tema)}
        data-motion={resolverMotion(tema)}
      >
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-xl">Tu cuenta está pendiente</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {gym?.nombre ?? "El gimnasio"} todavía no registró tu primer pago.
            Apenas lo haga, vas a poder entrar con estos mismos datos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="capa-ambiental min-h-screen bg-paper text-ink"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <ImpersonationBanner />
      <OfflineProvider />
      <SplashScreen />
      {gym?.logo_url ? (
        <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-rule bg-paper/95 backdrop-blur-md px-5 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
          <span className="size-8 shrink-0 overflow-hidden rounded-[6px] border border-rule bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gym.logo_url}
              alt={gym.nombre ?? "Logo del gimnasio"}
              className="h-full w-full object-contain"
              decoding="async"
            />
          </span>
          <span className="min-w-0 truncate font-display text-sm">
            {gym.nombre}
          </span>
        </header>
      ) : (
        <div className="h-[env(safe-area-inset-top,0px)]" />
      )}
      <div className="pb-20 md:pb-0">
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <MiBottomNav />
      <Tutorial rol="cliente" />
      <div id="portal-root" />
    </div>
  );
}
