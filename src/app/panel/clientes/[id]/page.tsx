import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { Panel } from "@/components/ui";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import {
  NIVEL_LABEL,
  OBJETIVO_LABEL,
  type Enfasis,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

type Prefs = {
  equipo?: PreferenciaEquipo;
  sexo?: Sexo;
  enfasis?: Enfasis[];
} | null;
import { PagoForm } from "./pago-form";
import { RutinaPanelDueno } from "./rutina-panel";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireDueno();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, estado_cuota, fecha_inicio, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  const [{ data: planesData }, { data: pagosData }, { data: rutinaData }] =
    await Promise.all([
      supabase
        .from("planes")
        .select("id, nombre, precio")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("pagos")
        .select("id, monto, fecha_pago, cubre_hasta, plan:planes(nombre)")
        .eq("cliente_id", id)
        .order("fecha_pago", { ascending: false }),
      supabase
        .from("rutinas")
        .select(
          "id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias, actualizado_at, rutina_items(dia, ejercicio:ejercicios(nombre))",
        )
        .eq("cliente_id", id)
        .maybeSingle(),
    ]);

  const c = cliente as any;
  const dias = diasRestantes(c.fecha_vencimiento);
  const estado = estadoDesdeDias(dias);
  const planes = (planesData ?? []) as {
    id: string;
    nombre: string;
    precio: number;
  }[];
  const pagos = (pagosData ?? []) as any[];
  const rutina = rutinaData as any;
  const rutinaPorDia = new Map<number, string[]>();
  for (const it of (rutina?.rutina_items ?? []) as any[]) {
    const arr = rutinaPorDia.get(it.dia) ?? [];
    if (it.ejercicio?.nombre) arr.push(it.ejercicio.nombre);
    rutinaPorDia.set(it.dia, arr);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/panel/clientes"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          ← Clientes
        </Link>
        <h1 className="text-3xl mt-2">{c.profile?.nombre}</h1>
        <p className="text-sm text-ink-soft">
          DNI {c.profile?.dni}
          {c.profile?.telefono ? ` · ${c.profile.telefono}` : ""}
        </p>
      </div>

      <Panel className="p-5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <p className="text-xs text-ink-soft">Estado</p>
            <p
              className={`text-lg font-display ${
                estado === "vencido"
                  ? "text-danger"
                  : estado === "por_vencer"
                    ? "text-warn"
                    : "text-ok"
              }`}
            >
              {ESTADO_LABEL[estado]}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Plan</p>
            <p className="text-lg">{c.plan?.nombre ?? "sin plan"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Vence</p>
            <p className="text-lg">
              {c.fecha_vencimiento ?? "—"}
              {dias !== null ? (
                <span className="text-sm text-ink-soft">
                  {" "}
                  ({dias < 0 ? `hace ${Math.abs(dias)} d` : `en ${dias} d`})
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg">Rutina</h2>
          {rutina ? (
            <span className="text-xs text-ink-soft">
              {OBJETIVO_LABEL[rutina.objetivo as Objetivo] ?? rutina.objetivo}
              {rutina.nivel
                ? ` · ${NIVEL_LABEL[rutina.nivel as Nivel] ?? rutina.nivel}`
                : ""}
              {rutina.dias_por_semana ? ` · ${rutina.dias_por_semana} días` : ""}
            </span>
          ) : null}
        </div>

        {rutina ? (
          <ul className="mt-3 mb-4 space-y-2 text-sm">
            {[...rutinaPorDia.keys()]
              .sort((a, b) => a - b)
              .map((d) => (
                <li key={d}>
                  <span className="font-medium">
                    {(rutina.dias_titulos as string[] | null)?.[d - 1] ??
                      `Día ${d}`}
                  </span>
                  <span className="text-ink-soft">
                    {" — "}
                    {(rutinaPorDia.get(d) ?? []).join(", ")}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 mb-4 text-sm text-ink-soft">
            Sin rutina todavía. El cliente también puede generarla desde su panel.
          </p>
        )}

        <RutinaPanelDueno
          clienteId={c.id}
          tieneRutina={!!rutina}
          defaults={
            rutina
              ? {
                  objetivo: rutina.objetivo as Objetivo,
                  nivel: (rutina.nivel as Nivel) ?? undefined,
                  dias: rutina.dias_por_semana ?? undefined,
                  preferencia: (rutina.preferencias as Prefs)?.equipo ?? undefined,
                  sexo: (rutina.preferencias as Prefs)?.sexo ?? undefined,
                  enfasis: (rutina.preferencias as Prefs)?.enfasis ?? undefined,
                }
              : undefined
          }
        />
      </Panel>

      <Panel className="p-5">
        <h2 className="text-lg mb-4">Registrar un pago</h2>
        <PagoForm
          clienteId={c.id}
          planes={planes}
          planActual={c.plan_id}
        />
      </Panel>

      <div>
        <h2 className="text-lg mb-3">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="text-sm text-ink-soft">Sin pagos registrados.</p>
        ) : (
          <ul className="border border-rule rounded-[6px] divide-y divide-rule text-sm">
            {pagos.map((p) => (
              <li
                key={p.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span>
                  {p.fecha_pago} · {p.plan?.nombre ?? "—"}
                </span>
                <span className="text-ink-soft">
                  ${p.monto} · cubre hasta {p.cubre_hasta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
