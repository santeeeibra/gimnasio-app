import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notificarSuperadmin } from "@/lib/admin/notificar";

// Acciones de /admin que además del audit log disparan un aviso al superadmin.
const AVISA_SUPERADMIN = new Set<AccionAdmin>([
  "cambiar_estado_gym",
  "asignar_plan_plataforma",
  "renovar_plan_plataforma",
  "confirmar_pago_plataforma",
  "rechazar_pago_plataforma",
  "entrar_como",
]);

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
  | "confirmar_pago_plataforma"
  | "rechazar_pago_plataforma"
  | "forzar_estado_socio";

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

  if (AVISA_SUPERADMIN.has(action)) {
    const meta_txt = Object.keys(meta).length ? `\n${JSON.stringify(meta)}` : "";
    await notificarSuperadmin(
      `Acción en /admin: ${action}`,
      `${gimnasioId ? `Gimnasio: ${gimnasioId}` : "Sin gimnasio"}${meta_txt}`,
    );
  }
}
