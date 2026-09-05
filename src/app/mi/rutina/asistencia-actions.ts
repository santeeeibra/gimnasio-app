"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import type { PedidoAsistencia } from "@/lib/rutina/asistencia";

export async function pedirAsistencia({
  ejercicioId,
  ejercicioNombre,
  sector,
}: {
  ejercicioId?: string | null;
  ejercicioNombre: string;
  sector: string;
}): Promise<{ ok: boolean; pedido?: PedidoAsistencia; error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente, error: errCli } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (errCli || !cliente) {
    return { ok: false, error: "No se encontró el registro de cliente." };
  }

  // Rate-limiting / anti-spam: verificar si ya existe un pedido pendiente o en camino en los últimos 3 minutos
  const hace3Min = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data: existente } = await supabase
    .from("pedidos_asistencia")
    .select("id, estado, creado_at")
    .eq("cliente_id", cliente.id)
    .in("estado", ["pendiente", "en_camino"])
    .gte("creado_at", hace3Min)
    .order("creado_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente) {
    return {
      ok: false,
      error: "Ya tenés un pedido de ayuda enviado recientemente. ¡El profe ya está avisado!",
    };
  }

  // Insertar pedido
  const sectorLimpio = sector.trim() || "Sala de musculación";
  const { data: nuevo, error: errInsert } = await supabase
    .from("pedidos_asistencia")
    .insert({
      gimnasio_id: profile.gimnasio_id,
      cliente_id: cliente.id,
      ejercicio_id: ejercicioId ?? null,
      ejercicio_nombre: ejercicioNombre.trim(),
      sector: sectorLimpio,
      estado: "pendiente",
    })
    .select()
    .single();

  if (errInsert || !nuevo) {
    console.error("[asistencia-actions] Error al insertar pedido:", errInsert);
    return { ok: false, error: "No se pudo registrar el pedido. Intentá de nuevo." };
  }

  // Notificar por Web Push a los dueños/profesores del gimnasio
  try {
    const admin = createAdminClient();
    const { data: duenos } = await admin
      .from("profiles")
      .select("id")
      .eq("gimnasio_id", profile.gimnasio_id)
      .eq("rol", "dueno");

    if (duenos && duenos.length > 0) {
      const duenosIds = duenos.map((d: { id: string }) => d.id);
      await enviarPush(duenosIds, {
        title: "🚨 Ayuda en sala",
        body: `${profile.nombre} necesita ayuda con "${ejercicioNombre}" (${sectorLimpio})`,
        url: "/panel",
        tag: `asistencia-${nuevo.id}`,
      });
    }
  } catch (err) {
    console.error("[asistencia-actions] Error al enviar push:", err);
  }

  return { ok: true, pedido: nuevo as PedidoAsistencia };
}

export async function cancelarAsistencia(
  pedidoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pedidos_asistencia")
    .update({ estado: "cancelado" })
    .eq("id", pedidoId)
    .in("estado", ["pendiente", "en_camino"]);

  if (error) {
    return { ok: false, error: "No se pudo cancelar el pedido." };
  }

  return { ok: true };
}

export async function obtenerAsistenciaActiva(): Promise<{
  pedido: PedidoAsistencia | null;
}> {
  try {
    const profile = await requireProfile();
    const supabase = await createClient();

    const { data: cliente } = await supabase
      .from("clientes")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!cliente) return { pedido: null };

    // Consideramos activos los de los últimos 20 minutos
    const hace20Min = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("pedidos_asistencia")
      .select("*")
      .eq("cliente_id", cliente.id)
      .in("estado", ["pendiente", "en_camino"])
      .gte("creado_at", hace20Min)
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { pedido: (data as PedidoAsistencia) ?? null };
  } catch {
    return { pedido: null };
  }
}
