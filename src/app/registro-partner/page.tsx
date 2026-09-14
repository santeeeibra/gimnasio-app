import { createAdminClient } from "@/lib/supabase/admin";
import type { PartnerTier } from "@/types/partner";
import { RegistroPartnerClient } from "./registro-partner-client";

export const dynamic = "force-dynamic";

export default async function RegistroPartnerPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_tiers")
    .select("id, name, min_active_gyms, commission_pct, milestone_bonus_amount")
    .order("min_active_gyms", { ascending: true });
  const tiers = (data ?? []) as PartnerTier[];

  // Mismo criterio que /panel/partner y /partners: sin partner_tiers no
  // mostramos % ni montos inventados en la página de signup.
  if (tiers.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">SysGym Partner</h1>
          <p className="text-sm text-zinc-400">
            No pudimos cargar la información del programa en este momento. Probá recargar la página en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  return <RegistroPartnerClient tiers={tiers} />;
}
