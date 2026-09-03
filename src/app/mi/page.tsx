import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import { ActivarNotificaciones } from "./activar-notificaciones";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";
import { AnilloProgreso } from "@/components/anillo-progreso";
import { linkClasses } from "@/components/ui";
import { RachaConstancia } from "@/components/mi/racha-constancia";
import { DatosTransferencia } from "@/components/mi/datos-transferencia";
import { CacheAlVuelo } from "@/components/offline/cache-al-vuelo";

export default async function MiPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("estado, pago_alias, pago_cbu, pago_titular")
    .eq("id", profile.gimnasio_id)
    .single();

  const estadoGimnasio = gym?.estado ?? "prueba";
  const soloLectura = estadoGimnasio === "solo_lectura";

  const { data } = await supabase
    .from("clientes")
    .select("id, fecha_vencimiento, plan:planes(nombre, duracion_dias)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { count: noLeidos } = await supabase
    .from("mensaje_destinatarios")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("leido", false);

  const c = data as any;

  // Racha de constancia: 15 barras × 2 días = últimos 30 días. Defensivo: si
  // `registros_entrada` no existe todavía o no hay visitas, no se renderiza.
  let racha: { dias: boolean[]; total: number } | null = null;
  if (c?.id) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 29);
    const { data: entradas, error: errEntradas } = await supabase
      .from("registros_entrada")
      .select("creado_en")
      .eq("cliente_id", c.id)
      .gte("creado_en", desde.toISOString());
    if (!errEntradas && entradas && entradas.length > 0) {
      const marcas = (entradas as { creado_en: string }[]).map((e) => {
        const d = new Date(e.creado_en);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      const N = 15;
      const dias = Array.from({ length: N }, (_, i) => {
        const fin = new Date(hoy);
        fin.setDate(fin.getDate() - (N - 1 - i) * 2);
        const ini = new Date(fin);
        ini.setDate(ini.getDate() - 1);
        return marcas.some((t) => t >= ini.getTime() && t <= fin.getTime());
      });
      racha = { dias, total: entradas.length };
    }
  }
  const dias = diasRestantes(c?.fecha_vencimiento ?? null);
  const estado = estadoDesdeDias(dias);
  const duracionTotal = c?.plan?.duracion_dias ?? 30; // fallback a 30 si no hay plan
  const diasParaAnillo = dias !== null && dias >= 0 ? dias : 0;

  return (
    <main className="stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <CacheAlVuelo
        clave="cuota:mi"
        data={{
          nombre: profile.nombre,
          estado,
          dias,
          plan: c?.plan?.nombre ?? null,
          fechaVencimiento: c?.fecha_vencimiento ?? null,
        }}
      />
      {soloLectura && (
        <div className="rounded-lg border-2 border-danger bg-danger/10 p-4">
          <h2 className="mb-2 text-lg font-display text-danger">
            Período de prueba finalizado
          </h2>
          <p className="text-sm text-ink">
            El gimnasio está en modo solo lectura. Contactá a la administración para activar un plan.
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">Hola, {profile.nombre.split(" ")[0]}</h1>
        <div className="flex shrink-0 items-baseline gap-3">
          <VerTutorialDeNuevo className={`text-xs px-2 py-2 -mr-2 ${linkClasses.accion}`} />
          <form action={logout}>
            <button className={`text-xs px-2 py-2 -mr-2 ${linkClasses.accion}`}>Salir</button>
          </form>
        </div>
      </div>

      <div
        className={`card-cut card-cut-lg futurista-fondo border border-rule bg-paper-2 p-5 border-l-2 ${
          estado === "vencido"
            ? "border-l-danger"
            : estado === "por_vencer"
              ? "border-l-warn"
              : "border-l-ok"
        }`}
      >
        <p className="text-xs text-ink-soft mb-4">Tu cuota</p>
        
        <div className="flex items-center gap-6">
          <AnilloProgreso
            valor={diasParaAnillo}
            max={duracionTotal}
            label="días"
            tono={
              estado === "vencido"
                ? "peligro"
                : estado === "por_vencer"
                  ? "aviso"
                  : "ok"
            }
          />
          
          <div className="min-w-0 flex-1">
            <p
              className={`font-display text-2xl leading-tight ${
                estado === "vencido"
                  ? "text-danger"
                  : estado === "por_vencer"
                    ? "text-warn"
                    : "text-ok"
              }`}
            >
              {ESTADO_LABEL[estado]}
            </p>
            <p className="text-sm text-ink-soft mt-1">
              {c?.plan?.nombre ?? "Sin plan"}
              {c?.fecha_vencimiento
                ? ` · vence ${c.fecha_vencimiento}${
                    dias !== null
                      ? dias < 0
                        ? ` (hace ${Math.abs(dias)} días)`
                        : ` (en ${dias} días)`
                      : ""
                  }`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {racha ? (
        <RachaConstancia dias={racha.dias} total={racha.total} />
      ) : null}

      {estado !== "al_dia" ? (
        <DatosTransferencia
          alias={gym?.pago_alias ?? null}
          cbu={gym?.pago_cbu ?? null}
          titular={gym?.pago_titular ?? null}
        />
      ) : null}

      <ul className="stagger-in card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
        <li>
          <Link
            href="/mi/mensajes"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mensajes del gimnasio
            </span>
            {noLeidos ? (
              <span className="animate-pop-in shrink-0 text-xs bg-volt text-volt-ink rounded-full px-2 py-0.5 font-medium">
                {noLeidos} sin leer
              </span>
            ) : (
              <span className="shrink-0 text-base text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]" aria-hidden="true">
                ›
              </span>
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/mi/rutina"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            >
              <path d="M6.5 6.5h11v11h-11z" />
              <path d="M2 9v6M22 9v6M4.5 8v8M19.5 8v8" />
            </svg>
            <span className="min-w-0 flex-1 text-sm font-medium">Tu rutina</span>
            <span className="shrink-0 text-base text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]" aria-hidden="true">
              ›
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/mi/pagos"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span className="min-w-0 flex-1 text-sm font-medium">Mis pagos</span>
            <span className="shrink-0 text-base text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]" aria-hidden="true">
              ›
            </span>
          </Link>
        </li>
      </ul>

      <ActivarNotificaciones />
    </main>
  );
}
