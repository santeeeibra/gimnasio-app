import { createAdminClient } from "@/lib/supabase/admin";
import { LIMITE_BYTES, mb, pctUso, umbralCruzado } from "@/lib/monitor-db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: sizeData } = await admin.rpc("db_size_bytes");
  const { data: estado } = await admin
    .from("monitor_db_estado")
    .select("umbral_avisado, actualizado_at")
    .eq("id", 1)
    .single();

  const bytes = sizeData == null ? null : Number(sizeData);
  const pct = bytes == null ? null : pctUso(bytes);
  const umbral = pct == null ? 0 : umbralCruzado(pct);
  const avisado = (estado?.umbral_avisado as number | undefined) ?? 0;

  const tone =
    umbral >= 90 ? "text-danger" : umbral >= 70 ? "text-warn" : "text-ink";

  return (
    <div className="stagger">
      <h1 className="mb-1 text-lg">Uso de la base (Supabase)</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Límite del plan: {(LIMITE_BYTES / 1024 / 1024).toFixed(0)} MB, compartido
        entre todos los gimnasios.
      </p>

      <div className="card-cut card-cut-lg mb-8 border border-rule bg-paper-2 p-6">
        {pct == null ? (
          <p className="text-base text-ink-soft">No se pudo medir el tamaño.</p>
        ) : (
          <>
            <p
              className={`font-display leading-[0.82] tracking-tight text-[clamp(3rem,16vw,5rem)] ${tone}`}
            >
              {pct.toFixed(1)}%
            </p>
            <p className="mt-2 text-base text-ink-soft">
              {mb(bytes!).toFixed(1)} MB de{" "}
              {(LIMITE_BYTES / 1024 / 1024).toFixed(0)} MB
            </p>
          </>
        )}
      </div>

      <dl className="divide-y divide-rule border-y border-rule text-sm">
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Último aviso disparado</dt>
          <dd>{avisado === 0 ? "ninguno" : `${avisado}%`}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Umbral actual</dt>
          <dd>{umbral === 0 ? "bajo 70%" : `${umbral}%`}</dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-ink-soft">Última medición del cron</dt>
          <dd>
            {estado?.actualizado_at
              ? new Date(estado.actualizado_at).toLocaleString("es-AR")
              : "sin correr aún"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
