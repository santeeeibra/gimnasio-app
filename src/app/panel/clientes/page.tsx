import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaffODueno } from "@/lib/auth";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { NuevoClienteModal } from "./nuevo-cliente-modal";
import { type ClienteVista } from "./cliente-row";
import { ListadoClientes } from "./listado-clientes";
import { CacheAlVuelo } from "@/components/offline/cache-al-vuelo";
import { ConflictosOffline } from "@/components/offline/conflictos";
import { GatingPlanInicialBanner } from "@/components/plataforma/gating-plan-inicial";
import Link from "next/link";
import { pillClasses } from "@/components/ui";
import { Upload } from "lucide-react";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{ eliminado?: string }>;
}) {
  const params = await searchParams;
  const fueEliminado = params?.eliminado === "1";

  const dueno = await requireStaffODueno();
  const supabase = await createClient();
  const adminDb = createAdminClient();
  const [cupo, { data: clientesData }, { data: planesData }, { data: registrosData }] =
    await Promise.all([
      cupoSocios(adminDb, dueno.gimnasio_id),
      supabase
        .from("clientes")
        .select(
          "id, estado_cuota, fecha_vencimiento, plan_id, foto_url, en_prueba, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
        )
        .order("fecha_vencimiento", { ascending: true, nullsFirst: true })
        .then(async (res) => {
          if (res.error) {
            return await supabase
              .from("clientes")
              .select(
                "id, estado_cuota, fecha_vencimiento, plan_id, en_prueba, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
              )
              .order("fecha_vencimiento", { ascending: true, nullsFirst: true });
          }
          return res;
        }),
      supabase
        .from("planes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("registros_entrada").select("cliente_id"),
    ]);

  const clientes = (clientesData ?? []) as unknown as ClienteVista[];
  const planes = (planesData ?? []) as { id: string; nombre: string }[];
  const conIngreso = new Set(
    ((registrosData ?? []) as { cliente_id: string }[]).map((r) => r.cliente_id),
  );

  return (
    <div className="stagger space-y-8 max-w-6xl lg:max-w-7xl mx-auto">
      {fueEliminado && (
        <div className="p-4 rounded-[14px] bg-ok/15 border border-ok/30 text-ok text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <span>✅ Cliente eliminado definitivamente.</span>
        </div>
      )}
      <CacheAlVuelo
        clave="clientes:lista"
        data={clientes.map((c) => ({
          nombre: c.profile?.nombre ?? "Socio",
          dni: c.profile?.dni ?? null,
          estado_cuota: c.estado_cuota,
          fecha_vencimiento: c.fecha_vencimiento,
          plan: c.plan?.nombre ?? null,
        }))}
      />
      <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <h1 className="text-2xl mb-1 font-bold">Clientes</h1>
          <p className="text-sm text-ink-soft">{clientes.length} en total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel/clientes/importar-socios"
            className={pillClasses.neutra}
          >
            <Upload aria-hidden strokeWidth={2} className="size-3.5 shrink-0" />
            Importar socios
          </Link>
          <NuevoClienteModal
            planes={planes}
            cupo={cupo}
            gimnasioId={dueno.gimnasio_id}
          />
        </div>
      </div>

      <GatingPlanInicialBanner
        usados={cupo.usados}
        max={cupo.max ?? 40}
        esGratuito={cupo.esGratuito}
      />

      <ConflictosOffline variante="card" />

      <ListadoClientes
        clientes={clientes}
        idsConIngreso={[...conIngreso]}
      />
    </div>
  );
}
