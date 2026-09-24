"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const [{ data: registros }, { data: rutina }] = await Promise.all([
    supabase
      .from("registros_entrada")
      .select("creado_en")
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false })
      .limit(400),
    supabase
      .from("rutinas")
      .select("dias_por_semana")
      .eq("cliente_id", clienteId)
      .maybeSingle(),
  ]);

  const fechas = (registros ?? []).map((r) => String(r.creado_en).slice(0, 10));
  const diasPorSemana = rutina?.dias_por_semana ?? undefined;
  const resultado = calcularRacha(fechas, { diasPorSemana });

  // Idempotente (unique cliente_id+tipo_logro+clave_logro) — se puede llamar
  // en cada carga de /mi sin duplicar el logro en el feed.
  if (resultado.enHito) {
    await registrarLogroEnFeed(
      "racha",
      String(resultado.dias),
      `${resultado.dias} días seguidos entrenando`,
    );
  }

  return resultado;
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

/**
 * Registra el logro en el feed del gimnasio (best-effort — si falla no debe
 * romper el flujo de guardado de progreso/racha que lo dispara).
 * Idempotente vía el unique (cliente_id, tipo_logro, clave_logro).
 */
export async function registrarLogroEnFeed(
  tipoLogro: TipoLogro,
  claveLogro: string,
  titulo: string,
): Promise<void> {
  const res = await resolverCliente();
  if (!res) return;
  const { supabase, clienteId, gimnasioId } = res;
  await supabase.from("logros_gimnasio").upsert(
    {
      gimnasio_id: gimnasioId,
      cliente_id: clienteId,
      tipo_logro: tipoLogro,
      clave_logro: claveLogro,
      titulo,
    },
    { onConflict: "cliente_id,tipo_logro,clave_logro", ignoreDuplicates: true },
  );
}

// ── Feed de logros del gimnasio ─────────────────────────────────────────────

export type LogroFeedItem = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  tipoLogro: TipoLogro;
  claveLogro: string;
  titulo: string;
  creadoEn: string;
  totalReacciones: number;
  miReaccion: boolean;
};

/** Últimos logros del gimnasio del cliente logueado, con conteo de reacciones. */
// El nombre vive en profiles; se devuelve "Nombre I." para no exponer el
// apellido completo de otros socios. Los ids deben venir ya filtrados al
// gimnasio de la sesión.
async function nombresCortos(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data: clientes } = await createAdminClient()
    .from("clientes")
    .select("id, profile:profiles(nombre)")
    .in("id", ids);
  const nombres: Record<string, string> = {};
  for (const c of (clientes ?? []) as any[]) {
    const prof = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    const [nombre, apellido] = String(prof?.nombre ?? "Socio").trim().split(/\s+/);
    nombres[c.id] = apellido ? `${nombre} ${apellido[0]}.` : nombre;
  }
  return nombres;
}

export async function obtenerFeedLogrosGimnasio(
  limite = 20,
): Promise<LogroFeedItem[]> {
  const res = await resolverCliente();
  if (!res) return [];
  const { supabase, clienteId } = res;

  const { data: logros } = await supabase
    .from("logros_gimnasio")
    .select("id, cliente_id, tipo_logro, clave_logro, titulo, creado_en")
    .order("creado_en", { ascending: false })
    .limit(limite);

  if (!logros || logros.length === 0) return [];

  // RLS ya limita los logros al gimnasio de la sesión; los nombres de otros
  // socios viven en profiles, que el socio no puede leer.
  const nombres = await nombresCortos([...new Set(logros.map((l) => l.cliente_id))]);

  const { data: reacciones } = await supabase
    .from("reacciones_logro")
    .select("autor_id, tipo_logro, clave_logro, reactor_id");

  return (logros as Array<{
    id: string;
    cliente_id: string;
    tipo_logro: TipoLogro;
    clave_logro: string;
    titulo: string;
    creado_en: string;
  }>).map((l) => {
    const relacionadas = (reacciones ?? []).filter(
      (r) =>
        r.autor_id === l.cliente_id &&
        r.tipo_logro === l.tipo_logro &&
        r.clave_logro === l.clave_logro,
    );
    return {
      id: l.id,
      clienteId: l.cliente_id,
      clienteNombre: nombres[l.cliente_id] ?? "Un compañero",
      tipoLogro: l.tipo_logro,
      claveLogro: l.clave_logro,
      titulo: l.titulo,
      creadoEn: l.creado_en,
      totalReacciones: relacionadas.length,
      miReaccion: relacionadas.some((r) => r.reactor_id === clienteId),
    };
  });
}

