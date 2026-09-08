"use server";

import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { revalidatePath } from "next/cache";

export type PedidoPanel = {
  id: string;
  cliente_id: string;
  ejercicio_nombre: string;
  sector: string;
  estado: "pendiente" | "en_camino" | "atendido" | "cancelado";
  creado_at: string;
  cliente?: {
    id: string;
    foto_url?: string | null;
    profile?: {
      nombre: string;
      telefono?: string | null;
    } | null;
  } | null;
};

export async function obtenerPedidosActivos(): Promise<{
  pedidos: PedidoPanel[];
}> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const hace2Horas = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("pedidos_asistencia")
    .select(`
      id,
      cliente_id,
      ejercicio_nombre,
      sector,
      estado,
      creado_at,
      cliente:clientes(
        id,
        foto_url,
        profile:profiles(nombre, telefono)
      )
    `)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .in("estado", ["pendiente", "en_camino"])
    .gte("creado_at", hace2Horas)
    .order("creado_at", { ascending: false });

  if (error) {
    console.error("[asistencia/panel] Error al obtener pedidos:", error);
    return { pedidos: [] };
  }

  return { pedidos: (data as unknown as PedidoPanel[]) ?? [] };
}

export async function marcarEnCamino(pedidoId: string): Promise<{ ok: boolean; error?: string }> {
  const dueno = await requireDueno();
  const admin = createAdminClient();

  const { data: pedido, error } = await admin
    .from("pedidos_asistencia")
    .update({ estado: "en_camino" })
    .eq("id", pedidoId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .select("cliente_id, ejercicio_nombre")
    .single();

  if (error || !pedido) {
    return { ok: false, error: "No se pudo actualizar el estado." };
  }

  // Opcional: Notificar al socio que el profe está yendo
  try {
    const admin = createAdminClient();
    const { data: cli } = await admin
      .from("clientes")
      .select("profile_id")
      .eq("id", pedido.cliente_id)
      .single();

    if (cli?.profile_id) {
      await enviarPush([cli.profile_id], {
        title: "¡El profe va en camino! 🏃‍♂️",
        body: `Se acerca a tu sector para ayudarte con ${pedido.ejercicio_nombre}.`,
        url: "/mi/rutina",
        tag: `asistencia-encamino-${pedidoId}`,
      });
    }
  } catch (err) {
    console.error("[asistencia/panel] Error push al socio:", err);
  }

  revalidatePath("/panel");
  return { ok: true };
}

export async function marcarAtendido(pedidoId: string): Promise<{ ok: boolean; error?: string }> {
  const dueno = await requireDueno();
  // Mutación con service_role: la autorización ya la hace requireDueno() y el
  // scope lo fija el .eq("gimnasio_id"). Se evita que una policy RLS anule el
  // UPDATE en silencio (0 filas afectadas, sin error) y el pedido reaparezca
  // como "pendiente" en obtenerPedidosActivos().
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("pedidos_asistencia")
    .update({
      estado: "atendido",
      atendido_at: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "No se pudo marcar como atendido." };
  }

  revalidatePath("/panel");
  return { ok: true };
}
