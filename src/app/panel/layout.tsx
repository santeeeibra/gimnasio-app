import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars, polaridadTema, resolverMotion } from "@/lib/tema";
import { PanelSidebar, PanelTopbar, PanelBottomNav } from "./panel-nav";
import { Tutorial } from "@/components/tutorial/tutorial";
import { ImpersonationBanner } from "@/components/impersonation/banner";
import { OfflineProvider } from "@/components/offline/provider";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireDueno();
  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, tema, logo_url")
    .eq("id", profile.gimnasio_id)
    .single();

  const tema = parseTema(gym?.tema);
  const temaVars = temaToVars(tema);
  const esSuper =
    !!process.env.SUPERADMIN_ID && profile.id === process.env.SUPERADMIN_ID;

  return (
    <div
      className="capa-ambiental min-h-screen bg-paper text-ink md:grid md:grid-cols-[220px_1fr]"
      style={temaVars}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <div className="md:col-span-2">
        <ImpersonationBanner />
      </div>
      <OfflineProvider />

      <PanelSidebar
        nombre={gym?.nombre}
        dueno={profile.nombre}
        logo={gym?.logo_url ?? null}
        esSuper={esSuper}
      />

      <div className="flex min-h-screen flex-col">
        <PanelTopbar
          nombre={gym?.nombre}
          logo={gym?.logo_url ?? null}
          esSuper={esSuper}
        />
        <main className="w-full max-w-5xl flex-1 p-6 pb-24 md:p-10 md:pb-10">
          {children}
        </main>
      </div>

      <PanelBottomNav />
      <Tutorial rol="dueno" />
    </div>
  );
}
