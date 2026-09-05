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
  "activar_gimnasio_disponible",
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
  | "forzar_estado_socio"
  | "activar_gimnasio_disponible"
  | "importar_socios";

// Traduce (action, meta) a un texto legible para la notificación al
// superadmin. El audit log (arriba) sigue guardando el JSON completo — esto
// es solo para el título/cuerpo del push/email.
function formatearAccionAdmin(
  action: AccionAdmin,
  meta: Record<string, unknown>,
  gimnasioNombre?: string | null,
): string {
  const gym = gimnasioNombre ?? "un gimnasio";
  switch (action) {
    case "entrar_como": {
      const rol = typeof meta.rol === "string" ? meta.rol : "usuario";
      return `Entraron como ${rol} de ${gym}`;
    }
    case "salir_impersonacion":
      return `Salieron de la impersonación en ${gym}`;
    case "asignar_plan_plataforma": {
      const fecha = formatearFechaCorta(meta.vence ?? meta.cubre_hasta);
      return fecha
        ? `Asignaron un plan a ${gym}, vence el ${fecha}`
        : `Asignaron un plan a ${gym}`;
    }
    case "renovar_plan_plataforma": {
      const fecha = formatearFechaCorta(meta.vence ?? meta.cubre_hasta);
      return fecha
        ? `Renovaron el plan de ${gym}, vence el ${fecha}`
        : `Renovaron el plan de ${gym}`;
    }
    case "confirmar_pago_plataforma":
      return `Confirmaron un pago de ${gym}`;
    case "rechazar_pago_plataforma":
      return `Rechazaron un pago de ${gym}`;
    case "cambiar_estado_gym": {
      const estado = typeof meta.estado === "string" ? meta.estado : null;
      return estado ? `Cambiaron el estado de ${gym} a "${estado}"` : `Cambiaron el estado de ${gym}`;
    }
    case "activar_gimnasio_disponible":
      return `Activaron el gimnasio disponible ${gym}`;
    case "forzar_estado_socio":
      return `Forzaron el estado de un socio de ${gym}`;
    case "importar_socios": {
      const exitosos = meta.exitosos ?? meta.creados ?? 0;
      return `Importación masiva en ${gym}: ${exitosos} socios creados`;
    }
    case "push_prueba":
      return "Push de prueba enviado";
    case "listar_gyms":
      return "Listaron los gimnasios";
    case "ver_gym":
      return `Vieron el detalle de ${gym}`;
    case "editar_planes_plataforma":
      return "Editaron los planes de la plataforma";
    default:
      return `Acción: ${action}`;
  }
}

function formatearFechaCorta(valor: unknown): string | null {
  if (typeof valor !== "string" && typeof valor !== "number") return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

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
    let gimnasioNombre: string | null = null;
    if (gimnasioId) {
      try {
        const admin = createAdminClient();
        const { data } = await admin
          .from("gimnasios")
          .select("nombre")
          .eq("id", gimnasioId)
          .maybeSingle();
        gimnasioNombre = data?.nombre ?? null;
      } catch (err) {
        console.error("[admin/audit] no se pudo resolver el nombre del gimnasio", err);
      }
    }

    await notificarSuperadmin(
      "Acción en /admin",
      formatearAccionAdmin(action, meta, gimnasioNombre),
    );
  }
}
