import { createClient } from "@supabase/supabase-js";

// Cliente con service_role. Solo en el servidor (Server Actions / Route Handlers).
// Se usa para crear usuarios en Auth al dar de alta clientes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
