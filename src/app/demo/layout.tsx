import Link from "next/link";
import {
  parseTema,
  temaToVars,
  polaridadTema,
  resolverMotion,
} from "@/lib/tema";
import { DemoShell } from "./demo-shell";

export const dynamic = "force-dynamic";

/**
 * El demo se ve con el MISMO sistema de diseño que la app real: inyecta las
 * variables de tema por defecto (`parseTema(null)`) igual que `mi/layout.tsx`,
 * así `bg-paper`, `text-ink`, `border-rule`, `--volt`, tipografía y radios
 * resuelven idéntico a `/mi`. Sin sesión, sin datos reales.
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tema = parseTema(null);

  return (
    <div
      className="capa-ambiental min-h-screen bg-paper text-ink selection:bg-volt selection:text-volt-ink"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col md:border-x md:border-rule/70 md:bg-paper md:shadow-[0_0_60px_rgba(0,0,0,0.35)]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/95 backdrop-blur-md px-5 py-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:pt-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-volt/30 bg-volt/15 text-sm font-bold text-volt shadow-xs">
              S
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold leading-tight">
                SysGym
              </span>
              <span className="block text-[11px] leading-tight text-ink-soft">
                Demo · probá sin registrarte
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-semibold text-ink-soft hover:text-ink transition-colors active:scale-95"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registrarse"
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-volt px-3.5 text-xs font-semibold text-volt-ink shadow-sm transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-95"
            >
              Crear cuenta
            </Link>
          </div>
        </header>

        <DemoShell>{children}</DemoShell>
      </div>
    </div>
  );
}
