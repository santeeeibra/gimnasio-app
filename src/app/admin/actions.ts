"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { registrarAccionAdmin } from "@/lib/admin/audit";

const ESTADOS = ["prueba", "activo", "solo_lectura"] as const;
type EstadoGym = (typeof ESTADOS)[number];

// Cambia gimnasios.estado desde la consola de soporte (para probar el modo
// solo-lectura sin abrir el SQL Editor). Superadmin, service_role, auditado.
export async function cambiarEstadoGimnasio(
  _prev: { ok: boolean; msg: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; msg: string }> {
  const admin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoGym;

  if (!gimnasioId || !ESTADOS.includes(estado)) {
    return { ok: false, msg: "Datos inválidos." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("gimnasios")
    .update({ estado })
    .eq("id", gimnasioId);

  if (error) return { ok: false, msg: error.message };

  await registrarAccionAdmin(admin.id, "cambiar_estado_gym", gimnasioId, {
    estado,
  });
  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  return { ok: true, msg: `Estado cambiado a "${estado}".` };
}

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
