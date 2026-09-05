import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { AdminNavLinks } from "./nav-links";
import { Terminal, ArrowUpRight, ShieldCheck } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperadmin();

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-volt selection:text-volt-ink">
      {/* HEADER DEV CONSOLE */}
      <header className="sticky top-0 z-40 border-b border-rule/80 bg-paper/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* LADO IZQUIERDO: BRAND + STATUS BADGE */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="group flex items-center gap-2.5 select-none"
            >
              <div className="flex size-8 items-center justify-center rounded-[10px] bg-ink text-paper shadow-sm transition-transform group-hover:scale-105">
                <Terminal className="size-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm font-bold tracking-tight text-ink">
                    SysGym
                  </span>
                  <span className="rounded-full bg-ink px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-paper">
                    Dev Console
                  </span>
                </div>
              </div>
            </Link>

            {/* INDICADOR DE ENTORNO DE PRUEBA */}
            <div className="hidden items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[11px] font-semibold text-ok md:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-ok" />
              </span>
              <span>Entorno de Pruebas</span>
            </div>
          </div>

          {/* LADO DERECHO: ACCIONES DIRECTAS */}
          <div className="flex items-center gap-2">
            <Link
              href="/panel"
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-rule bg-paper-2 px-3 text-xs font-semibold text-ink transition-colors hover:bg-paper hover:border-ink"
            >
              <span>Ir a Panel Dueño</span>
              <ArrowUpRight className="size-3 text-ink-soft" />
            </Link>
          </div>
        </div>

        {/* BARRA DE NAVEGACIÓN SECUNDARIA */}
        <div className="border-t border-rule/50 bg-paper-2/40 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <AdminNavLinks />
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* FOOTER DISCRETO */}
      <footer className="border-t border-rule/50 py-6 text-center text-xs text-ink-soft">
        <p className="flex items-center justify-center gap-1.5 font-mono">
          <ShieldCheck className="size-3.5 text-ok" />
          <span>SysGym Superadmin Cockpit · Acceso de nivel de sistema</span>
        </p>
      </footer>
    </div>
  );
}
