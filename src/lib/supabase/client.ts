import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // El middleware renueva la sesión del servidor. SSR 0.5.2 sobrescribe
      // esta opción; también detenemos el timer y listener con la API de Auth.
      auth: { autoRefreshToken: false },
    },
  );
  // Esperar la inicialización: Auth instala su listener de visibilitychange
  // al terminar. Detenerlo antes dejaría que se vuelva a activar después.
  void client.auth.initialize().then(() => client.auth.stopAutoRefresh());
  return client;
}
