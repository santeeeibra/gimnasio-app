import { requireStaffODueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars, polaridadTema, resolverMotion } from "@/lib/tema";
import { PanelSidebar, PanelTopbar, PanelBottomNav } from "./panel-nav";
import { Tutorial } from "@/components/tutorial/tutorial";
import { ImpersonationBanner, ImpersonationControls } from "@/components/impersonation/banner";
import { OfflineProvider } from "@/components/offline/provider";
import { RevalidarAlVolver } from "@/components/offline/revalidar-al-volver";
import { RealtimeRevalida } from "@/components/offline/realtime-revalida";
import { SplashScreen } from "@/components/mascota/splash-screen";
import { PullToRefresh } from "@/components/mascota/pull-to-refresh";
import { DemoToolbar } from "@/components/demo/demo-toolbar";
import { puedeImpersonar } from "@/lib/impersonation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaffODueno();
  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, slug, tema, logo_url, tipo_cuenta")
    .eq("id", profile.gimnasio_id)
    .single();

  const tema = parseTema(gym?.tema);
  const temaVars = temaToVars(tema);
  const esSuper =
    !!process.env.SUPERADMIN_ID && profile.id === process.env.SUPERADMIN_ID;
  const puedeVerDemo = await puedeImpersonar();

  return (
    <div
      className="capa-ambiental min-h-screen bg-paper text-ink md:grid md:grid-cols-[256px_1fr] 2xl:grid-cols-[280px_1fr] transition-[grid-template-columns] duration-200"
      style={temaVars}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <div className="md:col-span-2">
        <ImpersonationBanner />
      </div>
      <ImpersonationControls />
      <RevalidarAlVolver />
      <RealtimeRevalida gimnasioId={profile.gimnasio_id} />
      <OfflineProvider />
      <SplashScreen />

      <PanelSidebar
        nombre={gym?.nombre}
        dueno={profile.nombre}
        logo={gym?.logo_url ?? null}
        tipoCuenta={gym?.tipo_cuenta ?? "gym"}
        esSuper={esSuper}
        rol={profile.rol}
      />

      <div className="flex min-h-screen flex-col">
        <PanelTopbar
          nombre={gym?.nombre}
          logo={gym?.logo_url ?? null}
          esSuper={esSuper}
          rol={profile.rol}
        />
        <main className="w-full max-w-[1440px] 2xl:max-w-[1720px] mx-auto flex-1 p-4 sm:p-6 md:p-8 2xl:p-10 pb-28 md:pb-10 transition-all">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
        <PanelBottomNav tipoCuenta={gym?.tipo_cuenta ?? "gym"} rol={profile.rol} />
      </div>

      {profile.rol === "dueno" ? <Tutorial rol="dueno" /> : null}
      <DemoToolbar rol="dueno" habilitado={puedeVerDemo} />
      <div id="portal-root" />
    </div>
  );
}
