"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Building2,
  AlertTriangle,
  CreditCard,
  BellRing,
  Dumbbell,
  HeartPulse,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Cockpit", icon: Gauge },
  { href: "/admin/salud", label: "Salud", icon: HeartPulse },
  { href: "/admin/gimnasios", label: "Gimnasios", icon: Building2 },
  { href: "/admin/errores", label: "Errores", icon: AlertTriangle },
  { href: "/admin/planes", label: "Planes", icon: CreditCard },
  { href: "/admin/push-prueba", label: "Push Test", icon: BellRing },
  { href: "/admin/simulador-rutina", label: "Simulador", icon: Dumbbell },
];

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
      {NAV.map((n) => {
        const Icon = n.icon;
        const isActive =
          n.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(n.href);

        return (
          <Link
            key={n.href}
            href={n.href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 [transition-timing-function:var(--ease-spring)] ${
              isActive
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-soft hover:bg-paper-2 hover:text-ink"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
