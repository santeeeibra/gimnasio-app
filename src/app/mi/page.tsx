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

  const c = data as any;
  const dias = diasRestantes(c?.fecha_vencimiento ?? null);
  const estado = estadoDesdeDias(dias);

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
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

      <p className="text-sm text-ink-soft">
        Tu rutina y los avisos del gimnasio llegan acá en el próximo entregable.
      </p>
    </main>
  );
}
