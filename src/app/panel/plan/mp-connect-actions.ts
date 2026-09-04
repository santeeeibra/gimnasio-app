"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { desvincular } from "@/lib/pagos/mercadopago-connect";

// Vincular es un redirect a Mercado Pago => va por GET /api/mp-connect/iniciar.
// Acá sólo queda desvincular.

export async function desvincularMercadoPago(): Promise<{ ok?: string; error?: string }> {
  const dueno = await requireDueno();
  try {
    await desvincular(createAdminClient(), dueno.gimnasio_id);
  } catch (err) {
    console.error("[mp-connect] desvincular:", err);
    return { error: "No se pudo desvincular la cuenta." };
  }
  revalidatePath("/panel/plan");
  return { ok: "Cuenta de Mercado Pago desvinculada." };
}
