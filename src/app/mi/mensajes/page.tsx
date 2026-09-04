import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { pillClasses } from "@/components/ui";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function MiBandejaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("mensaje_destinatarios")
    .select(
      "mensaje_id, leido, mensaje:mensajes(cuerpo, respondible, creado_at, remitente:profiles(nombre))",
    )
    .eq("profile_id", profile.id);

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("logo_url")
    .eq("id", profile.gimnasio_id)
    .single();

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
    <main className="stagger max-w-md mx-auto min-h-full p-5 pb-24 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-ink">Mensajes</h1>
        <Link href="/mi" className={pillClasses.neutra}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4 shrink-0" />
          Inicio
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[14px] border border-rule bg-paper-2 px-6 py-14 text-center shadow-sm">
          <span
            aria-hidden
            className="animate-float-soft grid size-14 place-items-center rounded-full border border-rule bg-paper text-ink-soft"
          >
            <MessageSquare aria-hidden strokeWidth={1.8} className="size-6 text-volt" />
          </span>
          <p className="text-sm text-ink-soft">
            No tenés mensajes todavía.
            <br />
            Cuando el gimnasio te escriba, aparece acá.
          </p>
        </div>
      ) : (
        <ul className="stagger-in overflow-hidden rounded-[14px] border border-rule bg-paper-2 divide-y divide-rule shadow-sm">
          {items.map((i) => (
            <li
              key={i.mensaje_id}
              className={!i.leido ? "border-l-[3px] border-l-volt bg-volt/[0.02]" : ""}
            >
              <Link
                href={`/mi/mensajes/${i.mensaje_id}`}
                className="block px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
              >
                <p className="text-sm font-medium text-ink line-clamp-2 leading-snug">{i.mensaje!.cuerpo}</p>
                <p className="text-xs text-ink-soft mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {!i.mensaje!.remitente && gym?.logo_url ? (
                    <span className="inline-block size-4.5 shrink-0 overflow-hidden rounded-full border border-rule bg-paper-2 align-middle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gym.logo_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : null}
                  <span>{i.mensaje!.remitente?.nombre ?? "Gimnasio"}</span>
                  <span>·</span>
                  <span>{new Date(i.mensaje!.creado_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                  {!i.leido ? (
                    <>
                      <span>·</span>
                      <span className="animate-pop-in inline-flex items-center rounded-full bg-volt px-2 py-0.5 text-[11px] font-bold text-volt-ink tracking-tight shadow-[0_0_6px_var(--volt-glow,rgba(16,231,160,0.2))]">
                        nuevo
                      </span>
                    </>
                  ) : null}
                  {i.mensaje!.respondible ? (
                    <span className="text-ink-soft">· podés responder</span>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
