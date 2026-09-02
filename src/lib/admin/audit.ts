import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AccionAdmin =
  | "ver_gym"
  | "listar_gyms"
  | "push_prueba"
  | "cambiar_estado_gym"
  | "entrar_como"
  | "salir_impersonacion"
  | "editar_planes_plataforma"
  | "asignar_plan_plataforma"
  | "renovar_plan_plataforma"
  | "confirmar_pago_plataforma";

// Registra una acción del superadmin en admin_audit_log. No lanza: si falla,
// solo lo loguea (la auditoría no debe romper la navegación de la consola).
export async function registrarAccionAdmin(
  actorId: string,
  action: AccionAdmin,
  gimnasioId?: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      actor_id: actorId,
      action,
      gimnasio_id: gimnasioId ?? null,
      meta,
    });
  } catch (err) {
    console.error("[admin/audit]", err);
  }
}
