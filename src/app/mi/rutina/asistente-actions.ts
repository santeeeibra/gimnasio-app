"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { registrarError } from "@/lib/admin/errores";
import { detectarRecord } from "@/lib/logros/deteccion";
import { obtenerRachaCliente } from "@/lib/logros/actions";

export async function buscarReemplazoMaquinaOcupada(ejercicioActualId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("gimnasio_id")
    .eq("profile_id", profile.id)
    .single();

  const gimnasioId = cliente?.gimnasio_id ?? null;

  const { data: actual } = await supabase
    .from("ejercicios")
    .select("id, nombre, patron, grupo_muscular, equipo")
    .eq("id", ejercicioActualId)
    .maybeSingle();

  if (!actual) {
    await registrarError(
      gimnasioId,
      "rutina",
      `[Falta en BD] Ejercicio con ID "${ejercicioActualId}" no encontrado en catálogo al buscar reemplazos en asistente IA. Requiere cargar con GIF.`
    );
    return { ok: false as const, error: "Ejercicio no encontrado en catálogo de base de datos." };
  }

  let query = supabase
    .from("ejercicios")
    .select("id, nombre, equipo, imagen_url, grupo_muscular")
    .eq("grupo_muscular", actual.grupo_muscular)
    .eq("patron", actual.patron)
    .neq("id", actual.id)
    .neq("equipo", actual.equipo);

  if (gimnasioId) {
    query = query.or(`gimnasio_id.is.null,gimnasio_id.eq.${gimnasioId}`);
  } else {
    query = query.is("gimnasio_id", null);
  }

  const { data: alternativas } = await query.limit(3);

  if (!alternativas || alternativas.length === 0) {
    await registrarError(
      gimnasioId,
      "rutina",
      `[Faltan Alternativas en BD] El ejercicio "${actual.nombre}" (patrón: ${actual.patron}, grupo: ${actual.grupo_muscular}) no tiene variantes con otro equipamiento en el gimnasio. Agregar alternativas con GIF en panel dev.`
    );
  }

  return { ok: true as const, actual: actual.nombre, alternativas: alternativas ?? [] };
}

export async function obtenerTipsTecnica(ejercicioId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const gimnasioId = cliente?.gimnasio_id ?? null;

  const { data } = await supabase
    .from("ejercicios")
    .select("id, nombre, descripcion, imagen_url, patron, grupo_muscular")
    .eq("id", ejercicioId)
    .maybeSingle();

  if (!data) {
    await registrarError(
      gimnasioId,
      "rutina",
      `[Falta Ejercicio en BD] Se solicitó técnica del ejercicio ID "${ejercicioId}" pero no existe en la base de datos. Cargar ejercicio junto a su GIF.`
    );
    return { ok: false as const, error: "Ejercicio no registrado en la base de datos." };
  }

  // Si no tiene GIF o no tiene técnica/descripción cargada, avisar a panel dev
  if (!data.imagen_url || !data.descripcion) {
    await registrarError(
      gimnasioId,
      "rutina",
      `[Falta GIF/Técnica en BD] El ejercicio "${data.nombre}" (${data.grupo_muscular ?? "sin grupo"}) no tiene ${!data.imagen_url ? "GIF animado" : ""}${!data.imagen_url && !data.descripcion ? " ni " : ""}${!data.descripcion ? "descripción de técnica" : ""}. Cargar en panel dev.`
    );
  }

  return {
    ok: true as const,
    ejercicio: data,
    faltaContenido: !data.imagen_url || !data.descripcion,
  };
}

export async function reportarEjercicioFaltante(params: {
  ejercicioId?: string;
  ejercicioNombre?: string;
  motivo: string;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("gimnasio_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const gimnasioId = cliente?.gimnasio_id ?? null;

  await registrarError(
    gimnasioId,
    "rutina",
    `[Reporte Asistente IA] Ejercicio "${params.ejercicioNombre ?? "Sin nombre"}" (ID: ${params.ejercicioId ?? "desconocido"}). Motivo: ${params.motivo}. Requiere revisión y GIF en panel dev.`
  );

  return { ok: true as const };
}

/** Resumen festivo de cierre de sesión: kg movidos hoy, PRs superados y racha.
 * Lógica local determinista sobre datos ya persistidos (0 costo de API). */
export async function obtenerResumenSesionHoy() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!cliente) {
    return { ok: false as const, error: "Cliente no encontrado." };
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const { data: registrosHoy } = await supabase
    .from("registro_progreso")
    .select("ejercicio_id, peso, reps")
    .eq("cliente_id", cliente.id)
    .eq("fecha", hoy);

  const filas = registrosHoy ?? [];
  const kgTotales = filas.reduce(
    (sum, r) => sum + (r.peso ?? 0) * (r.reps ?? 0),
    0,
  );

  let prs = 0;
  for (const fila of filas) {
    const { data: historial } = await supabase
      .from("registro_progreso")
      .select("peso, fecha")
      .eq("cliente_id", cliente.id)
      .eq("ejercicio_id", fila.ejercicio_id)
      .neq("fecha", hoy)
      .limit(200);
    const resultado = detectarRecord(
      fila.peso ?? 0,
      (historial ?? []) as { peso: number; fecha?: string }[],
    );
    if (resultado.esRecord) prs++;
  }

  const racha = await obtenerRachaCliente();

  return {
    ok: true as const,
    kgTotales: Math.round(kgTotales),
    prs,
    rachaDias: racha.dias,
  };
}
