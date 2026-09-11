import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { semaforo } from "@/lib/admin/errores";
import { linkClasses } from "@/components/ui";
import { ActivarGimnasioForm } from "./activar-form";
import { ListaGimnasios, type FilaGym } from "./lista-gimnasios";

export const dynamic = "force-dynamic";

type Gym = {
  id: string;
  nombre: string | null;
  slug: string | null;
  estado: string | null;
  creado_at: string | null;
  plan_plataforma_vence_el: string | null;
  tipo_cuenta: string | null;
};

export default async function AdminGimnasiosPage() {
  const admin = await requireSuperadmin();
  const db = createAdminClient();

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: gyms },
    { data: clientes },
    { data: errores24h },
    { data: duenos },
  ] = await Promise.all([
    db
      .from("gimnasios")
      .select(
        "id, nombre, slug, estado, creado_at, plan_plataforma_vence_el, tipo_cuenta",
      )
      .order("creado_at", { ascending: true }),
    db.from("clientes").select("gimnasio_id, estado_cuota, en_prueba"),
    db.from("errores_app").select("gimnasio_id").gte("creado_en", hace24h),
    db
      .from("profiles")
      .select("id, nombre, gimnasio_id")
      .eq("rol", "dueno"),
  ]);

  // Columna de 0039: aparte y tolerante para no tumbar la lista si la
  // migración todavía no corrió.
  const conNota = new Set<string>();
  {
    const { data: notas } = await db
      .from("gimnasios")
      .select("id, nota_interna");
    for (const n of (notas ?? []) as {
      id: string;
      nota_interna: string | null;
    }[]) {
      if (n.nota_interna && n.nota_interna.trim()) conNota.add(n.id);
    }
  }

  const duenoPorGym = new Map<string, { id: string; nombre: string | null }>();
  for (const d of (duenos ?? []) as {
    id: string;
    nombre: string | null;
    gimnasio_id: string;
  }[]) {
    if (!duenoPorGym.has(d.gimnasio_id)) {
      duenoPorGym.set(d.gimnasio_id, { id: d.id, nombre: d.nombre });
    }
  }

  await registrarAccionAdmin(admin.id, "listar_gyms", null, {
    total: gyms?.length ?? 0,
  });

  // Errores por gimnasio en las últimas 24 h (para el semáforo).
  const erroresPorGym = new Map<string, number>();
  let erroresSinGym = 0;
  for (const e of (errores24h ?? []) as { gimnasio_id: string | null }[]) {
    if (!e.gimnasio_id) {
      erroresSinGym += 1;
      continue;
    }
    erroresPorGym.set(
      e.gimnasio_id,
      (erroresPorGym.get(e.gimnasio_id) ?? 0) + 1,
    );
  }

  const porGym = new Map<string, { total: number; vencidos: number }>();
  for (const c of (clientes ?? []) as {
    gimnasio_id: string;
    estado_cuota: string | null;
  }[]) {
    const g = porGym.get(c.gimnasio_id) ?? { total: 0, vencidos: 0 };
    g.total += 1;
    if (c.estado_cuota === "vencida") g.vencidos += 1;
    porGym.set(c.gimnasio_id, g);
  }

  const todos = (gyms ?? []) as Gym[];
  // Cuentas individuales (Google Sign-In, ver auth/callback/route.ts): son
  // gimnasios "de un solo socio" con tipo_cuenta = 'individual' y nombre =
  // el nombre real de la persona. No son gimnasios reales para el negocio:
  // se muestran aparte, colapsadas, para no ensuciar la lista principal.
  const lista = todos.filter((g) => (g.tipo_cuenta ?? "gym") === "gym");
  const individuales = todos.filter((g) => g.tipo_cuenta === "individual");

  const filas: FilaGym[] = lista.map((g) => {
    const stats = porGym.get(g.id) ?? { total: 0, vencidos: 0 };
    const nErrores = erroresPorGym.get(g.id) ?? 0;
    const dueno = duenoPorGym.get(g.id) ?? null;
    return {
      id: g.id,
      nombre: g.nombre ?? "",
      slug: g.slug ?? "",
      estado: g.estado ?? "",
      nivel: semaforo(nErrores),
      nErrores,
      socios: stats.total,
      vencidos: stats.vencidos,
      venceEl: g.plan_plataforma_vence_el,
      duenoId: dueno?.id ?? null,
      duenoNombre: dueno?.nombre ?? null,
      tieneNota: conNota.has(g.id),
    };
  });

  const filasIndividuales: FilaGym[] = individuales.map((g) => {
    const stats = porGym.get(g.id) ?? { total: 0, vencidos: 0 };
    const nErrores = erroresPorGym.get(g.id) ?? 0;
    const dueno = duenoPorGym.get(g.id) ?? null;
    return {
      id: g.id,
      nombre: g.nombre ?? "",
      slug: g.slug ?? "",
      estado: g.estado ?? "",
      nivel: semaforo(nErrores),
      nErrores,
      socios: stats.total,
      vencidos: stats.vencidos,
      venceEl: g.plan_plataforma_vence_el,
      duenoId: dueno?.id ?? null,
      duenoNombre: dueno?.nombre ?? null,
      tieneNota: conNota.has(g.id),
    };
  });

  return (
    <div className="stagger">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h1 className="text-lg font-bold text-ink">Gimnasios</h1>
        <Link
          href="/admin/gimnasios/nuevo"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-ink text-paper text-xs font-semibold hover:brightness-125 transition-all shadow-sm active:scale-95"
        >
          + Nuevo Gimnasio
        </Link>
      </div>
      <p className="mb-4 text-sm text-ink-soft">
        {lista.length} en total
        {individuales.length > 0
          ? ` (+ ${individuales.length} cuenta${individuales.length === 1 ? "" : "s"} individual${individuales.length === 1 ? "" : "es"} de Google, abajo)`
          : ""}
        . Vista de soporte, solo lectura. La bolita marca
        errores de las últimas 24 h:{" "}
        <span className="inline-block size-2 translate-y-px rounded-full bg-ok" />{" "}
        ninguno ·{" "}
        <span className="inline-block size-2 translate-y-px rounded-full bg-warn" />{" "}
        1–2 ·{" "}
        <span className="inline-block size-2 translate-y-px rounded-full bg-danger" />{" "}
        3 o más.
      </p>
      <p className="mb-8 text-sm">
        <Link
          href="/admin/errores"
          className={linkClasses.inline}
        >
          Ver detalle de errores
        </Link>
        {erroresSinGym > 0 ? (
          <span className="text-ink-soft">
            {" "}
            · {erroresSinGym} error{erroresSinGym === 1 ? "" : "es"} sin gimnasio
            asignado
          </span>
        ) : null}
      </p>

      {lista.some((g) => g.slug?.startsWith("disp")) ? (
        <div className="mb-8">
          <h2 className="mb-1 text-sm font-semibold text-ink">
            Gimnasios disponibles para activar
          </h2>
          <p className="mb-3 text-xs text-ink-soft">
            Precargados para dar de alta en el momento (ver{" "}
            <code className="rounded bg-paper px-1 py-0.5">scripts/seed.mjs</code>
            ). Tocá &quot;Activar&quot; y cargá los datos reales del dueño que firmó.
          </p>
          <ul className="card-cut divide-y divide-rule border border-rule bg-paper-2 overflow-hidden">
            {lista
              .filter((g) => g.slug?.startsWith("disp"))
              .map((g) => (
                <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <span className="min-w-0">
                    <span className="block truncate text-base">{g.nombre}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      slug: {g.slug}
                    </span>
                  </span>
                  <ActivarGimnasioForm gimnasioId={g.id} slugActual={g.slug ?? ""} />
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      <ListaGimnasios filas={filas} />

      {filasIndividuales.length > 0 ? (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft hover:text-ink">
            Cuentas individuales de Google ({filasIndividuales.length})
          </summary>
          <p className="mb-3 mt-2 text-xs text-ink-soft">
            Atletas que entraron con &quot;Ingresar con Google&quot; sin
            pertenecer a un gimnasio: cada una es un gimnasio de un solo
            socio (<code className="rounded bg-paper px-1 py-0.5">tipo_cuenta = &quot;individual&quot;</code>
            ), separadas acá para no mezclarlas con los gimnasios reales.
          </p>
          <ListaGimnasios filas={filasIndividuales} />
        </details>
      ) : null}
    </div>
  );
}
