// Helpers para plantillas de rutina compartibles (Fase 1 monetización).
// - snapshotItemsDeRutina: congela los rutina_items de una rutina en JSON.
// - normalizarCodigo / codigoLibre: código corto legible y único (ej. LUCAS).
// - clonarPlantillaParaCliente: vuelca el snapshot en rutinas + rutina_items
//   del alumno (una rutina por cliente, reemplaza la anterior).

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlantillaItem = {
  dia: number;
  orden: number;
  series: number | null;
  repeticiones: string | null;
  nota: string | null;
  tecnica: string | null;
  ejercicio_slug: string | null;
  ejercicio_nombre: string | null;
  grupo_muscular: string | null;
};

export type PlantillaRow = {
  id: string;
  gimnasio_id: string;
  nombre: string;
  codigo: string;
  objetivo: string | null;
  nivel: string | null;
  dias_por_semana: number | null;
  dias_titulos: string[] | null;
  preferencias: Record<string, unknown> | null;
  items: PlantillaItem[] | null;
  activa: boolean;
  veces_cargada: number;
};

// Segmentos de ruta / palabras que no pueden ser un código.
const RESERVADOS = new Set([
  "r", "admin", "api", "panel", "mi", "login", "demo", "inicio", "auth",
  "registrarse", "suspendido", "sw", "manifest",
]);

export function normalizarCodigo(raw: string): string {
  return (raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

/** Devuelve un código normalizado que no choca con otro ya usado. */
export async function codigoLibre(
  admin: SupabaseClient,
  deseado: string,
): Promise<string> {
  let base = normalizarCodigo(deseado) || "COACH";
  if (base.length < 3) base = `${base}COACH`.slice(0, 6);
  if (RESERVADOS.has(base.toLowerCase())) base = `${base}1`;

  for (let i = 0; i < 50; i++) {
    const cand = i === 0 ? base : `${base}${i + 1}`;
    const { data } = await admin
      .from("rutina_plantillas")
      .select("id")
      .eq("codigo", cand)
      .maybeSingle();
    if (!data) return cand;
  }
  return `${base}${Date.now().toString(36).toUpperCase()}`;
}

/** Congela los ejercicios de una rutina (con slug + nombre) para la plantilla. */
export async function snapshotItemsDeRutina(
  supabase: SupabaseClient,
  rutinaId: string,
): Promise<PlantillaItem[]> {
  const { data } = await supabase
    .from("rutina_items")
    .select(
      "dia, orden, series, repeticiones, nota, tecnica, ejercicio:ejercicios(slug, nombre, grupo_muscular)",
    )
    .eq("rutina_id", rutinaId)
    .order("dia")
    .order("orden");

  return ((data ?? []) as Record<string, unknown>[]).map((it) => {
    const ej = (it.ejercicio ?? null) as
      | { slug?: string; nombre?: string; grupo_muscular?: string }
      | null;
    return {
      dia: Number(it.dia ?? 1),
      orden: Number(it.orden ?? 0),
      series: (it.series as number | null) ?? null,
      repeticiones: (it.repeticiones as string | null) ?? null,
      nota: (it.nota as string | null) ?? null,
      tecnica: (it.tecnica as string | null) ?? null,
      ejercicio_slug: ej?.slug ?? null,
      ejercicio_nombre: ej?.nombre ?? null,
      grupo_muscular: ej?.grupo_muscular ?? null,
    };
  });
}

/** Agrupa los items del snapshot por día (para previsualizar la plantilla). */
export function agruparItems(
  items: PlantillaItem[],
  titulos: string[] | null,
): { numero: number; titulo: string; items: PlantillaItem[] }[] {
  const porDia = new Map<number, { numero: number; titulo: string; items: PlantillaItem[] }>();
  for (const it of items) {
    if (!porDia.has(it.dia)) {
      porDia.set(it.dia, {
        numero: it.dia,
        titulo: titulos?.[it.dia - 1] ?? `Día ${it.dia}`,
        items: [],
      });
    }
    porDia.get(it.dia)!.items.push(it);
  }
  return [...porDia.values()]
    .sort((a, b) => a.numero - b.numero)
    .map((d) => ({ ...d, items: d.items.sort((a, b) => a.orden - b.orden) }));
}

/**
 * Clona la plantilla en la rutina del cliente (crea o reemplaza). Usa el
 * cliente pasado (service_role en el onboarding público, RLS del cliente si
 * está logueado).
 */
export async function clonarPlantillaParaCliente(
  supabase: SupabaseClient,
  opts: { plantilla: PlantillaRow; clienteId: string; gimnasioId: string },
): Promise<{ error?: string; rutinaId?: string }> {
  const { plantilla, clienteId, gimnasioId } = opts;
  const items = (plantilla.items ?? []) as PlantillaItem[];

  const slugs = [
    ...new Set(items.map((i) => i.ejercicio_slug).filter(Boolean) as string[]),
  ];
  const { data: ejData } = await supabase
    .from("ejercicios")
    .select("id, slug")
    .in("slug", slugs.length ? slugs : ["__none__"]);
  const porSlug = new Map(
    ((ejData ?? []) as { id: string; slug: string }[]).map((e) => [e.slug, e.id]),
  );

  const payload = {
    gimnasio_id: gimnasioId,
    cliente_id: clienteId,
    objetivo: plantilla.objetivo ?? null,
    nivel: plantilla.nivel ?? null,
    dias_por_semana: plantilla.dias_por_semana ?? null,
    generada_por: "manual",
    origen: "plantilla",
    preferencias: {
      ...(plantilla.preferencias ?? {}),
      plantillaCodigo: plantilla.codigo,
      plantillaNombre: plantilla.nombre,
    },
    dias_titulos: plantilla.dias_titulos ?? [],
    actualizado_at: new Date().toISOString(),
  };

  const { data: existente } = await supabase
    .from("rutinas")
    .select("id")
    .eq("cliente_id", clienteId)
    .maybeSingle();

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

  const { error: errorBorrado } = await supabase.from("rutina_items").delete().eq("rutina_id", rutinaId);
  if (errorBorrado) return { error: "No se pudieron reemplazar los ejercicios de la rutina." };

  const filas = items
    .map((it) => {
      const ejercicioId = it.ejercicio_slug ? porSlug.get(it.ejercicio_slug) : null;
      if (!ejercicioId) return null;
      return {
        rutina_id: rutinaId,
        ejercicio_id: ejercicioId,
        dia: it.dia,
        orden: it.orden,
        series: it.series,
        repeticiones: it.repeticiones,
        nota: it.nota,
        tecnica: it.tecnica && it.tecnica !== "ninguna" ? it.tecnica : null,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  if (filas.length > 0) {
    const { error } = await supabase.from("rutina_items").insert(filas);
    if (error) return { error: "No se pudieron guardar los ejercicios." };
  }

  return { rutinaId };
}
