import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BuzonSocioForm } from "./buzon-socio-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CATEGORIA_LABEL: Record<string, string> = {
  equipo: "Equipo roto",
  limpieza: "Limpieza",
  sugerencia: "Sugerencia",
  otro: "Otro",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  resuelto: "Resuelto",
};

export default async function BuzonPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Obtener el id de cliente del perfil autenticado
  const { data: clienteRow } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const clienteId = (clienteRow as { id: string } | null)?.id ?? null;

  // Comentarios propios (RLS garantiza que solo ve los suyos)
  const { data: comentarios } = clienteId
    ? await supabase
        .from("buzon_comentarios")
        .select("id, categoria, texto, estado, respuesta, respondido_at, creado_at")
        .eq("cliente_id", clienteId)
        .order("creado_at", { ascending: false })
    : { data: [] };

  type Comentario = {
    id: string;
    categoria: string;
    texto: string;
    estado: string;
    respuesta: string | null;
    respondido_at: string | null;
    creado_at: string;
  };

  const lista = (comentarios ?? []) as Comentario[];

  return (
    <main className="stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl">Buzón anónimo</h1>
      </div>

      <p className="text-sm text-ink-soft">
        Tus comentarios llegan al gimnasio sin tu nombre. Podés escribir sobre
        equipos, limpieza o lo que se te ocurra.
      </p>

      <div className="card-cut border border-rule bg-paper-2 p-5">
        <h2 className="text-base font-medium mb-4">Nuevo comentario</h2>
        <BuzonSocioForm />
      </div>

      {lista.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Tus comentarios enviados</h2>
          <ul className="card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
            {lista.map((c) => (
              <li key={c.id} className="px-4 py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                    {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      c.estado === "resuelto"
                        ? "bg-ok/15 text-ok"
                        : "bg-warn/15 text-warn"
                    }`}
                  >
                    {ESTADO_LABEL[c.estado] ?? c.estado}
                  </span>
                </div>
                <p className="text-sm">{c.texto}</p>
                {c.respuesta && (
                  <div className="rounded-[5px] border border-rule bg-paper px-3 py-2.5 space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                      Respuesta del gimnasio
                    </p>
                    <p className="text-sm">{c.respuesta}</p>
                  </div>
                )}
                <p className="text-xs text-ink-soft">
                  {new Date(c.creado_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
