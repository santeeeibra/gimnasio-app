// Orquesta: cargar ejercicios → correr el motor → persistir rutina + items.
// Lo usan tanto la Server Action del cliente (client normal, RLS) como la del
// dueño (client normal, RLS con policy de dueño). No usa service_role.

import type { SupabaseClient } from "@supabase/supabase-js";
import { generarPlan } from "./motor";
import type { Ejercicio, EntradaMotor } from "./tipos";

type Resultado = { error?: string; ok?: string; rutinaId?: string };

export async function generarYGuardar(
  supabase: SupabaseClient,
  opts: { gimnasioId: string; clienteId: string; entrada: EntradaMotor },
): Promise<Resultado> {
  const { gimnasioId, clienteId, entrada } = opts;

  const { data: ejData, error: ejErr } = await supabase
    .from("ejercicios")
    .select(
      "id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion",
    );
  if (ejErr) return { error: "No se pudieron leer los ejercicios." };
  const ejercicios = (ejData ?? []) as Ejercicio[];
  if (ejercicios.length === 0) {
    return { error: "La base de ejercicios está vacía. Corré el seed de ejercicios." };
  }

  const plan = generarPlan(entrada, ejercicios);
  const porSlug = new Map(ejercicios.filter((e) => e.slug).map((e) => [e.slug!, e.id]));

  // ── upsert de la rutina (una por cliente) ──
  const { data: existente } = await supabase
    .from("rutinas")
    .select("id")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  const payload = {
    gimnasio_id: gimnasioId,
    cliente_id: clienteId,
    objetivo: entrada.objetivo,
    dias_por_semana: plan.entrada.dias,
    nivel: entrada.nivel,
    generada_por: "reglas",
    preferencias: { equipo: entrada.preferencia },
    dias_titulos: plan.dias.map((d) => d.titulo),
    actualizado_at: new Date().toISOString(),
  };

  let rutinaId: string;
  if (existente?.id) {
    rutinaId = existente.id as string;
    const { error } = await supabase.from("rutinas").update(payload).eq("id", rutinaId);
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
  if (delErr) return { error: "No se pudieron limpiar los ejercicios anteriores." };

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
      });
    });
  });

  if (filas.length > 0) {
    const { error: insErr } = await supabase.from("rutina_items").insert(filas);
    if (insErr) return { error: "No se pudieron guardar los ejercicios." };
  }

  return { ok: "Rutina generada.", rutinaId };
}
