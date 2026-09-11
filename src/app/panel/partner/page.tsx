import { redirect } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { obtenerODescargarPartnerAction } from "./actions";
import { PartnerDashboardClient } from "./partner-client";

export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  await requireDueno();

  const data = await obtenerODescargarPartnerAction();

  if (!data.ok || !data.resumen) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-3">
        <h2 className="text-xl font-bold text-ink">SysGym Partner</h2>
        <p className="text-sm text-danger">{data.error ?? "No se pudo cargar el programa de partners."}</p>
      </div>
    );
  }

  return (
    <PartnerDashboardClient
      resumen={data.resumen}
      comisiones={data.comisiones ?? []}
      payouts={data.payouts ?? []}
    />
  );
}
