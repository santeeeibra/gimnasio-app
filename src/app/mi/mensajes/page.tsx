import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
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
    <main className="stagger max-w-md mx-auto p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl">Mensajes</h1>
        <Link
          href="/mi"
          className={`text-xs ${linkClasses.accion}`}
        >
          ← Inicio
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card-cut flex flex-col items-center gap-3 border border-rule bg-paper-2 px-6 py-14 text-center">
          <span
            aria-hidden
            className="animate-float-soft grid size-16 place-items-center rounded-full border border-rule bg-paper text-ink-soft"
          >
            <svg
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <p className="text-sm text-ink-soft">
            No tenés mensajes todavía.
            <br />
            Cuando el gimnasio te escriba, aparece acá.
          </p>
        </div>
      ) : (
        <ul className="card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
          {items.map((i) => (
            <li
              key={i.mensaje_id}
              className={!i.leido ? "border-l-2 border-l-volt" : ""}
            >
              <Link
                href={`/mi/mensajes/${i.mensaje_id}`}
                className="block px-4 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper"
              >
                <p className="text-sm line-clamp-2">{i.mensaje!.cuerpo}</p>
                <p className="text-xs text-ink-soft mt-1">
                    {!i.mensaje!.remitente && gym?.logo_url ? (
                      <span className="mr-1 inline-block size-4 overflow-hidden rounded-full border border-rule bg-paper-2 align-text-bottom">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={gym.logo_url}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </span>
                    ) : null}
                    {i.mensaje!.remitente?.nombre ?? "Gimnasio"} ·{" "}
                    {new Date(i.mensaje!.creado_at).toLocaleDateString()}
                    {!i.leido ? (
                      <>
                        {" · "}
                        <span className="animate-pop-in inline-block rounded-full bg-volt px-1.5 py-px font-medium text-volt-ink">
                          nuevo
                        </span>
                      </>
                    ) : null}
                    {i.mensaje!.respondible ? " · podés responder" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
