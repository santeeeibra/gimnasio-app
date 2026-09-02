import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui";

export default async function MiBandejaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("mensaje_destinatarios")
    .select(
      "mensaje_id, leido, mensaje:mensajes(cuerpo, respondible, creado_at, remitente:profiles(nombre))",
    )
    .eq("profile_id", profile.id);

  const items = ((data ?? []) as unknown as {
    mensaje_id: string;
    leido: boolean;
    mensaje: {
      cuerpo: string;
      respondible: boolean;
      creado_at: string;
      remitente: { nombre: string } | null;
    } | null;
  }[])
    .filter((i) => i.mensaje)
    .sort(
      (a, b) =>
        new Date(b.mensaje!.creado_at).getTime() -
        new Date(a.mensaje!.creado_at).getTime(),
    );

  return (
    <main className="max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">Mensajes</h1>
        <Link
          href="/mi"
          className="text-xs text-ink-soft underline underline-offset-2"
        >
          ← Inicio
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">No tenés mensajes.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.mensaje_id}>
              <Link href={`/mi/mensajes/${i.mensaje_id}`}>
                <Panel
                  className={`p-4 ${!i.leido ? "border-l-2 border-l-volt" : ""}`}
                >
                  <p className="text-sm line-clamp-2">{i.mensaje!.cuerpo}</p>
                  <p className="text-xs text-ink-soft mt-1">
                    {i.mensaje!.remitente?.nombre ?? "Gimnasio"} ·{" "}
                    {new Date(i.mensaje!.creado_at).toLocaleDateString()}
                    {!i.leido ? " · nuevo" : ""}
                    {i.mensaje!.respondible ? " · podés responder" : ""}
                  </p>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
