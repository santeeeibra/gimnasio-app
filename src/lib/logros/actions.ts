"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { detectarRecord, calcularRacha } from "./deteccion";
import type { ResultadoRecord, ResultadoRacha, TipoLogro } from "./tipos";

async function resolverCliente(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      clienteId: string;
      gimnasioId: string;
    }
  | null
> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!data) return null;
  return {
    supabase,
    clienteId: data.id as string,
    gimnasioId: data.gimnasio_id as string,
  };
}

// ── Récord de peso ───────────────────────────────────────────────────────────

/**
 * Evalúa si `pesoNuevo` es récord para el ejercicio del cliente logueado.
 * Lee el historial de registro_progreso y descarta el registro de hoy (que el
 * upsert ya pisó).
 */
export async function evaluarRecordCliente(
  ejercicioId: string,
  pesoNuevo: number,
): Promise<ResultadoRecord> {
  const res = await resolverCliente();
  if (!res) {
    return { esRecord: false, pesoKg: pesoNuevo, pesoAnteriorKg: null };
  }
  const { supabase, clienteId } = res;
  const hoy = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("registro_progreso")
    .select("peso, fecha")
    .eq("cliente_id", clienteId)
    .eq("ejercicio_id", ejercicioId)
    .order("fecha", { ascending: false })
    .limit(200);

  return detectarRecord(
    pesoNuevo,
    (data ?? []) as { peso: number; fecha: string }[],
    { excluirFecha: hoy },
  );
}

// ── Racha de constancia ─────────────────────────────────────────────────────

export async function obtenerRachaCliente(): Promise<ResultadoRacha> {
  const res = await resolverCliente();
  if (!res) return { dias: 0, enHito: false, conPerdon: false };
  const { supabase, clienteId } = res;

  const { data } = await supabase
    .from("registros_entrada")
    .select("creado_en")
    .eq("cliente_id", clienteId)
    .order("creado_en", { ascending: false })
    .limit(400);

  const fechas = (data ?? []).map((r) => String(r.creado_en).slice(0, 10));
  return calcularRacha(fechas);
}

// ── Reacciones internas (Parte 1b) ──────────────────────────────────────────

export type ReaccionInput = {
  autorId: string;
  tipoLogro: TipoLogro;
  /** record -> "<ejercicio_id>:<pesoKg>" ; racha -> "<dias>" */
  claveLogro: string;
};

export type ReaccionResultado = {
  ok?: string;
  error?: string;
  miReaccion: boolean;
  total: number;
};

async function contar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  autorId: string,
  tipoLogro: TipoLogro,
  claveLogro: string,
): Promise<number> {
  const { count } = await supabase
    .from("reacciones_logro")
    .select("id", { count: "exact", head: true })
    .eq("autor_id", autorId)
    .eq("tipo_logro", tipoLogro)
    .eq("clave_logro", claveLogro);
  return count ?? 0;
}

/** Toggle: agrega la reacción 👏 del cliente logueado, o la quita si ya estaba. */
export async function alternarReaccionLogro(
  input: ReaccionInput,
): Promise<ReaccionResultado> {
  const res = await resolverCliente();
  if (!res) {
    return { error: "No encontramos tu ficha de cliente.", miReaccion: false, total: 0 };
  }
  const { supabase, clienteId, gimnasioId } = res;

  if (input.autorId === clienteId) {
    return {
      error: "No podés reaccionar a tu propio logro.",
      miReaccion: false,
      total: await contar(supabase, input.autorId, input.tipoLogro, input.claveLogro),
    };
  }

  const { data: existente } = await supabase
    .from("reacciones_logro")
    .select("id")
    .eq("reactor_id", clienteId)
    .eq("autor_id", input.autorId)
    .eq("tipo_logro", input.tipoLogro)
    .eq("clave_logro", input.claveLogro)
    .maybeSingle();

  let miReaccion: boolean;
  if (existente) {
    const { error } = await supabase
      .from("reacciones_logro")
      .delete()
      .eq("id", (existente as { id: string }).id);
    if (error) {
      return { error: "No se pudo quitar la reacción.", miReaccion: true, total: 0 };
    }
    miReaccion = false;
  } else {
    const { error } = await supabase.from("reacciones_logro").insert({
      gimnasio_id: gimnasioId,
      autor_id: input.autorId,
      reactor_id: clienteId,
      tipo_logro: input.tipoLogro,
      clave_logro: input.claveLogro,
      tipo: "aplauso",
    });
    if (error) {
      return { error: "No se pudo registrar la reacción.", miReaccion: false, total: 0 };
    }
    miReaccion = true;
  }

  return {
    ok: "✓",
    miReaccion,
    total: await contar(supabase, input.autorId, input.tipoLogro, input.claveLogro),
  };
}

/** Cuenta de reacciones de un logro + si el cliente logueado ya reaccionó. */
export async function contarReaccionesLogro(
  autorId: string,
  tipoLogro: TipoLogro,
  claveLogro: string,
): Promise<{ total: number; miReaccion: boolean }> {
  const res = await resolverCliente();
  if (!res) return { total: 0, miReaccion: false };
  const { supabase, clienteId } = res;

  const total = await contar(supabase, autorId, tipoLogro, claveLogro);

  const { data: mine } = await supabase
    .from("reacciones_logro")
    .select("id")
    .eq("autor_id", autorId)
    .eq("tipo_logro", tipoLogro)
    .eq("clave_logro", claveLogro)
    .eq("reactor_id", clienteId)
    .maybeSingle();

  return { total, miReaccion: !!mine };
}
