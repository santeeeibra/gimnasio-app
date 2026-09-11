import { createAdminClient } from "@/lib/supabase/admin";
import type { TipoNotificacionPartner } from "@/types/partner";

/**
 * Registra una notificación en la base de datos para el partner especificado.
 */
export async function crearNotificacionPartner({
  partnerId,
  tipo,
  titulo,
  mensaje,
  metadata = {},
}: {
  partnerId: string;
  tipo: TipoNotificacionPartner;
  titulo: string;
  mensaje: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("partner_notifications").insert({
      partner_id: partnerId,
      tipo,
      titulo,
      mensaje,
      metadata,
    });
    if (error) {
      console.error("[notificaciones-partner] Error al insertar notificación:", error);
    }
  } catch (err) {
    console.error("[notificaciones-partner] Excepción al crear notificación:", err);
  }
}
