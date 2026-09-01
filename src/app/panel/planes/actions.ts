"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PlanState = { error?: string };

export async function crearPlan(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const dueno = await requireDueno();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const precio = Number(formData.get("precio") ?? 0);
  const duracion = Number(formData.get("duracion_dias") ?? 0);

  if (!nombre) return { error: "Poné un nombre al plan." };
  if (!Number.isFinite(duracion) || duracion <= 0)
    return { error: "La duración debe ser mayor a 0 días." };

  const supabase = await createClient();
  const { error } = await supabase.from("planes").insert({
    gimnasio_id: dueno.gimnasio_id,
    nombre,
    precio: Number.isFinite(precio) ? precio : 0,
    duracion_dias: Math.round(duracion),
  });
  if (error) return { error: "No se pudo crear el plan." };

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
