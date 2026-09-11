"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { evaluarRecordCliente } from "@/lib/logros/actions";
import type { ResultadoRecord } from "@/lib/logros/tipos";
import type { DropPaso, RegistroDropSet } from "@/lib/progreso/tipos";

async function resolverClienteId(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      clienteId: string;
      gimnasioId: string;
    }
  | { error: string }
> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!data) return { error: "No encontramos tu ficha de cliente." };
  return { supabase, clienteId: data.id as string, gimnasioId: data.gimnasio_id as string };
}

function validarPasos(pasos: DropPaso[]): string | null {
  if (!Array.isArray(pasos) || pasos.length === 0) {
    return "El drop set necesita al menos un escalón.";
  }
  for (const paso of pasos) {
    if (!Number.isFinite(paso.peso) || paso.peso <= 0 || paso.peso >= 10000) {
      return "Ingresá un peso válido en cada escalón.";
    }
    if (!Number.isInteger(paso.reps) || paso.reps <= 0 || paso.reps >= 1000) {
      return "Las reps de cada escalón deben ser un número entero positivo.";
    }
  }
  return null;
}

export type DropSetState = {
  error?: string;
  ok?: string;
  record?: ResultadoRecord;
};

/**
 * Guarda el drop set del cliente autenticado para un ejercicio de la sesión
 * de hoy. Se persiste como fila de `registro_progreso` (mismo `upsert` diario
 * por cliente × ejercicio × fecha que usa el progreso normal), con
 * `detalles_tecnica` cargando los escalones y `peso`/`reps` reflejando el
 * primer escalón (el peso base, el más alto) para que quede compatible con
 * los récords y reportes que ya leen esas columnas.
 */
export async function guardarDropSetCliente(
  ejercicioId: string,
  serieIndex: number,
  pasos: DropPaso[],
): Promise<DropSetState> {
  const res = await resolverClienteId();
  if ("error" in res) return { error: res.error };
  const { supabase, clienteId, gimnasioId } = res;

  ejercicioId = String(ejercicioId ?? "").trim();
  if (!ejercicioId) return { error: "Falta el ejercicio." };
  if (!Number.isInteger(serieIndex) || serieIndex < 0) {
    return { error: "Índice de serie inválido." };
  }

  const errorValidacion = validarPasos(pasos);
  if (errorValidacion) return { error: errorValidacion };

  const pesoBase = pasos[0].peso;
  const repsBase = pasos[0].reps;

  const { error } = await supabase
    .from("registro_progreso")
    .upsert(
      {
        gimnasio_id: gimnasioId,
        cliente_id: clienteId,
        ejercicio_id: ejercicioId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoBase,
        reps: repsBase,
        serie_index: serieIndex,
        detalles_tecnica: { tipo: "dropset", pasos },
        creado_por: "cliente",
      },
      { onConflict: "cliente_id,ejercicio_id,fecha" },
    );

  if (error) return { error: "No se pudo guardar el drop set." };

  revalidatePath("/mi/rutina");

  // Si el peso inicial del drop set supera el récord anterior, evaluamos récord
  // (misma lógica que usa el progreso normal). No bloquea el guardado si falla.
  let record: ResultadoRecord | undefined;
  try {
    record = await evaluarRecordCliente(ejercicioId, pesoBase);
  } catch {
    record = undefined;
  }

  return { ok: "✓", record };
}

/**
 * Recupera el último drop set registrado para un ejercicio, para sugerir
 * pesos/reps de arranque en la próxima sesión.
 */
export async function obtenerUltimoDropSetCliente(
  ejercicioId: string,
): Promise<RegistroDropSet | null> {
  const res = await resolverClienteId();
  if ("error" in res) return null;
  const { supabase, clienteId } = res;

  const { data } = await supabase
    .from("registro_progreso")
    .select("id, fecha, serie_index, detalles_tecnica")
    .eq("cliente_id", clienteId)
    .eq("ejercicio_id", ejercicioId)
    .not("detalles_tecnica", "is", null)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data || !data.detalles_tecnica) return null;

  const detalles = data.detalles_tecnica as { tipo?: string; pasos?: DropPaso[] };
  if (detalles.tipo !== "dropset" || !Array.isArray(detalles.pasos)) return null;

  return {
    id: data.id as string,
    ejercicioId,
    serieIndex: (data.serie_index as number | null) ?? 0,
    pasos: detalles.pasos,
    fecha: data.fecha as string,
  };
}
