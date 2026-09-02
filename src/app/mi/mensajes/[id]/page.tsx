import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarkRead } from "../mark-read";
import { ReplyForm } from "../reply-form";

export default async function MiHiloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: msg } = await supabase
    .from("mensajes")
    .select("id, cuerpo, respondible, creado_at, remitente:profiles(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!msg) notFound();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("logo_url")
    .eq("id", profile.gimnasio_id)
    .single();

  const { data: respData } = await supabase
    .from("mensaje_respuestas")
    .select("id, cuerpo, creado_at, autor_id, autor:profiles(nombre)")
    .eq("mensaje_id", id)
    .order("creado_at");

  const m = msg as unknown as {
    id: string;
    cuerpo: string;
    respondible: boolean;
    creado_at: string;
    remitente: { nombre: string } | null;
  };
  const respuestas = (respData ?? []) as unknown as {
    id: string;
    cuerpo: string;
    creado_at: string;
    autor_id: string;
    autor: { nombre: string } | null;
  }[];

  return (
    <main className="stagger max-w-md mx-auto p-6 space-y-6">
      <MarkRead mensajeId={m.id} />
      <Link
        href="/mi/mensajes"
        className="text-xs text-ink-soft underline underline-offset-2"
      >
        ← Mensajes
      </Link>

      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5">
        <p className="text-xs text-ink-soft">
          {!m.remitente && gym?.logo_url ? (
            <span className="mr-1 inline-block size-4 overflow-hidden rounded-full border border-rule bg-paper-2 align-text-bottom">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={gym.logo_url}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
          ) : null}
          {m.remitente?.nombre ?? "Gimnasio"} ·{" "}
          {new Date(m.creado_at).toLocaleString()}
        </p>
        <p className="text-sm whitespace-pre-wrap mt-2">{m.cuerpo}</p>
      </div>

      {m.respondible ? (
        <section className="space-y-3">
          {respuestas.length > 0 ? (
            <ul className="space-y-2">
              {respuestas.map((r) => {
                const mio = r.autor_id === profile.id;
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
                      className={`text-[10px] mt-1 ${
                        mio ? "text-paper/60" : "text-ink-soft"
                      }`}
                    >
                      {mio ? "Vos" : r.autor?.nombre ?? "Gimnasio"} ·{" "}
                      {new Date(r.creado_at).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">Todavía no hay respuestas.</p>
          )}
          <ReplyForm mensajeId={m.id} />
        </section>
      ) : (
        <p className="text-sm text-ink-soft">Este mensaje es solo un aviso.</p>
      )}
    </main>
  );
}
