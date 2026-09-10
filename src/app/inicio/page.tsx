import type { Metadata } from "next";
import Link from "next/link";
import { LeadForm } from "./lead-form";

const TITLE = "SysGym — Gestión de gimnasios sin perseguir a nadie por WhatsApp";
const DESC =
  "Software para dueños de gimnasio: control de cuotas con aviso automático de vencimiento, alta de socios, rutinas personalizadas, check-in por DNI y tu marca en una app propia.";
const URL = "https://gimnasio-app-rose.vercel.app/inicio";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    siteName: "SysGym",
    title: TITLE,
    description: DESC,
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

function IconAlert() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconNotebook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6M6 3v18M6 3H4m2 18H4m3-13H4m3 5H4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBrand() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PROBLEMAS = [
  {
    icon: <IconAlert />,
    t: "Cuotas atrasadas que nadie avisa",
    d: "Te enterás de que un socio dejó de pagar semanas después, cuando ya perdiste ese ingreso y la conversación incómoda es peor.",
  },
  {
    icon: <IconNotebook />,
    t: "Altas a mano en el cuaderno o el Excel",
    d: "Datos duplicados, planillas que solo entendés vos y media hora por socio nuevo entre WhatsApp, notas y memoria.",
  },
  {
    icon: <IconBrand />,
    t: "Cero identidad de tu gimnasio",
    d: "Tus socios usan una planilla compartida o una app genérica con el logo de otro. Nada dice que ese lugar es tuyo.",
  },
];

const FEATURES = [
  {
    t: "Socios y cuotas bajo control",
    d: "Alta rápida con plan asignado y aviso automático a cada socio los días antes de que se le venza la cuota. Vos ves quién está al día y quién no, de un vistazo.",
  },
  {
    t: "Rutinas personalizadas de verdad",
    d: "El motor arma la rutina por objetivo, nivel, sexo y zona a enfocar, respetando volumen por día. El socio la edita y sustituye ejercicios que no conoce.",
  },
  {
    t: "Check-in por DNI, modo kiosko",
    d: "Una tablet en la entrada: el socio pone el DNI y listo. Queda registrada la asistencia y el día de prueba se controla solo.",
  },
  {
    t: "Mensajería individual y masiva",
    d: "Mandá un aviso a todos, o solo a los de un plan, desde la misma app. Llega a la bandeja del socio y como notificación push.",
  },
  {
    t: "Tu marca, tu app",
    d: "Subís el logo y elegís los colores de tu gimnasio. La app que usan tus socios lleva tu identidad, no la de un proveedor.",
  },
  {
    t: "Pensado para el celular",
    d: "Dueño y socio la usan desde el teléfono. Una columna, botones grandes, nada que dependa de una compu.",
  },
];

const PASOS = [
  {
    n: "1",
    t: "Nos contás tu caso",
    d: "Cuántos socios tenés, qué planes manejás y cómo cobrás hoy.",
  },
  {
    n: "2",
    t: "Te dejamos el gimnasio listo",
    d: "Cargamos tu logo, tus colores y tus planes. Vos sumás los socios o los pasás de tu planilla.",
  },
  {
    n: "3",
    t: "Tus socios entran con el DNI",
    d: "Cada uno ve su cuota, su rutina y tus mensajes. Sin registro, los das de alta vos.",
  },
  {
    n: "4",
    t: "Dejás de perseguir pagos",
    d: "Los avisos de vencimiento salen solos. Vos mirás el panel cuando querés.",
  },
];

export default function InicioPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <span className="font-display text-lg font-semibold tracking-tight">
            Sys<span className="text-[color:var(--ink-soft)]">Gym</span>
          </span>
          <Link
            href="/login"
            className="rounded-[12px] border border-rule px-3.5 py-2 text-sm font-medium text-ink transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.97]"
          >
            Ingresar
          </Link>
        </div>
      </header>

      {/* 1 — Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1 text-xs font-medium text-ink-soft">
            Software para dueños de gimnasio
          </p>
          <h1 className="font-display text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-5xl">
            Gestioná tu gimnasio sin perseguir a nadie por WhatsApp
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-lg">
            Controlá las cuotas con aviso automático de vencimiento, dá de alta
            socios en segundos y poné tu logo y tus colores en una app propia.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#probar"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-[12px] bg-volt px-6 text-[15px] font-semibold text-volt-ink shadow-sm transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-[0.97] sm:w-auto"
            >
              Quiero probarlo
            </a>
            <a
              href="#como-funciona"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-[12px] border border-rule px-6 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.97] sm:w-auto"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>
      </section>

      {/* 2 — El problema */}
      <section className="border-y border-rule bg-paper-2/60">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Hoy la gestión te come tiempo y plata
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {PROBLEMAS.map((p) => (
              <div
                key={p.t}
                className="rounded-[16px] border border-rule bg-paper p-5"
              >
                <div className="text-danger">{p.icon}</div>
                <h3 className="mt-3 font-display text-base font-semibold">
                  {p.t}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — Features */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Todo lo que necesitás, en una sola app
        </h2>
        <p className="mt-2 max-w-xl text-[15px] text-ink-soft">
          Nada de módulos que no vas a usar. Esto es lo que hace hoy.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="rounded-[16px] border border-rule bg-paper p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 size-2 shrink-0 rounded-full bg-volt"
                />
                <div>
                  <h3 className="font-display text-base font-semibold">{f.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {f.d}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — Cómo funciona */}
      <section
        id="como-funciona"
        className="scroll-mt-16 border-y border-rule bg-paper-2/60"
      >
        <div className="mx-auto max-w-5xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Cómo funciona
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {PASOS.map((p) => (
              <li
                key={p.n}
                className="flex gap-4 rounded-[16px] border border-rule bg-paper p-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-semibold text-paper">
                  {p.n}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{p.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {p.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5 — Precio */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="mx-auto max-w-xl rounded-[20px] border border-rule bg-paper-2 p-7 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Contanos tu caso y te armamos un plan
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Todavía no tenemos un precio de lista. Ajustamos según la cantidad de
            socios y lo que necesites. Sin permanencia.
          </p>
          <a
            href="#probar"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-[12px] bg-ink px-6 text-[15px] font-semibold text-paper transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-125 active:scale-[0.97]"
          >
            Pedir mi plan
          </a>
        </div>
      </section>

      {/* 6 — Formulario */}
      <section
        id="probar"
        className="scroll-mt-16 border-y border-rule bg-paper-2/60"
      >
        <div className="mx-auto max-w-xl px-5 py-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Probalo en tu gimnasio
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            Dejanos tus datos y te escribimos para coordinar.
          </p>
          <div className="mt-7">
            <LeadForm />
          </div>
        </div>
      </section>

      {/* 7 — Footer */}
      <footer className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-col items-center justify-between gap-3 text-sm text-ink-soft sm:flex-row">
          <span className="font-display font-semibold text-ink">SysGym</span>
          <p>© {new Date().getFullYear()} SysGym. Hecho para gimnasios.</p>
          <Link
            href="/login"
            className="underline decoration-rule underline-offset-[3px] transition-colors hover:decoration-ink"
          >
            Ya soy cliente
          </Link>
        </div>
      </footer>

      <style
        dangerouslySetInnerHTML={{
          __html: `
.reveal{animation:inicio-up .5s var(--ease-out) both}
@keyframes inicio-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion:reduce){.reveal{animation:none}}
`,
        }}
      />
    </main>
  );
}
