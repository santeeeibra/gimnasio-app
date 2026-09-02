"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generarYGuardar } from "@/lib/rutina/generar";
import {
  ENFASIS,
  MAX_ENFASIS,
  NIVELES,
  OBJETIVOS,
  PREFERENCIAS_EQUIPO,
  SEXOS,
  type Enfasis,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

function parseSexo(fd: FormData): Sexo {
  const s = String(fd.get("sexo") ?? "");
  return (SEXOS as readonly string[]).includes(s) ? (s as Sexo) : "sin_especificar";
}

function parseEnfasis(fd: FormData): Enfasis[] {
  return fd
    .getAll("enfasis")
    .map(String)
    .filter((v): v is Enfasis => (ENFASIS as readonly string[]).includes(v))
    .slice(0, MAX_ENFASIS);
}

export type RutinaState = { error?: string; ok?: string };

async function clienteActual() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  return { supabase, cliente: data as { id: string; gimnasio_id: string } | null };
}

export async function generarMiRutina(
  _prev: RutinaState,
  formData: FormData,
): Promise<RutinaState> {
  const { supabase, cliente } = await clienteActual();
  if (!cliente) return { error: "No encontramos tu ficha de cliente." };

  const objetivo = String(formData.get("objetivo") ?? "") as Objetivo;
  const nivel = String(formData.get("nivel") ?? "") as Nivel;
  const preferencia = String(formData.get("preferencia") ?? "") as PreferenciaEquipo;
  const dias = Number(formData.get("dias") ?? 0);
  const sexo = parseSexo(formData);
  const enfasis = parseEnfasis(formData);

  if (!OBJETIVOS.includes(objetivo)) return { error: "Elegí un objetivo." };
  if (!NIVELES.includes(nivel)) return { error: "Elegí tu nivel." };
  if (!(preferencia in PREFERENCIAS_EQUIPO)) return { error: "Elegí el equipamiento." };
  if (!Number.isInteger(dias) || dias < 2 || dias > 6) {
    return { error: "Los días por semana van de 2 a 6." };
  }

  const res = await generarYGuardar(supabase, {
    gimnasioId: cliente.gimnasio_id,
    clienteId: cliente.id,
    entrada: { objetivo, nivel, preferencia, dias, sexo, enfasis },
  });
  if (res.error) return { error: res.error };

  revalidatePath("/mi/rutina");
  revalidatePath("/mi");
  return { ok: "Rutina lista." };
}

export async function editarItem(
  itemId: string,
  campos: { series: number; repeticiones: string; nota: string },
): Promise<RutinaState> {
  await requireProfile();
  const supabase = await createClient();

  const series = Math.min(10, Math.max(1, Math.round(campos.series)));
  const repeticiones = campos.repeticiones.trim().slice(0, 30) || "10";
  const nota = campos.nota.trim().slice(0, 120);

  const { error } = await supabase
    .from("rutina_items")
    .update({ series, repeticiones, nota })
    .eq("id", itemId);
  if (error) return { error: "No se pudo guardar el cambio." };

  revalidatePath("/mi/rutina");
  return { ok: "Guardado." };
}

export async function sustituirEjercicio(
  itemId: string,
  ejercicioId: string,
): Promise<RutinaState> {
  await requireProfile();
  const supabase = await createClient();

  const { data: ej } = await supabase
    .from("ejercicios")
    .select("id")
    .eq("id", ejercicioId)
    .maybeSingle();
  if (!ej) return { error: "Ese ejercicio no existe." };

  const { error } = await supabase
    .from("rutina_items")
    .update({ ejercicio_id: ejercicioId })
    .eq("id", itemId);
  if (error) return { error: "No se pudo cambiar el ejercicio." };

  revalidatePath("/mi/rutina");
  return { ok: "Ejercicio cambiado." };
}
