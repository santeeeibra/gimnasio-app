"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generarYGuardar } from "@/lib/rutina/generar";
import {
  ENFASIS,
  MAX_DIAS_MANUAL,
  MAX_EJERCICIOS_DIA,
  MAX_ENFASIS,
  MOLESTIAS,
  NIVELES,
  OBJETIVOS,
  ORDENES,
  PREFERENCIAS_EQUIPO,
  RANGOS,
  REPS_OPCIONES,
  RIR_OPCIONES,
  SERIES_OPCIONES,
  SEXOS,
  SPLITS,
  TECNICAS,
  VOLUMENES,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type OpcionesAvanzadas,
  type PreferenciaEquipo,
  type Sexo,
  type Tecnica,
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

function pick<T extends string>(
  fd: FormData,
  key: string,
  allowed: readonly T[],
  def: T,
): T {
  const v = String(fd.get(key) ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : def;
}

// Modo avanzado (SPEC_RUTINA_AVANZADA.md). Solo se arma si el nivel es avanzado;
// para el resto se devuelve undefined y el motor se comporta como siempre.
function parseAvanzado(fd: FormData): OpcionesAvanzadas {
  const tecRaw = String(fd.get("tecnicaAislamientos") ?? "ninguna");
  return {
    split: pick(fd, "split", SPLITS, "auto"),
    rango: pick(fd, "rango", RANGOS, "estandar"),
    volumen: pick(fd, "volumen", VOLUMENES, "estandar"),
    rir: pick(fd, "rir", RIR_OPCIONES, "2-3"),
    orden: pick(fd, "orden", ORDENES, "compuestos_primero"),
    tecnicaAislamientos: (TECNICAS as readonly string[]).includes(tecRaw)
      ? (tecRaw as Tecnica)
      : "ninguna",
    evitar: fd
      .getAll("evitar")
      .map(String)
      .filter((v): v is Molestia => (MOLESTIAS as readonly string[]).includes(v)),
  };
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

async function generarComun(
  formData: FormData,
  conAvanzado: boolean,
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

  // Los ajustes finos solo aplican a nivel avanzado (SPEC §1).
  const avanzado =
    conAvanzado && nivel === "avanzado" ? parseAvanzado(formData) : undefined;

  const seed = Math.floor(Math.random() * 1_000_000_000);
  const res = await generarYGuardar(supabase, {
    gimnasioId: cliente.gimnasio_id,
    clienteId: cliente.id,
    entrada: { objetivo, nivel, preferencia, dias, sexo, enfasis, seed, avanzado },
  });
  if (res.error) return { error: res.error };

  revalidatePath("/mi/rutina");
  revalidatePath("/mi");
  return { ok: "Rutina lista." };
}

export async function generarMiRutina(
  _prev: RutinaState,
  formData: FormData,
): Promise<RutinaState> {
  return generarComun(formData, false);
}

export async function generarMiRutinaAvanzada(
  _prev: RutinaState,
  formData: FormData,
): Promise<RutinaState> {
  return generarComun(formData, true);
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

// ── Modo manual (SPEC_PANEL_AVANZADO_RUTINA.md) ──────────────────────────────
// El cliente arma la rutina a mano: no pasa por generarPlan(), escribe en la
// misma estructura (rutinas + rutina_items) marcando origen 'manual'.

const SERIES_VALIDAS = new Set<number>(SERIES_OPCIONES as readonly number[]);
const REPS_VALIDAS = new Set<string>(REPS_OPCIONES as readonly string[]);
const TECNICAS_VALIDAS = new Set<string>(TECNICAS as readonly string[]);

type ItemManual = {
  ejercicio_id: string;
  series: number;
  repeticiones: string;
  tecnica: Tecnica;
};

export async function guardarRutinaManual(
  _prev: RutinaState,
  formData: FormData,
): Promise<RutinaState> {
  const { supabase, cliente } = await clienteActual();
  if (!cliente) return { error: "No encontramos tu ficha de cliente." };

  let parsed: { dias?: unknown };
  try {
    parsed = JSON.parse(String(formData.get("plan") ?? "{}"));
  } catch {
    return { error: "No se pudo leer la rutina." };
  }

  const diasRaw = Array.isArray(parsed.dias) ? parsed.dias : [];
  if (diasRaw.length < 1 || diasRaw.length > MAX_DIAS_MANUAL) {
    return { error: `Elegí entre 1 y ${MAX_DIAS_MANUAL} días.` };
  }

  const dias: { titulo: string; items: ItemManual[] }[] = [];
  for (let i = 0; i < diasRaw.length; i++) {
    const d = diasRaw[i] as { titulo?: unknown; items?: unknown };
    const itemsRaw = Array.isArray(d?.items) ? d.items : [];
    if (itemsRaw.length === 0) {
      return { error: `El día ${i + 1} no tiene ejercicios.` };
    }
    if (itemsRaw.length > MAX_EJERCICIOS_DIA) {
      return { error: `Máximo ${MAX_EJERCICIOS_DIA} ejercicios por día.` };
    }

    const items: ItemManual[] = [];
    for (const it of itemsRaw as Record<string, unknown>[]) {
      const ejercicio_id = String(it?.ejercicio_id ?? "");
      if (!ejercicio_id) return { error: "Elegí un ejercicio en cada fila." };

      const series = Math.round(Number(it?.series));
      if (!SERIES_VALIDAS.has(series)) return { error: "Series inválidas." };

      const repeticiones = String(it?.repeticiones ?? "");
      if (!REPS_VALIDAS.has(repeticiones)) {
        return { error: "Repeticiones inválidas." };
      }

      const tecnicaRaw = String(it?.tecnica ?? "ninguna");
      const tecnica = (
        TECNICAS_VALIDAS.has(tecnicaRaw) ? tecnicaRaw : "ninguna"
      ) as Tecnica;

      items.push({ ejercicio_id, series, repeticiones, tecnica });
    }

    const titulo =
      String(d?.titulo ?? "").trim().slice(0, 40) || `Día ${i + 1}`;
    dias.push({ titulo, items });
  }

  // Los ejercicios tienen que existir y ser visibles para el cliente (la RLS
  // del select ya limita a globales + del propio gimnasio).
  const ids = [
    ...new Set(dias.flatMap((d) => d.items.map((it) => it.ejercicio_id))),
  ];
  const { data: ejData, error: ejErr } = await supabase
    .from("ejercicios")
    .select("id")
    .in("id", ids);
  if (ejErr) return { error: "No se pudieron validar los ejercicios." };
  const validos = new Set((ejData ?? []).map((e) => e.id as string));
  if (ids.some((id) => !validos.has(id))) {
    return { error: "Hay un ejercicio que no existe." };
  }

  // ── upsert de la rutina (una por cliente) ──
  const { data: existente } = await supabase
    .from("rutinas")
    .select("id")
    .eq("cliente_id", cliente.id)
    .maybeSingle();

  const payload = {
    gimnasio_id: cliente.gimnasio_id,
    cliente_id: cliente.id,
    objetivo: null,
    nivel: null,
    dias_por_semana: dias.length,
    generada_por: "manual",
    origen: "manual",
    preferencias: null,
    dias_titulos: dias.map((d) => d.titulo),
    actualizado_at: new Date().toISOString(),
  };

  let rutinaId: string;
  if (existente?.id) {
    rutinaId = existente.id as string;
    const { error } = await supabase
      .from("rutinas")
      .update(payload)
      .eq("id", rutinaId);
    if (error) return { error: "No se pudo actualizar la rutina." };
  } else {
    const { data, error } = await supabase
      .from("rutinas")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return { error: "No se pudo crear la rutina." };
    rutinaId = data.id as string;
  }

  // ── reemplazar items ──
  const { error: delErr } = await supabase
    .from("rutina_items")
    .delete()
    .eq("rutina_id", rutinaId);
  if (delErr) {
    return { error: "No se pudieron limpiar los ejercicios anteriores." };
  }

  const filas: Record<string, unknown>[] = [];
  dias.forEach((dia, di) => {
    dia.items.forEach((it, oi) => {
      filas.push({
        rutina_id: rutinaId,
        ejercicio_id: it.ejercicio_id,
        dia: di + 1,
        orden: oi,
        series: it.series,
        repeticiones: it.repeticiones,
        nota: "",
        tecnica: it.tecnica === "ninguna" ? null : it.tecnica,
      });
    });
  });

  if (filas.length > 0) {
    const { error: insErr } = await supabase
      .from("rutina_items")
      .insert(filas);
    if (insErr) return { error: "No se pudieron guardar los ejercicios." };
  }

  revalidatePath("/mi/rutina");
  revalidatePath("/mi");
  return { ok: "Rutina guardada." };
}

export async function editarTecnica(
  itemId: string,
  tecnica: string,
): Promise<RutinaState> {
  await requireProfile();
  const supabase = await createClient();

  const t = TECNICAS_VALIDAS.has(tecnica) ? tecnica : "ninguna";
  const { error } = await supabase
    .from("rutina_items")
    .update({ tecnica: t === "ninguna" ? null : t })
    .eq("id", itemId);
  if (error) return { error: "No se pudo guardar la técnica." };

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