// ── Zero-Bloat Social Loop: Ranking & Desafíos ──────────────────────────────

export type ItemRankingAsistencia = {
  clienteId: string;
  nombre: string;
  asistencias: number;
  posicion: number;
  esUsuarioActual: boolean;
};

export type DesafioMensual = {
  titulo: string;
  metaAsistencias: number;
  misAsistencias: number;
  completado: boolean;
  totalSociosCumplidos: number;
};

export async function obtenerRankingAsistencia(): Promise<{
  ranking: ItemRankingAsistencia[];
  miPosicion: ItemRankingAsistencia | null;
}> {
  const res = await resolverCliente();
  if (!res) return { ranking: [], miPosicion: null };
  const { clienteId, gimnasioId } = res;
  // service_role: la RLS de registros_entrada sólo deja al socio ver sus
  // propias entradas. gimnasioId sale de la sesión (resolverCliente).
  const admin = createAdminClient();

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data } = await admin
    .from("registros_entrada")
    .select("cliente_id")
    .eq("gimnasio_id", gimnasioId)
    .gte("creado_en", inicioMes.toISOString());

  if (!data || data.length === 0) return { ranking: [], miPosicion: null };

  const conteos: Record<string, number> = {};
  for (const reg of data as { cliente_id: string | null }[]) {
    if (!reg.cliente_id) continue;
    conteos[reg.cliente_id] = (conteos[reg.cliente_id] ?? 0) + 1;
  }

  const porConteo = Object.entries(conteos).sort((a, b) => b[1] - a[1]);
  const idxPropio = porConteo.findIndex(([cid]) => cid === clienteId);
  const idsVisibles = [
    ...porConteo.slice(0, 5).map(([cid]) => cid),
    ...(idxPropio >= 5 ? [clienteId] : []),
  ];

  const nombres = await nombresCortos(idsVisibles);

  const ordenados = porConteo.map(([cid, count]) => ({
    clienteId: cid,
    nombre: nombres[cid] ?? "Socio",
    asistencias: count,
  }));

  const ranking = ordenados.slice(0, 5).map((item, index) => ({
    ...item,
    posicion: index + 1,
    esUsuarioActual: item.clienteId === clienteId,
  }));

  let miPosicion: ItemRankingAsistencia | null = null;
  const idxMiUsuario = ordenados.findIndex((item) => item.clienteId === clienteId);
  if (idxMiUsuario >= 0) {
    miPosicion = {
      ...ordenados[idxMiUsuario],
      posicion: idxMiUsuario + 1,
      esUsuarioActual: true,
    };
  }

  return { ranking, miPosicion };
}

export async function obtenerDesafioMensual(): Promise<DesafioMensual | null> {
  const res = await resolverCliente();
  if (!res) return null;
  const { clienteId, gimnasioId } = res;
  // service_role por la RLS de registros_entrada (ver obtenerRankingAsistencia).
  const supabase = createAdminClient();

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
  const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const nombreMes = nombreMeses[hoy.getMonth()];

  const { data } = await supabase
    .from("registros_entrada")
    .select("cliente_id")
    .eq("gimnasio_id", gimnasioId)
    .gte("creado_en", inicioMes);

  const metaAsistencias = 12; // Meta del mes (3 por semana)
  const conteos: Record<string, number> = {};

  if (data) {
    for (const r of data as { cliente_id: string }[]) {
      if (!r.cliente_id) continue;
      conteos[r.cliente_id] = (conteos[r.cliente_id] ?? 0) + 1;
    }
  }

  const misAsistencias = conteos[clienteId] ?? 0;
  const totalSociosCumplidos = Object.values(conteos).filter((c) => c >= metaAsistencias).length;

  return {
    titulo: `Desafío ${nombreMes}: ${metaAsistencias} Clases`,
    metaAsistencias,
    misAsistencias,
    completado: misAsistencias >= metaAsistencias,
    totalSociosCumplidos,
  };
}


