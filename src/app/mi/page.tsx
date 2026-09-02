import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import { ActivarNotificaciones } from "./activar-notificaciones";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";
import { AnilloProgreso } from "@/components/anillo-progreso";

export default async function MiPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("fecha_vencimiento, plan:planes(nombre, duracion_dias)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { count: noLeidos } = await supabase
    .from("mensaje_destinatarios")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("leido", false);

  const c = data as any;
  const dias = diasRestantes(c?.fecha_vencimiento ?? null);
  const estado = estadoDesdeDias(dias);
  const duracionTotal = c?.plan?.duracion_dias ?? 30; // fallback a 30 si no hay plan
  const diasParaAnillo = dias !== null && dias >= 0 ? dias : 0;

  return (
    <main className="stagger max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">Hola, {profile.nombre.split(" ")[0]}</h1>
        <div className="flex shrink-0 items-baseline gap-3">
          <VerTutorialDeNuevo />
          <form action={logout}>
            <button className="text-xs text-ink-soft underline underline-offset-2">
              Salir
            </button>
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

      <ul className="card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
        <li>
          <a
            href="/mi/mensajes"
            className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper"
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
              className="shrink-0 text-ink-soft"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mensajes del gimnasio
            </span>
            {noLeidos ? (
              <span className="shrink-0 text-xs bg-volt text-volt-ink rounded-full px-2 py-0.5 font-medium">
                {noLeidos} sin leer
              </span>
            ) : (
              <span className="shrink-0 text-xs text-ink-soft">ver</span>
            )}
          </a>
        </li>
        <li>
          <a
            href="/mi/rutina"
            className="flex items-center gap-3 px-4 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper"
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
              className="shrink-0 text-ink-soft"
            >
              <path d="M6.5 6.5h11v11h-11z" />
              <path d="M2 9v6M22 9v6M4.5 8v8M19.5 8v8" />
            </svg>
            <span className="min-w-0 flex-1 text-sm font-medium">Tu rutina</span>
            <span className="shrink-0 text-xs text-ink-soft">ver</span>
          </a>
        </li>
      </ul>

      <ActivarNotificaciones />
    </main>
  );
}
