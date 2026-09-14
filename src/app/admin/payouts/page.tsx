import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PayoutsAdminClient, type PayoutPendienteRow } from "./payouts-admin-client";

export const dynamic = "force-dynamic";

// Vista mínima para liquidar retiros de partners. UI/animaciones definitivas
// se hacen en Antigravity — esto es la capa funcional: listar pendientes,
// exportar CSV y marcar como pagado. Reusa marcarPayoutAction de
// /admin/partner/actions.ts (misma lógica: no duplicar el update+timestamp
// +notificación+auditoría en dos lugares).
export default async function AdminPayoutsPage() {
  await requireSuperadmin();
  const db = createAdminClient();

  const [{ data: payoutsRaw }, { data: partnersRaw }] = await Promise.all([
    db
      .from("partner_payouts")
      .select("id, partner_id, monto_ars, destino_snapshot, nota, solicitado_at")
      .eq("estado", "pendiente")
      .order("solicitado_at", { ascending: true }),
    db.from("partners").select("id, nombre, email, referral_code"),
  ]);

  const partnersMap = new Map((partnersRaw ?? []).map((p) => [p.id, p]));

  const payouts: PayoutPendienteRow[] = (payoutsRaw ?? []).map((p) => {
    const partner = partnersMap.get(p.partner_id);
    const destino = p.destino_snapshot as { cbu_cvu: string | null; alias_mp: string | null } | null;
    return {
      id: p.id,
      partnerNombre: partner?.nombre ?? "Partner desconocido",
      partnerEmail: partner?.email ?? null,
      montoArs: Number(p.monto_ars),
      cbuCvu: destino?.cbu_cvu ?? null,
      aliasMp: destino?.alias_mp ?? null,
      nota: p.nota,
      solicitadoAt: p.solicitado_at,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Liquidación de partners</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Retiros pendientes de pago. Transferí por fuera del sistema y marcá acá como pagado.
        </p>
      </div>
      <PayoutsAdminClient payouts={payouts} />
    </div>
  );
}
