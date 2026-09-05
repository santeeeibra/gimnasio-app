"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";

export type PesoState = { error?: string; ok?: string };

/** Resuelve el cliente_id del profile autenticado (para flujo del socio). */
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

export async function guardarPesoCliente(
  _prev: PesoState,
  formData: FormData,
): Promise<PesoState> {
  const res = await resolverClienteId();
  if ("error" in res) return { error: res.error };
  const { supabase, clienteId, gimnasioId } = res;

  const pesoRaw = Number(formData.get("peso") ?? 0);
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200) || null;

  if (!pesoRaw || pesoRaw <= 0 || pesoRaw >= 1000) {
    return { error: "Ingresá un peso válido (entre 1 y 999 kg)." };
  }

  const { error } = await supabase
    .from("registro_peso")
    .upsert(
      {
        gimnasio_id: gimnasioId,
        cliente_id: clienteId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoRaw,
        nota,
        creado_por: "cliente",
      },
      { onConflict: "cliente_id,fecha" },
    );

  if (error) return { error: "No se pudo guardar el peso." };

  revalidatePath("/mi");
  revalidatePath("/mi/rutina");
  return { ok: "Peso guardado ✓" };
}

// ── Acción del dueño ─────────────────────────────────────────────────────────

export async function guardarPesoSocio(
  clienteId: string,
  _prev: PesoState,
  formData: FormData,
): Promise<PesoState> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const pesoRaw = Number(formData.get("peso") ?? 0);
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 200) || null;

  if (!pesoRaw || pesoRaw <= 0 || pesoRaw >= 1000) {
    return { error: "Ingresá un peso válido (entre 1 y 999 kg)." };
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
    .from("registro_peso")
    .upsert(
      {
        gimnasio_id: dueno.gimnasio_id,
        cliente_id: clienteId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoRaw,
        nota,
        creado_por: "dueno",
      },
      { onConflict: "cliente_id,fecha" },
    );

  if (error) return { error: "No se pudo guardar el peso." };

  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "Peso guardado ✓" };
}

// ── Lectura (se llama desde componentes client-side) ─────────────────────────

export type RegistroPeso = {
  id: string;
  fecha: string;
  peso: number;
  nota: string | null;
  creado_por: "cliente" | "dueno";
};

export async function obtenerPesosCliente(
  limite = 30,
): Promise<RegistroPeso[]> {
  const res = await resolverClienteId();
  if ("error" in res) return [];
  const { supabase, clienteId } = res;

  const { data } = await supabase
    .from("registro_peso")
    .select("id, fecha, peso, nota, creado_por")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(limite);

  return (data ?? []) as RegistroPeso[];
}

export async function obtenerPesosSocio(
  clienteId: string,
  limite = 30,
): Promise<RegistroPeso[]> {
  await requireDueno();
  const supabase = await createClient();

  const { data } = await supabase
    .from("registro_peso")
    .select("id, fecha, peso, nota, creado_por")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false })
    .limit(limite);

  return (data ?? []) as RegistroPeso[];
}
