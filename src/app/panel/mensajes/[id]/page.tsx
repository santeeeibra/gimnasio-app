import Link from "next/link";
import { notFound } from "next/navigation";
import { linkClasses } from "@/components/ui";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReplyForm } from "./reply-form";

export default async function MensajeHiloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: msg } = await supabase
    .from("mensajes")
    .select("id, cuerpo, respondible, creado_at, remitente_id")
    .eq("id", id)
    .maybeSingle();
  if (!msg) notFound();

  const [{ data: destData }, { data: respData }] = await Promise.all([
    supabase
      .from("mensaje_destinatarios")
      .select("leido, leido_at, profile:profiles(nombre)")
      .eq("mensaje_id", id),
    supabase
      .from("mensaje_respuestas")
      .select("id, cuerpo, creado_at, autor_id, autor:profiles(nombre)")
      .eq("mensaje_id", id)
      .order("creado_at"),
  ]);

  const destinatarios = (destData ?? []) as unknown as {
    leido: boolean;
    leido_at: string | null;
    profile: { nombre: string } | null;
  }[];
  const respuestas = (respData ?? []) as unknown as {
    id: string;
    cuerpo: string;
    creado_at: string;
    autor_id: string;
    autor: { nombre: string } | null;
  }[];

  return (
    <div className="stagger space-y-6 max-w-2xl">
      <Link
        href="/panel/mensajes"
        className={`text-xs ${linkClasses.accion}`}
      >
        ← Mensajes
      </Link>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
        <p className="text-xs text-ink-soft">
          {new Date(msg.creado_at).toLocaleString()}
        </p>
        <p className="text-sm whitespace-pre-wrap mt-2">{msg.cuerpo}</p>
      </div>

      <section>
        <h2 className="text-lg mb-2">
          Destinatarios ({destinatarios.length})
        </h2>
        <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule text-sm">
          {destinatarios.map((d, i) => (
            <li key={i} className="px-4 py-2 flex justify-between gap-4">
              <span>{d.profile?.nombre ?? "—"}</span>
              <span className="text-xs text-ink-soft">
                {d.leido ? "leído" : "sin leer"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {msg.respondible ? (
        <section className="space-y-3">
          <h2 className="text-lg mb-2">Conversación</h2>
          {respuestas.length === 0 ? (
            <p className="text-sm text-ink-soft">Sin respuestas todavía.</p>
          ) : (
            <ul className="space-y-2">
              {respuestas.map((r) => {
                const mio = r.autor_id === dueno.id;
                return (
                  <li
                    key={r.id}
                    className={`max-w-[85%] rounded-[6px] px-3 py-2 text-sm ${
                      mio
                        ? "ml-auto bg-ink text-paper"
                        : "bg-paper-2 border border-rule"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{r.cuerpo}</p>
                    <p
                      className={`text-xs mt-1 ${
                        mio ? "text-paper/60" : "text-ink-soft"
                      }`}
                    >
                      {mio ? "Vos" : r.autor?.nombre ?? "Cliente"} ·{" "}
                      {new Date(r.creado_at).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <ReplyForm mensajeId={msg.id} />
        </section>
      ) : (
        <p className="text-sm text-ink-soft">Este mensaje es solo aviso.</p>
      )}
    </div>
  );
}
