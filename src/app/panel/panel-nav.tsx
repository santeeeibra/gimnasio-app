"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";

const NAV = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/planes", label: "Planes" },
  { href: "/panel/mensajes", label: "Mensajes" },
  { href: "/panel/ajustes", label: "Ajustes" },
];

function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

/** Desktop: columna fija a la izquierda. */
export function PanelSidebar({
  nombre,
  dueno,
}: {
  nombre?: string | null;
  dueno: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col gap-6 border-r border-rule p-5 md:sticky md:top-0 md:h-screen">
      <div>
        <p className="font-display text-lg leading-tight">{nombre}</p>
        <p className="text-xs text-ink-soft">{dueno}</p>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2 rounded-[5px] text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-paper-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout}>
        <button className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">
          Salir
        </button>
      </form>
    </aside>
  );
}

/** Mobile: cabecera compacta arriba. */
export function PanelTopbar({ nombre }: { nombre?: string | null }) {
  return (
    <header className="md:hidden flex items-center justify-between border-b border-rule px-5 py-3">
      <p className="font-display text-base leading-tight truncate">{nombre}</p>
      <form action={logout}>
        <button className="text-xs text-ink-soft underline underline-offset-2 active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)]">
          Salir
        </button>
      </form>
    </header>
  );
}

/** Mobile: navegación fija abajo, siempre a 1 tap. */
export function PanelBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-rule bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] tracking-tight touch-manipulation active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
          >
            <span
              aria-hidden
              className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
                active ? "bg-volt" : "bg-transparent"
              }`}
            />
            <span className={active ? "text-ink font-medium" : "text-ink-soft"}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
