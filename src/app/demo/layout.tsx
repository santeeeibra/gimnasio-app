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
      className="capa-ambiental min-h-screen bg-paper text-ink selection:bg-volt selection:text-volt-ink md:flex md:flex-col md:items-center md:justify-start md:py-8 md:px-4 md:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,231,160,0.08),transparent)]"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <div className="relative flex w-full flex-col min-h-screen md:min-h-0 md:max-w-md md:rounded-[28px] md:border md:border-rule/80 md:bg-paper md:shadow-[0_24px_60px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.05)]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/95 backdrop-blur-md px-5 py-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:pt-3.5 md:rounded-t-[28px]">
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

          <Link
            href="/registrarse"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-volt px-4 text-xs font-semibold text-volt-ink shadow-sm transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-95"
          >
            Crear cuenta
          </Link>
        </header>

        <DemoShell>{children}</DemoShell>
      </div>
    </div>
  );
}
