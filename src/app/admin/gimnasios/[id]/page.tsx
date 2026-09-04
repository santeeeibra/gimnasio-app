import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { entrarComoAction } from "../../impersonar-actions";
import { Button, linkClasses } from "@/components/ui";
import { cupoExcedido, cupoTexto } from "@/lib/plataforma/planes";
import { EstadoForm } from "./estado-form";
import { PlanPlataformaForm } from "./plan-plataforma-form";
import { PagosPlataforma, type PagoPlataformaRow } from "./pagos-plataforma";
import { DisparadoresSocio } from "./disparadores-socio";

export const dynamic = "force-dynamic";

export default async function AdminGimnasioDetalle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const { data: gym } = await db
    .from("gimnasios")
    .select(
      "id, nombre, slug, estado, dias_aviso_morosidad, creado_at, plan_plataforma_vence_el, plan:planes_plataforma(id, nombre, max_socios, precio_mensual)",
    )
    .eq("id", id)
    .single();

  if (!gym) notFound();

  const [
    { data: clientes },
    { data: pagos },
    { data: dueno },
    { data: planesData },
    { data: pagosPlataformaData },
  ] = await Promise.all([
    db
      .from("clientes")
      .select(
        "id, estado_cuota, fecha_vencimiento, en_prueba, profile:profiles(id, nombre, dni)",
      )
      .eq("gimnasio_id", id)
      .order("fecha_vencimiento", { ascending: true, nullsFirst: true }),
    db
      .from("pagos")
      .select("id, monto, fecha_pago, cliente:clientes!inner(gimnasio_id)")
      .eq("cliente.gimnasio_id", id)
      .order("fecha_pago", { ascending: false })
      .limit(10),
    db
      .from("profiles")
      .select("id, nombre")
      .eq("gimnasio_id", id)
      .eq("rol", "dueno")
      .limit(1)
      .maybeSingle(),
    db
      .from("planes_plataforma")
      .select("id, nombre, max_socios")
      .eq("activo", true)
      .order("orden", { ascending: true }),
    db
      .from("pagos_plataforma")
      .select(
        "id, tipo, monto_ars, monto_original_ars, descuento_pct, dias, estado, proveedor, nota, creado_at, plan:planes_plataforma(nombre)",
      )
      .eq("gimnasio_id", id)
      .order("creado_at", { ascending: false })
      .limit(8),
  ]);

  await registrarAccionAdmin(admin.id, "ver_gym", id, {
    slug: gym.slug,
    socios: clientes?.length ?? 0,
  });

  const socios = (clientes ?? []) as unknown as {
    id: string;
    estado_cuota: string | null;
    fecha_vencimiento: string | null;
    en_prueba: boolean | null;
    profile: { id: string; nombre: string | null; dni: string | null } | null;
  }[];

  const duenoInfo = dueno as { id: string; nombre: string | null } | null;

  const planP = (gym.plan ?? null) as unknown as {
    id: string;
    nombre: string;
    max_socios: number | null;
    precio_mensual: number;
  } | null;
  const socioCount = (clientes ?? []).length;
  const planesOpciones = (planesData ?? []) as {
    id: string;
    nombre: string;
    max_socios: number | null;
  }[];
  const pagosPlataforma = ((pagosPlataformaData ?? []) as Record<
    string,
    unknown
  >[]).map((p) => {
    const planRel = p.plan as { nombre: string } | null;
    return {
      id: p.id as string,
      tipo: (p.tipo ?? "plan_mensual") as PagoPlataformaRow["tipo"],
      monto_ars: Number(p.monto_ars ?? 0),
      monto_original_ars:
        p.monto_original_ars == null ? null : Number(p.monto_original_ars),
      descuento_pct: Number(p.descuento_pct ?? 0),
      dias: Number(p.dias ?? 0),
      estado: p.estado as string,
      proveedor: p.proveedor as string,
      nota: (p.nota ?? null) as string | null,
      creado_at: p.creado_at as string,
      plan_nombre: planRel?.nombre ?? null,
    };
  }) satisfies PagoPlataformaRow[];

  const ultimosPagos = (pagos ?? []) as unknown as {
    id: string;
    monto: number | null;
    fecha_pago: string | null;
  }[];

  return (
    <div className="stagger">
      <Link
        href="/admin/gimnasios"
        className={`text-sm ${linkClasses.inline}`}
      >
        ← Gimnasios
      </Link>

      <h1 className="mt-4 mb-1 text-lg">{gym.nombre ?? "(sin nombre)"}</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {gym.slug ?? "—"} · estado {gym.estado ?? "—"} · aviso morosidad{" "}
        {gym.dias_aviso_morosidad ?? "—"} días
      </p>

      <div className="card-cut mb-8 border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-ink-soft">
          Plan de plataforma
        </h2>
        <p className="text-sm">
          {planP?.nombre ?? "Sin plan asignado"}
          {" · "}
          {cupoTexto(socioCount, planP?.max_socios ?? null)}
        </p>
        {gym.plan_plataforma_vence_el ? (
          <p className="mt-1 text-xs text-ink-soft">
            vence{" "}
            {new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")}
          </p>
        ) : null}
        {cupoExcedido(socioCount, planP?.max_socios ?? null) ? (
          <p className="mt-2 text-xs text-danger">Cupo alcanzado o superado.</p>
        ) : null}
        <PlanPlataformaForm
          gimnasioId={gym.id}
          planes={planesOpciones}
          planActualId={planP?.id ?? null}
          venceElActual={gym.plan_plataforma_vence_el ?? null}
        />
      </div>

      <div className="card-cut mb-8 border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-ink-soft">
          Pagos de plataforma
        </h2>
        <p className="mb-3 text-xs text-ink-soft">
          Confirmar un pago pendiente renueva el vencimiento del plan y deja el
          gimnasio en <code>activo</code>.
        </p>
        <PagosPlataforma pagos={pagosPlataforma} />
      </div>

      <div className="card-cut mb-8 border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-ink-soft">
          Estado del gimnasio
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          <code>solo_lectura</code> bloquea toda escritura del dueño y los socios
          (para probar el modo trial vencido).
        </p>
        <EstadoForm gimnasioId={gym.id} estadoActual={gym.estado} />
      </div>

      <div className="card-cut mb-8 border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-ink-soft">
          Entrar al gimnasio
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Abre una sesión real como esa persona para probar los flujos
          end-to-end. El banner de arriba te devuelve a soporte.
        </p>
        {duenoInfo ? (
          <form action={entrarComoAction}>
            <input type="hidden" name="profile_id" value={duenoInfo.id} />
            <Button type="submit">
              Entrar como {duenoInfo.nombre ?? "el dueño"} (dueño)
            </Button>
          </form>
        ) : (
          <p className="text-xs text-ink-soft">Sin dueño cargado.</p>
        )}
      </div>

      <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-ink-soft">
        Socios ({socios.length})
      </h2>
      {socios.length === 0 ? (
        <p className="mb-8 text-sm text-ink-soft">Sin socios.</p>
      ) : (
        <ul className="card-cut mb-8 border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {socios.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="min-w-0">
                <span className="block truncate">
                  {s.profile?.nombre ?? "(sin nombre)"}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  DNI {s.profile?.dni ?? "—"}
                </span>
              </span>
              <span className="shrink-0 text-right text-xs text-ink-soft">
                {s.en_prueba ? "prueba" : (s.estado_cuota ?? "—")}
                <br />
                {s.fecha_vencimiento
                  ? new Date(s.fecha_vencimiento).toLocaleDateString("es-AR")
                  : "—"}
              </span>
              <form action={entrarComoAction} className="shrink-0">
                <input
                  type="hidden"
                  name="profile_id"
                  value={s.profile?.id ?? ""}
                />
                <button
                  type="submit"
                  disabled={!s.profile?.id}
                  className={`text-xs disabled:opacity-40 ${linkClasses.inline}`}
                >
                  ver como
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="card-cut mb-8 border border-rule bg-paper-2 p-5">
        <h2 className="mb-1 text-sm uppercase tracking-[0.14em] text-ink-soft">
          Forzar estado de un socio (pruebas)
        </h2>
        <p className="mb-3 text-xs text-ink-soft">
          Setea fechas / flags de un socio para probar los avisos sin esperar.
          Los push salen en la próxima corrida del cron diario.
        </p>
        <DisparadoresSocio
          socios={socios.map((s) => ({
            id: s.id,
            nombre: s.profile?.nombre ?? `DNI ${s.profile?.dni ?? "—"}`,
          }))}
        />
      </div>

      <h2 className="mb-3 text-sm uppercase tracking-[0.14em] text-ink-soft">
        Últimos pagos
      </h2>
      {ultimosPagos.length === 0 ? (
        <p className="text-sm text-ink-soft">Sin pagos registrados.</p>
      ) : (
        <ul className="card-cut border border-rule divide-y divide-rule bg-paper-2 overflow-hidden">
          {ultimosPagos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="text-ink-soft">
                {p.fecha_pago
                  ? new Date(p.fecha_pago).toLocaleDateString("es-AR")
                  : "—"}
              </span>
              <span>
                {p.monto == null
                  ? "—"
                  : p.monto.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
