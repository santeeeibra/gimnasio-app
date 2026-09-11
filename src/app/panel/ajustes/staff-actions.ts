"use server";

import { revalidatePath } from "next/cache";
import { requireDueno, dniAEmail, claveInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/admin/errores";

export type AltaStaffState = {
  error?: string;
  ok?: string;
  staff?: {
    nombre: string;
    dni: string;
    clave: string;
  };
};

export async function altaStaff(
  _prev: AltaStaffState,
  formData: FormData,
): Promise<AltaStaffState> {
  const dueno = await requireDueno();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").replace(/\D/g, "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  if (!nombre || !dni) {
    return { error: "El nombre y el DNI son obligatorios." };
  }
  if (!/^\d{6,}$/.test(dni)) {
    return { error: "El DNI debe tener al menos 6 números." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("slug, nombre")
    .eq("id", dueno.gimnasio_id)
    .single();

  if (!gym) {
    return { error: "No se encontró el gimnasio." };
  }

  // Verificar si ya existe perfil con ese DNI en este gimnasio
  const { data: existente } = await admin
    .from("profiles")
    .select("id, rol")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("dni", dni)
    .maybeSingle();

  if (existente) {
    return {
      error: `Ya existe un usuario con DNI ${dni} en tu gimnasio (${existente.rol}).`,
    };
  }

  const clave = claveInicial(dni);
  const emailSintetico = dniAEmail(dni, gym.slug);

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: emailSintetico,
    password: clave,
    email_confirm: true,
  });

  if (authErr || !created.user) {
    return { error: authErr?.message || "No se pudo crear la cuenta de acceso para el empleado." };
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    gimnasio_id: dueno.gimnasio_id,
    rol: "staff",
    dni,
    nombre,
    telefono,
    debe_cambiar_clave: true,
    activo: true,
    permisos: {},
  });

  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await registrarError(dueno.gimnasio_id, "alta_staff", profErr);
    return { error: "No se pudo guardar el perfil del empleado." };
  }

  revalidatePath("/panel/ajustes");
  return {
    ok: "Empleado dado de alta correctamente.",
    staff: {
      nombre,
      dni,
      clave,
    },
  };
}

export async function toggleStaffActivo(
  staffId: string,
  activoActual: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const dueno = await requireDueno();
  if (!staffId) return { ok: false, error: "Identificador inválido." };

  const admin = createAdminClient();

  const { data: staff, error: fetchErr } = await admin
    .from("profiles")
    .select("id, rol, gimnasio_id")
    .eq("id", staffId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("rol", "staff")
    .maybeSingle();

  if (fetchErr || !staff) {
    return { ok: false, error: "Empleado no encontrado." };
  }

  const nuevoEstado = !activoActual;
  const { error: updErr } = await admin
    .from("profiles")
    .update({ activo: nuevoEstado })
    .eq("id", staffId)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (updErr) {
    return { ok: false, error: "No se pudo cambiar el estado del empleado." };
  }

  revalidatePath("/panel/ajustes");
  return { ok: true };
}

export async function restablecerClaveStaff(
  staffId: string,
): Promise<{ ok?: string; error?: string; clave?: string }> {
  const dueno = await requireDueno();
  if (!staffId) return { error: "Falta el identificador del empleado." };

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("profiles")
    .select("id, dni, rol, gimnasio_id")
    .eq("id", staffId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("rol", "staff")
    .maybeSingle();

  if (!staff) {
    return { error: "Empleado no encontrado." };
  }

  const clave = claveInicial(staff.dni);
  const { error: authErr } = await admin.auth.admin.updateUserById(staff.id, {
    password: clave,
  });

  if (authErr) {
    return { error: "No se pudo restablecer la contraseña." };
  }

  await admin
    .from("profiles")
    .update({ debe_cambiar_clave: true })
    .eq("id", staff.id);

  revalidatePath("/panel/ajustes");
  return { ok: "Contraseña restablecida.", clave };
}
