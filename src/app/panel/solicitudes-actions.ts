"use server";

import { revalidatePath } from "next/cache";
import { requireStaffODueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { esSolicitudAlta } from "@/lib/plataforma/alta-socio";

// Solicitudes de alta que los socios crean desde "Crear cuenta" del login
// (lib/plataforma/alta-socio.ts): clientes con acceso_habilitado = false.

export type SolicitudState = { error?: string; ok?: string };

async function solicitudDelGimnasio(clienteId: string) {
  const staff = await requireStaffODueno();
  const admin = createAdminClient();
  const { data } = await admin
    .from("clientes")
    .select("id, profile_id, gimnasio_id, acceso_habilitado")
    .eq("id", clienteId)
    .eq("gimnasio_id", staff.gimnasio_id)
    .maybeSingle();
  if (!data || data.acceso_habilitado !== false) return { staff, admin, solicitud: null };
  // Un socio cargado por el dueño sin pago también está bloqueado: nunca tocarlo acá.
  if (!data.profile_id || !(await esSolicitudAlta(admin, data.profile_id))) {
    return { staff, admin, solicitud: null };
  }
  return { staff, admin, solicitud: data as { id: string; profile_id: string; gimnasio_id: string } };
}

export async function aprobarSolicitud(
  _prev: SolicitudState,
  fd: FormData,
): Promise<SolicitudState> {
  const { staff, admin, solicitud } = await solicitudDelGimnasio(String(fd.get("cliente_id") ?? ""));
  if (!solicitud) return { error: "Esa solicitud ya no está pendiente." };

  const cupo = await cupoSocios(admin, staff.gimnasio_id);
  if (!cupo.ok) {
    return {
      error: cupo.esGratuito
        ? "Llegaste al límite de alumnos del plan gratuito. Pasate a un plan pago en Mi Plan para aprobarlo."
        : `Llegaste al límite de socios de tu plan (${cupo.max}).`,
    };
  }

  const { error } = await admin
    .from("clientes")
    .update({ acceso_habilitado: true })
    .eq("id", solicitud.id)
    .eq("gimnasio_id", staff.gimnasio_id);
  if (error) return { error: "No se pudo aprobar. Probá de nuevo." };

  revalidatePath("/panel");
  revalidatePath("/panel/clientes");
  return { ok: "Aprobado" };
}

export async function rechazarSolicitud(
  _prev: SolicitudState,
  fd: FormData,
): Promise<SolicitudState> {
  const { staff, admin, solicitud } = await solicitudDelGimnasio(String(fd.get("cliente_id") ?? ""));
  if (!solicitud) return { error: "Esa solicitud ya no está pendiente." };

  // Solo se borra una cuenta que nunca tuvo acceso: ficha, perfil y usuario.
  const { data: perfil } = await admin
    .from("profiles")
    .select("id, rol, gimnasio_id")
    .eq("id", solicitud.profile_id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "cliente" || perfil.gimnasio_id !== staff.gimnasio_id) {
    return { error: "No se pudo rechazar esta solicitud." };
  }

  // Si ya tiene pagos no es una solicitud vacía: no se borra.
  const pagos = await admin
    .from("pagos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", solicitud.id);
  if (pagos.error || (pagos.count ?? 0) > 0) {
    return { error: "Esta cuenta ya tiene actividad; no se puede rechazar desde acá." };
  }

  const { error } = await admin.from("clientes").delete().eq("id", solicitud.id);
  if (error) return { error: "No se pudo rechazar. Probá de nuevo." };
  await admin.from("profiles").delete().eq("id", perfil.id);
  await admin.auth.admin.deleteUser(perfil.id);

  revalidatePath("/panel");
  revalidatePath("/panel/clientes");
  return { ok: "Rechazado" };
}
