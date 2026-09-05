"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type DescuentoPlan = {
  id: string;
  nombre: string;
  porcentaje: number;
};

export type PlanState = { error?: string; ok?: boolean };

export async function crearPlan(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const dueno = await requireDueno();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Number(formData.get("precio") ?? 0);
  const duracion = Number(formData.get("duracion_dias") ?? 30);
  const descuentosRaw = String(formData.get("descuentos") ?? "[]");

  let descuentos: DescuentoPlan[] = [];
  try {
    descuentos = JSON.parse(descuentosRaw);
  } catch {}

  if (!nombre) return { error: "Poné un nombre al plan." };
  if (!Number.isFinite(duracion) || duracion <= 0)
    return { error: "La duración debe ser mayor a 0 días." };

  const supabase = await createClient();
  const insertData: Record<string, unknown> = {
    gimnasio_id: dueno.gimnasio_id,
    nombre,
    precio: Number.isFinite(precio) ? precio : 0,
    duracion_dias: Math.round(duracion),
    descuentos,
  };

  let { error } = await supabase.from("planes").insert(insertData);
  if (error && (error.code === "PGRST204" || error.message?.includes("descuentos"))) {
    delete insertData.descuentos;
    const res = await supabase.from("planes").insert(insertData);
    error = res.error;
  }
  if (error) return { error: "No se pudo crear el plan." };

  revalidatePath("/panel/planes");
  return { ok: true };
}

export async function editarPlan(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const dueno = await requireDueno();
  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Number(formData.get("precio") ?? 0);
  const duracion = Number(formData.get("duracion_dias") ?? 30);
  const descuentosRaw = String(formData.get("descuentos") ?? "[]");

  let descuentos: DescuentoPlan[] = [];
  try {
    descuentos = JSON.parse(descuentosRaw);
  } catch {}

  if (!id) return { error: "Falta el ID del plan." };
  if (!nombre) return { error: "Poné un nombre al plan." };
  if (!Number.isFinite(duracion) || duracion <= 0)
    return { error: "La duración debe ser mayor a 0 días." };

  const supabase = await createClient();
  const updateData: Record<string, unknown> = {
    nombre,
    precio: Number.isFinite(precio) ? precio : 0,
    duracion_dias: Math.round(duracion),
    descuentos,
  };

  let { error } = await supabase
    .from("planes")
    .update(updateData)
    .eq("id", id)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (error && (error.code === "PGRST204" || error.message?.includes("descuentos"))) {
    delete updateData.descuentos;
    const res = await supabase
      .from("planes")
      .update(updateData)
      .eq("id", id)
      .eq("gimnasio_id", dueno.gimnasio_id);
    error = res.error;
  }
  if (error) return { error: "No se pudo actualizar el plan." };

  revalidatePath("/panel/planes");
  revalidatePath("/panel");
  return { ok: true };
}

export async function asegurarPlanDefecto(): Promise<{ error?: string }> {
  const dueno = await requireDueno();
  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("planes")
    .select("id")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .limit(1);

  if (existentes && existentes.length > 0) return {};

  const descuentosDefault: DescuentoPlan[] = [
    { id: "estudiante", nombre: "Estudiante", porcentaje: 0 },
    { id: "jubilado", nombre: "Jubilado", porcentaje: 0 },
  ];

  const insertData: Record<string, unknown> = {
    gimnasio_id: dueno.gimnasio_id,
    nombre: "Mensualidad",
    precio: 0,
    duracion_dias: 30,
    descuentos: descuentosDefault,
  };

  let { error } = await supabase.from("planes").insert(insertData);
  if (error && (error.code === "PGRST204" || error.message?.includes("descuentos"))) {
    delete insertData.descuentos;
    const res = await supabase.from("planes").insert(insertData);
    error = res.error;
  }
  if (error) return { error: "No se pudo crear el plan base." };

  revalidatePath("/panel/planes");
  return {};
}

export async function alternarPlan(formData: FormData) {
  await requireDueno();
  const id = String(formData.get("id"));
  const activo = String(formData.get("activo")) === "true";
  const supabase = await createClient();
  await supabase.from("planes").update({ activo: !activo }).eq("id", id);
  revalidatePath("/panel/planes");
}

export async function eliminarPlan(formData: FormData) {
  const dueno = await requireDueno();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("planes")
    .delete()
    .eq("id", id)
    .eq("gimnasio_id", dueno.gimnasio_id);
  revalidatePath("/panel/planes");
  revalidatePath("/panel");
}

