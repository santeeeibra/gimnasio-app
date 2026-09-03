import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars } from "@/lib/tema";
import { OfflineProvider } from "@/components/offline/provider";

export default async function CheckinLayout({
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

  return (
    <div
      className="flex min-h-screen flex-col bg-paper text-ink"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
    >
      <OfflineProvider />
      <header className="flex items-center gap-2.5 border-b border-rule px-5 py-3">
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
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>
    </div>
  );
}
