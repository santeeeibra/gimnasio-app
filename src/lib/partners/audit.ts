import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function registrarAccionPartner(
  partnerId: string,
  action: "partner_cambiar_datos_cobro" | "partner_solicitar_retiro",
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: null,
      partner_id: partnerId,
      action,
      gimnasio_id: null,
      meta,
    });
  } catch (error) {
    console.error("[partner/audit]", error);
  }
}
