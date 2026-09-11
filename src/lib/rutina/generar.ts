// Orquesta: cargar ejercicios → correr el motor → persistir rutina + items.
// Lo usan tanto la Server Action del cliente (client normal, RLS) como la del
// dueño (client normal, RLS con policy de dueño). No usa service_role.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generarPlan } from "./motor";
import { explicarGeneral, explicarPlan } from "./explicar";
import type { Ejercicio, EntradaMotor } from "./tipos";
import { registrarError } from "@/lib/admin/errores";

type Resultado = { error?: string; ok?: string; rutinaId?: string };

export async function generarYGuardar(
  supabase: SupabaseClient,
  opts: { gimnasioId: string; clienteId: string; entrada: EntradaMotor },
): Promise<Resultado> {
  try {
    return await generarYGuardarInterno(supabase, opts);
  } catch (err) {
    // Log para el semáforo de /admin; el error se sigue propagando.
    await registrarError(opts.gimnasioId, "rutina", err);
    throw err;
  }
}

async function generarYGuardarInterno(
  supabase: SupabaseClient,
  opts: { gimnasioId: string; clienteId: string; entrada: EntradaMotor },
): Promise<Resultado> {
  const { gimnasioId, clienteId, entrada } = opts;

  const { data: ejData, error: ejErr } = await supabase
    .from("ejercicios")
    .select(
      "id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion",
    );
  if (ejErr) {
    await registrarError(gimnasioId, "rutina", ejErr);
    return { error: "No se pudieron leer los ejercicios." };
  }
  const ejercicios = (ejData ?? []) as Ejercicio[];
  if (ejercicios.length === 0) {
    return { error: "La base de ejercicios está vacía. Corré el seed de ejercicios." };
  }

  const plan = generarPlan(entrada, ejercicios);
  const explicacion = explicarPlan(plan, plan.entrada, ejercicios);
  const explicacionGeneral = explicarGeneral(plan.entrada);
  const porSlug = new Map(ejercicios.filter((e) => e.slug).map((e) => [e.slug!, e.id]));

  // ── upsert de la rutina (una por cliente) ──
  const { data: existente } = await supabase
    .from("rutinas")
    .select("id, preferencias")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const prefsPrevias = (existente?.preferencias ?? {}) as Record<string, any>;
  const conteoPrevio =
    prefsPrevias.ultimo_mes_generado === mesActual
      ? Number(prefsPrevias.generaciones_mes ?? 0)
      : 0;

  const payload = {
    gimnasio_id: gimnasioId,
    cliente_id: clienteId,
    objetivo: entrada.objetivo,
    dias_por_semana: plan.entrada.dias,
    nivel: entrada.nivel,
    generada_por: "reglas",
    origen: "auto",
    preferencias: {
      equipo: entrada.preferencia,
      sexo: entrada.sexo,
      enfasis: entrada.enfasis,
      zonasDolor: entrada.zonasDolor ?? [],
      avanzado: entrada.avanzado ?? null,
      explicacion,
      explicacionGeneral,
      ultimo_mes_generado: mesActual,
      generaciones_mes: conteoPrevio + 1,
    },
    dias_titulos: plan.dias.map((d) => d.titulo),
    actualizado_at: ahora.toISOString(),
  };

  let rutinaId: string;
  if (existente?.id) {
    rutinaId = existente.id as string;
    const { error } = await supabase.from("rutinas").update(payload).eq("id", rutinaId);
    if (error) {
      await registrarError(gimnasioId, "rutina", error);
      return { error: "No se pudo actualizar la rutina." };
    }
  } else {
    const { data, error } = await supabase
      .from("rutinas")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) {
      await registrarError(gimnasioId, "rutina", error ?? "insert sin data");
      return { error: "No se pudo crear la rutina." };
    }
    rutinaId = data.id as string;
  }

  // ── reemplazar items ──
  const { error: delErr } = await supabase
    .from("rutina_items")
    .delete()
    .eq("rutina_id", rutinaId);
  if (delErr) {
    await registrarError(gimnasioId, "rutina", delErr);
    return { error: "No se pudieron limpiar los ejercicios anteriores." };
  }

  const filas: Record<string, unknown>[] = [];
  plan.dias.forEach((dia, di) => {
    dia.items.forEach((it, oi) => {
      const ejercicioId = porSlug.get(it.ejercicio_slug);
      if (!ejercicioId) return;
      filas.push({
        rutina_id: rutinaId,
        ejercicio_id: ejercicioId,
        dia: di + 1,
        orden: oi,
        series: it.series,
        repeticiones: it.repeticiones,
        nota: it.nota,
        tecnica: it.tecnica && it.tecnica !== "ninguna" ? it.tecnica : null,
      });
    });
  });

  if (filas.length > 0) {
    const { error: insErr } = await supabase.from("rutina_items").insert(filas);
    if (insErr) {
      await registrarError(gimnasioId, "rutina", insErr);
      return { error: "No se pudieron guardar los ejercicios." };
    }
  }

  return { ok: "Rutina generada.", rutinaId };
}
