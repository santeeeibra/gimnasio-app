"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type InfoReferidor = {
  nombre: string;
  referralCode: string;
} | null;

export async function obtenerInfoPartnerReferidor(refCode: string): Promise<InfoReferidor> {
  if (!refCode || refCode.trim().length < 3) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("partners")
      .select("nombre, referral_code")
      .eq("referral_code", refCode.trim().toUpperCase())
      .eq("estado", "activo")
      .maybeSingle();

    if (!data) return null;
    return {
      nombre: data.nombre,
      referralCode: data.referral_code,
    };
  } catch {
    return null;
  }
}
