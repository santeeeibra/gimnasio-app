import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Sin esto, el auto-refresh de supabase-js (se dispara en focus/visibilitychange)
      // reescribe las cookies con la sesión vieja guardada en localStorage del navegador,
      // pisando la sesión impersonada del server y expulsando al superadmin de vuelta a /admin.
      auth: { autoRefreshToken: false },
    },
  );
}
