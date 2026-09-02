import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireDueno } from "@/lib/auth";
import { diasRestantes } from "@/lib/cuota";
import { ClienteRow, type ClienteVista } from "./clientes/cliente-row";

export default async function ResumenPage() {
  await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("estado")
    .eq("id", (await supabase.from("profiles").select("gimnasio_id").eq("id", (await supabase.auth.getUser()).data.user!.id).single()).data!.gimnasio_id)
    .single();

  const estadoGimnasio = gym?.estado ?? "prueba";
  const soloLectura = estadoGimnasio === "solo_lectura";

  const { data } = await supabase
    .from("clientes")
    .select(
      "id, estado_cuota, fecha_vencimiento, plan_id, profile:profiles(nombre, dni, telefono), plan:planes(nombre)",
    )
    .order("fecha_vencimiento", { ascending: true, nullsFirst: true });

  const clientes = (data ?? []) as unknown as ClienteVista[];
  const total = clientes.length;
  const alDia = clientes.filter((c) => c.estado_cuota === "al_dia").length;
  const porVencer = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d !== null && d >= 0 && d <= 6;
  });
  const vencidos = clientes.filter((c) => {
    const d = diasRestantes(c.fecha_vencimiento);
    return d === null || d < 0;
  });

  // El número que importa: primero lo urgente, si no hay, la calma.
  const hero =
    vencidos.length > 0
      ? {
          n: vencidos.length,
          l: vencidos.length === 1 ? "cuota vencida" : "cuotas vencidas",
          tone: "text-danger",
        }
      : porVencer.length > 0
        ? {
            n: porVencer.length,
            l:
              porVencer.length === 1
                ? "cuota vence esta semana"
                : "cuotas vencen esta semana",
            tone: "text-warn",
          }
        : {
            n: alDia,
            l: alDia === 1 ? "cliente al día" : "clientes al día",
            tone: "text-ink",
          };

  const atencion = [...vencidos, ...porVencer];

  return (
    <div className="stagger">
      {soloLectura && (
        <div className="mb-6 rounded-lg border-2 border-danger bg-danger/10 p-4">
          <h2 className="mb-2 text-lg font-semibold text-danger">
            Período de prueba finalizado
          </h2>
          <p className="mb-3 text-sm text-ink">
            Tu gimnasio está en modo solo lectura. Activá un plan para seguir usando todas las funciones de la app.
          </p>
          <a
            href="mailto:soporte@tudominio.com?subject=Activar plan para mi gimnasio"
            className="inline-block rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Activar plan
          </a>
        </div>
      )}

      <div className="mb-8 flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">
          Resumen
        </span>
        <Link
          href="/panel/clientes"
          className="text-sm underline underline-offset-2 decoration-rule hover:decoration-ink"
        >
          Ver todos
        </Link>
      </div>

      <div className="futurista-fondo mb-10 card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <p
          key={hero.n}
          className={`futurista-num-in font-display leading-[0.82] tracking-tight text-[clamp(4rem,22vw,7rem)] ${hero.tone}`}
        >
          {hero.n}
        </p>
        <p className="mt-2 text-base text-ink-soft">{hero.l}</p>
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span>
            <span className="font-medium text-ink">{total}</span> en total
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{alDia}</span> al día
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{porVencer.length}</span> por
            vencer
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-ink">{vencidos.length}</span>{" "}
            {vencidos.length === 1 ? "vencida" : "vencidas"}
          </span>
        </p>
      </div>

      <Link
        href="/checkin"
        className="mb-10 flex items-center justify-between gap-3 rounded-[6px] border border-rule bg-paper-2 px-4 py-3.5 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:scale-[0.99] md:hidden"
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">Modo check-in</span>
          <span className="mt-0.5 block text-xs text-ink-soft">
            Pantalla de ingreso por DNI para el mostrador
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-ink-soft">
          →
        </span>
      </Link>

      <section>
        <h2 className="mb-3 text-lg">Atención esta semana</h2>
        {atencion.length === 0 ? (
          <div className="card-cut border border-rule bg-paper-2 px-5 py-9 text-center">
            <span
              aria-hidden
              className="mx-auto mb-3 block size-2 rounded-full bg-volt"
            />
            <p className="font-display text-xl">Todo en orden</p>
            <p className="mt-1 text-sm text-ink-soft">
              Nadie con la cuota por vencer esta semana.
            </p>
          </div>
        ) : (
          <ul className="stagger card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
            {atencion.map((c) => (
              <ClienteRow key={c.id} cliente={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
