import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BuzonDuenoList } from "./buzon-dueno-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PanelBuzonPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data } = await supabase
    .from("buzon_comentarios")
    // IMPORTANTE: nunca hacer join a clientes/profiles aquí.
    // cliente_id existe en la fila pero NO se selecciona ni expone en la UI.
    .select("id, categoria, texto, estado, respuesta, respondido_at, creado_at")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .order("creado_at", { ascending: false });

  type Comentario = {
    id: string;
    categoria: string;
    texto: string;
    estado: string;
    respuesta: string | null;
    respondido_at: string | null;
    creado_at: string;
  };

  const comentarios = (data ?? []) as Comentario[];

  return (
    <div className="stagger space-y-6">
      <h1 className="text-2xl">Buzón anónimo</h1>
      <p className="text-sm text-ink-soft">
        Comentarios de los socios. Los nombres no se muestran para preservar el
        anonimato.
      </p>
      <BuzonDuenoList comentarios={comentarios} />
    </div>
  );
}
