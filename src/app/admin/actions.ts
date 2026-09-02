"use server";

import { requireSuperadmin } from "@/lib/auth";
import { enviarPush } from "@/lib/push/enviar";
import { registrarAccionAdmin } from "@/lib/admin/audit";

// Manda un push de prueba SOLO a los dispositivos del superadmin. Nunca a
// clientes ni dueños de un gimnasio.
export async function enviarPushPrueba(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();

  const title = String(formData.get("title") ?? "").trim() || "Prueba";
  const body =
    String(formData.get("body") ?? "").trim() || "Push de prueba desde soporte.";

  await enviarPush([admin.id], { title, body, tag: "admin-prueba" });
  await registrarAccionAdmin(admin.id, "push_prueba", null, { title });

  return { ok: true, msg: "Enviado a tus dispositivos suscriptos." };
}
