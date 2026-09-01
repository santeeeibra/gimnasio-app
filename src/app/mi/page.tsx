import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Panel } from "@/components/ui";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";

export default async function MiPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes")
    .select("fecha_vencimiento, plan:planes(nombre)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { count: noLeidos } = await supabase
    .from("mensaje_destinatarios")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("leido", false);

  // Cargar colores del gimnasio
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("color_primario, color_acento, color_fondo")
    .eq("id", profile.gimnasio_id)
    .single();

  const customColors = gym
    ? {
        "--ink": gym.color_primario || "#16181d",
        "--volt": gym.color_acento || "#cde94a",
        "--paper": gym.color_fondo || "#faf9f6",
      }
    : {};

  const c = data as any;
  const dias = diasRestantes(c?.fecha_vencimiento ?? null);
  const estado = estadoDesdeDias(dias);

  return (
    <main
      className="max-w-md mx-auto p-6 space-y-6"
      style={customColors as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">Hola, {profile.nombre.split(" ")[0]}</h1>
        <form action={logout}>
          <button className="text-xs text-ink-soft underline underline-offset-2">
            Salir
          </button>
        </form>
      </div>

      <Panel
        className={`p-5 border-l-2 ${
          estado === "vencido"
            ? "border-l-danger"
            : estado === "por_vencer"
              ? "border-l-warn"
              : "border-l-ok"
        }`}
      >
        <p className="text-xs text-ink-soft">Tu cuota</p>
        <p
          className={`font-display text-2xl ${
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
      </Panel>

      <a
        href="/mi/mensajes"
        className="flex items-center justify-between border border-rule rounded-[6px] bg-white px-5 py-4 hover:bg-paper-2"
      >
        <span className="text-sm font-medium">Mensajes del gimnasio</span>
        {noLeidos ? (
          <span className="text-xs bg-volt text-ink rounded-full px-2 py-0.5 font-medium">
            {noLeidos} sin leer
          </span>
        ) : (
          <span className="text-xs text-ink-soft">ver</span>
        )}
      </a>

      <p className="text-sm text-ink-soft">
        Tu rutina llega acá en el próximo entregable.
      </p>
    </main>
  );
}
