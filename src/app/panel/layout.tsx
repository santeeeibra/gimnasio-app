import { requireStaffODueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars, polaridadTema, resolverMotion } from "@/lib/tema";
import { PanelSidebar, PanelTopbar, PanelBottomNav } from "./panel-nav";
import { Tutorial } from "@/components/tutorial/tutorial";
import { ImpersonationBanner } from "@/components/impersonation/banner";
import { OfflineProvider } from "@/components/offline/provider";
import { SplashScreen } from "@/components/mascota/splash-screen";
import { PullToRefresh } from "@/components/mascota/pull-to-refresh";

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
    .select("nombre, tema, logo_url, tipo_cuenta")
    .eq("id", profile.gimnasio_id)
    .single();

  const tema = parseTema(gym?.tema);
  const temaVars = temaToVars(tema);
  const esSuper =
    !!process.env.SUPERADMIN_ID && profile.id === process.env.SUPERADMIN_ID;

  return (
    <div
      className="capa-ambiental min-h-screen bg-paper text-ink md:grid md:grid-cols-[256px_1fr]"
      style={temaVars}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <div className="md:col-span-2">
        <ImpersonationBanner />
      </div>
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
        <main className="w-full max-w-[1360px] mx-auto flex-1 p-4 sm:p-6 pb-28 md:p-8 md:pb-10">
          <PullToRefresh>{children}</PullToRefresh>
        </main>
        <PanelBottomNav tipoCuenta={gym?.tipo_cuenta ?? "gym"} rol={profile.rol} />
      </div>

      {profile.rol === "dueno" ? <Tutorial rol="dueno" /> : null}
      <div id="portal-root" />
    </div>
  );
}
