"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { desvincular } from "@/lib/pagos/mercadopago-connect";

export async function desconectarMercadoPago(): Promise<{ ok?: string; error?: string }> {
  const dueno = await requireDueno();
  try {
    await desvincular(createAdminClient(), dueno.gimnasio_id);
  } catch (err) {
    console.error("[mp-ajustes] desconectar:", err);
    return { error: "No se pudo desconectar la cuenta." };
  }
  revalidatePath("/panel/ajustes");
  revalidatePath("/panel/plan");
  return { ok: "Cuenta de Mercado Pago desconectada." };
}
