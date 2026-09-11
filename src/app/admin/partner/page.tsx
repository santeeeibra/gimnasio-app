import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PartnerAdminClient,
  type PartnerAdminItem,
  type GymSimuladoItem,
} from "./partner-admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPartnerPage() {
  await requireSuperadmin();
  const db = createAdminClient();

  // 1. Obtener todos los partners registrados
  const { data: partnersRaw } = await db
    .from("partners")
    .select("id, nombre, email, referral_code, estado, cbu_cvu, alias_mp, creado_at")
    .order("creado_at", { ascending: false });

  const listaPartners = partnersRaw ?? [];

  // Para cada partner, obtener balance actual, conteo de gimnasios y último retiro
  const partners: PartnerAdminItem[] = await Promise.all(
    listaPartners.map(async (p) => {
      const [
        { data: balance },
        { count: referidosCount },
        { data: ultimoPayout },
      ] = await Promise.all([
        db.rpc("partner_balance", { p_partner_id: p.id }),
        db
          .from("gimnasios")
          .select("id", { count: "exact", head: true })
          .eq("referred_by_partner_id", p.id),
        db
          .from("partner_payouts")
          .select("monto_ars, estado, solicitado_at")
          .eq("partner_id", p.id)
          .order("solicitado_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        id: p.id,
        nombre: p.nombre,
        email: p.email,
        referral_code: p.referral_code,
        estado: p.estado,
        cbu_cvu: p.cbu_cvu,
        alias_mp: p.alias_mp,
        creado_at: p.creado_at,
        gimnasiosReferidosCount: referidosCount ?? 0,
        balance: Number(balance ?? 0),
        ultimoPayout: ultimoPayout
          ? {
              monto_ars: Number(ultimoPayout.monto_ars),
              estado: ultimoPayout.estado,
              solicitado_at: ultimoPayout.solicitado_at,
            }
          : null,
      };
    })
  );

  // Mapa rápido de partnerId -> nombre / código
  const partnersMap = new Map(
    partners.map((p) => [p.id, { nombre: p.nombre, codigo: p.referral_code }])
  );

  // 2. Obtener gimnasios de simulación activos (SIM_ o DEMO_)
  const { data: gymsSimuladosRaw } = await db
    .from("gimnasios")
    .select("id, nombre, slug, estado, creado_at, referred_by_partner_id")
    .or("nombre.ilike.SIM_%,nombre.ilike.DEMO_%,slug.ilike.sim-%,slug.ilike.demo-%")
    .order("creado_at", { ascending: false });

  const listaGymsSimulados = gymsSimuladosRaw ?? [];

  const gimnasiosSimulados: GymSimuladoItem[] = await Promise.all(
    listaGymsSimulados.map(async (g) => {
      const [{ count: pagosCount }, { count: clientesCount }] = await Promise.all([
        db
          .from("pagos_plataforma")
          .select("id", { count: "exact", head: true })
          .eq("gimnasio_id", g.id),
        db
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("gimnasio_id", g.id),
      ]);

      const pInfo = g.referred_by_partner_id
        ? partnersMap.get(g.referred_by_partner_id)
        : null;

      return {
        id: g.id,
        nombre: g.nombre,
        slug: g.slug,
        estado: g.estado,
        creado_at: g.creado_at,
        referred_by_partner_id: g.referred_by_partner_id,
        partnerNombre: pInfo?.nombre ?? null,
        partnerCodigo: pInfo?.codigo ?? null,
        pagosCount: pagosCount ?? 0,
        clientesCount: clientesCount ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="rounded-full bg-volt/20 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-volt-ink border border-volt/30">
            Dev & Superadmin
          </span>
          <span className="text-xs text-ink-soft">SysGym Partner Platform</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Programa Partner & Consola de Simulación
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-soft max-w-3xl leading-relaxed">
          Supervisá el estado de los embajadores registrados, compartí enlaces de referidos, simulá registros y cobros para testear el circuito de comisiones y limpiá los datos de prueba de forma explícita.
        </p>
      </div>

      <PartnerAdminClient
        partners={partners}
        gimnasiosSimulados={gimnasiosSimulados}
      />
    </div>
  );
}
