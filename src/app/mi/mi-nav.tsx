"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/mi", label: "Inicio" },
  { href: "/mi/rutina", label: "Rutina" },
  { href: "/mi/mensajes", label: "Mensajes" },
];

function isActive(pathname: string, href: string) {
  return href === "/mi" ? pathname === "/mi" : pathname.startsWith(href);
}

/** Mobile: navegación fija abajo, siempre a 1 tap. */
export function MiBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-rule bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
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
