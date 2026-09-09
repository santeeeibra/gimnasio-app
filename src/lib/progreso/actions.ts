"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { evaluarRecordCliente } from "@/lib/logros/actions";

export type ProgresoState = {
  error?: string;
  ok?: string;
  record?: {
    esRecord: boolean;
    pesoKg: number;
    pesoAnteriorKg: number | null;
    ejercicioNombre?: string;
    gimnasioNombre?: string;
  };
};

async function resolverClienteId(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  clienteId: string;
  gimnasioId: string;
} | { error: string }> {
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

// ── Acción del cliente ────────────────────────────────────────────────────────

export async function guardarProgresoCliente(
  _prev: ProgresoState,
  formData: FormData,
): Promise<ProgresoState> {
  const res = await resolverClienteId();
  if ("error" in res) return { error: res.error };
  const { supabase, clienteId, gimnasioId } = res;

  const ejercicioId = String(formData.get("ejercicio_id") ?? "").trim();
  const pesoRaw = Number(formData.get("peso") ?? 0);
  const repsRaw = formData.get("reps");
  const reps = repsRaw ? Number(repsRaw) : null;

  if (!ejercicioId) return { error: "Falta el ejercicio." };
  if (pesoRaw < 0 || pesoRaw >= 10000) {
    return { error: "Ingresá un peso válido." };
  }
  if (reps !== null && (!Number.isInteger(reps) || reps <= 0 || reps >= 1000)) {
    return { error: "Las reps deben ser un número positivo." };
  }

  // Evaluar si el peso a cargar supera el récord anterior
  const recordInfo = await evaluarRecordCliente(ejercicioId, pesoRaw);

  const { error } = await supabase
    .from("registro_progreso")
    .upsert(
      {
        gimnasio_id: gimnasioId,
        cliente_id: clienteId,
        ejercicio_id: ejercicioId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoRaw,
        reps,
        creado_por: "cliente",
      },
      { onConflict: "cliente_id,ejercicio_id,fecha" },
    );

  if (error) return { error: "No se pudo guardar el progreso." };

  let ejercicioNombre = "Ejercicio";
  let gimnasioNombre = "Mi Gimnasio";

  if (recordInfo.esRecord) {
    const [{ data: ejData }, { data: gymData }] = await Promise.all([
      supabase.from("ejercicios").select("nombre").eq("id", ejercicioId).maybeSingle(),
      supabase.from("gimnasios").select("nombre").eq("id", gimnasioId).maybeSingle(),
    ]);

    if (ejData?.nombre) ejercicioNombre = ejData.nombre;
    if (gymData?.nombre) gimnasioNombre = gymData.nombre;
  }

  revalidatePath("/mi/rutina");
  return {
    ok: "✓",
    record: {
      ...recordInfo,
      ejercicioNombre,
      gimnasioNombre,
    },
  };
}

// ── Acción del dueño ─────────────────────────────────────────────────────────

export async function guardarProgresoSocio(
  clienteId: string,
  _prev: ProgresoState,
  formData: FormData,
): Promise<ProgresoState> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const ejercicioId = String(formData.get("ejercicio_id") ?? "").trim();
  const pesoRaw = Number(formData.get("peso") ?? 0);
  const repsRaw = formData.get("reps");
  const reps = repsRaw ? Number(repsRaw) : null;

  if (!ejercicioId) return { error: "Falta el ejercicio." };
  if (pesoRaw < 0 || pesoRaw >= 10000) {
    return { error: "Ingresá un peso válido." };
  }

  // Verificar que el cliente pertenece al gimnasio del dueño.
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente || cliente.gimnasio_id !== dueno.gimnasio_id) {
    return { error: "Cliente no encontrado." };
  }

  const { error } = await supabase
    .from("registro_progreso")
    .upsert(
      {
        gimnasio_id: dueno.gimnasio_id,
        cliente_id: clienteId,
        ejercicio_id: ejercicioId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoRaw,
        reps,
        creado_por: "dueno",
      },
      { onConflict: "cliente_id,ejercicio_id,fecha" },
    );

  if (error) return { error: "No se pudo guardar el progreso." };

  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "✓" };
}

// ── Lectura ───────────────────────────────────────────────────────────────────

export type RegistroProgreso = {
  id: string;
  fecha: string;
  peso: number;
  reps: number | null;
  creado_por: "cliente" | "dueno";
};

export async function obtenerProgresoCliente(
  ejercicioId: string,
  limite = 30,
): Promise<RegistroProgreso[]> {
  const res = await resolverClienteId();
  if ("error" in res) return [];
  const { supabase, clienteId } = res;

  const { data } = await supabase
    .from("registro_progreso")
    .select("id, fecha, peso, reps, creado_por")
    .eq("cliente_id", clienteId)
    .eq("ejercicio_id", ejercicioId)
    .order("fecha", { ascending: false })
    .limit(limite);

  return (data ?? []) as RegistroProgreso[];
}

export async function obtenerProgresoSocio(
  clienteId: string,
  ejercicioId: string,
  limite = 30,
): Promise<RegistroProgreso[]> {
  await requireDueno();
  const supabase = await createClient();

  const { data } = await supabase
    .from("registro_progreso")
    .select("id, fecha, peso, reps, creado_por")
    .eq("cliente_id", clienteId)
    .eq("ejercicio_id", ejercicioId)
    .order("fecha", { ascending: false })
    .limit(limite);

  return (data ?? []) as RegistroProgreso[];
}
