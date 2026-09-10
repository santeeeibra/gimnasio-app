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
      className="capa-ambiental min-h-screen bg-paper text-ink"
      style={temaToVars(tema)}
      data-estilo-visual={tema.estiloVisual}
      data-theme-polarity={polaridadTema(tema)}
      data-motion={resolverMotion(tema)}
    >
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/95 backdrop-blur-md px-5 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-volt/30 bg-volt/15 text-sm font-bold text-volt">
            S
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm leading-tight">
              SysGym
            </span>
            <span className="block text-[11px] leading-tight text-ink-soft">
              Demo · probá sin registrarte
            </span>
          </span>
        </div>

        <Link
          href="/registrarse"
          className="inline-flex h-9 items-center rounded-full bg-volt px-4 text-xs font-semibold text-volt-ink shadow-sm transition-[transform,filter] duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-95 active:scale-95"
        >
          Crear cuenta
        </Link>
      </header>

      <DemoShell>{children}</DemoShell>
    </div>
  );
}
