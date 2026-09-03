"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { linkClasses } from "@/components/ui";

type NavItem = { href: string; label: string; soloDesktop?: boolean };

const NAV: NavItem[] = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/clientes", label: "Clientes" },
  { href: "/panel/planes", label: "Planes de socios" },
  { href: "/panel/mensajes", label: "Mensajes" },
  { href: "/panel/ingresos", label: "Ingresos" },
  { href: "/panel/plan", label: "Mi plan", soloDesktop: true },
  { href: "/panel/ajustes", label: "Ajustes" },
];

const NAV_MOBILE = NAV.filter((i) => !i.soloDesktop);

function isActive(pathname: string, href: string) {
  if (href === "/panel") return pathname === "/panel";
  // Coincidencia por segmento: /panel/planes NO activa /panel/plan.
  return pathname === href || pathname.startsWith(href + "/");
}

const NUMERO_SOPORTE_WHATSAPP = "5492920605208";

/** Link de WhatsApp con mensaje precargado para reportar un problema. */
function whatsappReporteUrl(nombreGimnasio?: string | null) {
  const gimnasio = nombreGimnasio || "mi gimnasio";
  const mensaje = `Hola, soy ${gimnasio}. Tengo un problema: `;
  return `https://wa.me/${NUMERO_SOPORTE_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

/** Miniatura del logo del gimnasio, con caja de tamaño fijo. */
function LogoMark({
  logo,
  size,
}: {
  logo?: string | null;
  size: string;
}) {
  if (!logo) return null;
  return (
    <span
      className={`${size} shrink-0 overflow-hidden rounded-[6px] border border-rule bg-paper-2`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

/** Desktop: columna fija a la izquierda. */
export function PanelSidebar({
  nombre,
  dueno,
  logo,
  esSuper = false,
}: {
  nombre?: string | null;
  dueno: string;
  logo?: string | null;
  esSuper?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col gap-6 border-r border-rule p-5 md:sticky md:top-0 md:h-screen">
      <div className="flex items-center gap-2.5">
        <LogoMark logo={logo} size="size-9" />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight truncate">{nombre}</p>
          <p className="text-xs text-ink-soft truncate">{dueno}</p>
        </div>
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
      <div className="flex flex-col gap-3">
        <Link
          href="/checkin"
          className="inline-flex h-9 items-center justify-center rounded-[5px] border border-rule px-3 text-sm text-ink transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.98]"
        >
          Modo check-in
        </Link>
        <a
          href={whatsappReporteUrl(nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-[5px] border border-rule px-3 text-sm text-ink transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.98]"
        >
          Reportar un problema
        </a>
        {esSuper ? (
          <Link href="/admin" className={`text-xs ${linkClasses.accion}`}>
            Soporte (dev)
          </Link>
        ) : null}
        <form action={logout}>
          <button className={`text-xs ${linkClasses.accion}`}>Salir</button>
        </form>
      </div>
    </aside>
  );
}

/** Mobile: cabecera compacta arriba. */
export function PanelTopbar({
  nombre,
  logo,
  esSuper = false,
}: {
  nombre?: string | null;
  logo?: string | null;
  esSuper?: boolean;
}) {
  return (
    <header className="md:hidden flex items-center justify-between border-b border-rule px-5 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark logo={logo} size="size-7" />
        <p className="font-display text-base leading-tight truncate">{nombre}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <a
          href={whatsappReporteUrl(nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${linkClasses.accion}`}
        >
          Reportar
        </a>
        {esSuper ? (
          <Link href="/admin" className={`text-xs ${linkClasses.accion}`}>
            Soporte
          </Link>
        ) : null}
        <form action={logout}>
          <button className={`text-xs ${linkClasses.accion}`}>Salir</button>
        </form>
      </div>
    </header>
  );
}

/** Mobile: navegación fija abajo, siempre a 1 tap. */
export function PanelBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex border-t border-rule bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      {NAV_MOBILE.map((item) => {
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
