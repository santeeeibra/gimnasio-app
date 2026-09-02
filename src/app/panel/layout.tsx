import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars } from "@/lib/tema";
import { PanelSidebar, PanelTopbar, PanelBottomNav } from "./panel-nav";
import { Tutorial } from "@/components/tutorial/tutorial";

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

  const temaVars = temaToVars(parseTema(gym?.tema));

  return (
    <div
      className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[220px_1fr]"
      style={temaVars}
    >
      <PanelSidebar
        nombre={gym?.nombre}
        dueno={profile.nombre}
        logo={gym?.logo_url ?? null}
      />

      <div className="flex min-h-screen flex-col">
        <PanelTopbar nombre={gym?.nombre} logo={gym?.logo_url ?? null} />
        <main className="w-full max-w-5xl flex-1 p-6 pb-24 md:p-10 md:pb-10">
          {children}
        </main>
      </div>

      <PanelBottomNav />
      <Tutorial rol="dueno" />
    </div>
  );
}
