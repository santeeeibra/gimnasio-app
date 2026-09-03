import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, temaToVars, polaridadTema, resolverMotion } from "@/lib/tema";
import { MiBottomNav } from "./mi-nav";
import { Tutorial } from "@/components/tutorial/tutorial";
import { ImpersonationBanner } from "@/components/impersonation/banner";
import { OfflineProvider } from "@/components/offline/provider";

export default async function MiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: gym }, { data: cli }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("nombre, tema, logo_url")
      .eq("id", profile.gimnasio_id)
      .single(),
    supabase
      .from("clientes")
      .select("acceso_habilitado")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  const tema = parseTema(gym?.tema);

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
