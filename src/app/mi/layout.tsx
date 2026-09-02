import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars } from "@/lib/tema";
import { MiBottomNav } from "./mi-nav";
import { Tutorial } from "@/components/tutorial/tutorial";

export default async function MiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("nombre, tema, logo_url")
    .eq("id", profile.gimnasio_id)
    .single();

  const tema = parseTema(gym?.tema);

  return (
    <div
      className="min-h-screen bg-paper"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
    >
      {gym?.logo_url ? (
        <header className="flex items-center gap-2.5 border-b border-rule px-5 py-2.5">
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
      ) : null}
      <div className="pb-20 md:pb-0">{children}</div>
      <MiBottomNav />
      <Tutorial rol="cliente" />
    </div>
  );
}
