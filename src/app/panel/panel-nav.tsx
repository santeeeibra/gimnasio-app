"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { pillClasses } from "@/components/ui";
import { hapticoSeleccion } from "@/lib/ui/hapticos";
import {
  Award,
  CreditCard,
  Dumbbell,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Scale,
  Settings,
  Share2,
  Tags,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  corto?: string;
  soloDesktop?: boolean;
  Icono: LucideIcon;
};

export function getNavItems(tipoCuenta: string = "gym"): NavItem[] {
  if (tipoCuenta === "individual") {
    return [
      { href: "/panel", label: "Resumen", Icono: LayoutDashboard },
      { href: "/mi/rutina", label: "Mi Rutina", corto: "Rutina", Icono: Dumbbell },
      { href: "/mi/peso", label: "Mi Peso", corto: "Peso", Icono: Scale },
      { href: "/panel/plantillas", label: "Compartir rutina", corto: "Compartir", Icono: Share2 },
      { href: "/panel/plan", label: "Mi plan", soloDesktop: true, Icono: CreditCard },
      { href: "/panel/ajustes", label: "Ajustes", Icono: Settings },
    ];
  }

  if (tipoCuenta === "negocio_liviano") {
    return [
      { href: "/panel", label: "Resumen", Icono: LayoutDashboard },
      { href: "/panel/clientes", label: "Clientes", Icono: Users },
      { href: "/panel/mensajes", label: "Mensajes", Icono: MessageSquare },
      { href: "/panel/plan", label: "Mi plan", soloDesktop: true, Icono: CreditCard },
      { href: "/panel/ajustes", label: "Ajustes", Icono: Settings },
    ];
  }

  // gym completo
  return [
    { href: "/panel", label: "Resumen", Icono: LayoutDashboard },
    { href: "/panel/clientes", label: "Clientes", Icono: Users },
    { href: "/panel/planes", label: "Planes de socios", corto: "Planes", Icono: Tags },
    { href: "/panel/mensajes", label: "Mensajes", Icono: MessageSquare },
    { href: "/panel/buzon", label: "Buzón", Icono: Inbox },
    { href: "/panel/ingresos", label: "Ingresos", Icono: Wallet },
    { href: "/panel/plantillas", label: "Compartir rutina", corto: "Compartir", soloDesktop: true, Icono: Share2 },
    { href: "/panel/partner", label: "Partner", corto: "Partner", soloDesktop: true, Icono: Award },
    { href: "/panel/plan", label: "Mi plan", soloDesktop: true, Icono: CreditCard },
    { href: "/panel/ajustes", label: "Ajustes", Icono: Settings },
  ];
}

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
  tipoCuenta = "gym",
  esSuper = false,
}: {
  nombre?: string | null;
  dueno: string;
  logo?: string | null;
  tipoCuenta?: string;
  esSuper?: boolean;
}) {
  const pathname = usePathname();
  const items = getNavItems(tipoCuenta);

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
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2 rounded-[5px] text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:bg-paper-2 hover:text-ink"
              } inline-flex items-center gap-2.5`}
            >
              <item.Icono aria-hidden strokeWidth={1.8} className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-3">
        {tipoCuenta === "gym" && (
          <Link
            href="/checkin"
            className="inline-flex h-9 items-center justify-between rounded-[5px] border border-rule px-3 text-sm text-ink transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.98]"
          >
            <span>Modo check-in</span>
            <span className="rounded-[4px] bg-volt/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
              Elite
            </span>
          </Link>
        )}
        <a
          href={whatsappReporteUrl(nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-[5px] border border-rule px-3 text-sm text-ink transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 active:scale-[0.98]"
        >
          Reportar un problema
        </a>
        {esSuper ? (
          <Link href="/admin" className={pillClasses.neutra}>
            <LifeBuoy aria-hidden strokeWidth={2} className="size-4" />
            Soporte (dev)
          </Link>
        ) : null}
        <form action={logout}>
          <button className={`w-full ${pillClasses.destructiva}`}>Salir</button>
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
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/95 backdrop-blur-md px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark logo={logo} size="size-7" />
        <p className="font-display text-base leading-tight truncate">{nombre}</p>
      </div>
        <Link
          href="/panel/partner"
          className="px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-[#10e7a0] border border-emerald-500/30 active:scale-95 transition-all"
        >
          <Award className="size-3" />
          <span>Partner</span>
        </Link>
        <a
          href={whatsappReporteUrl(nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-2.5 text-xs ${pillClasses.neutra}`}
        >
          Reportar
        </a>
        {esSuper ? (
          <Link href="/admin" className={`px-2.5 text-xs ${pillClasses.neutra}`}>
            Soporte
          </Link>
        ) : null}
        <form action={logout}>
          <button className={`px-2.5 text-xs ${pillClasses.destructiva}`}>
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}

/**
 * Mobile: barra flotante con blur, despegada de los bordes. Primer paso del
 * rediseño de navegación a ventanas superpuestas (pedido reunión de ventas
 * 08/09): la nav queda como capa fija y las secciones podrán abrirse encima.
 */
export function PanelBottomNav({ tipoCuenta = "gym" }: { tipoCuenta?: string }) {
  const pathname = usePathname();
  const items = getNavItems(tipoCuenta).filter((i) => !i.soloDesktop);

  return (
    <div className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.55rem)] pt-2">
      <nav className="pointer-events-auto flex w-full max-w-md items-stretch gap-0.5 rounded-[22px] border border-rule/70 bg-paper/70 p-1.5 shadow-[0_10px_34px_rgb(0_0_0_/_0.18)] backdrop-blur-xl backdrop-saturate-150">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => hapticoSeleccion()}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-0.5 py-1.5 text-[10px] tracking-tight touch-manipulation transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <item.Icono
                aria-hidden
                strokeWidth={active ? 2.2 : 1.8}
                className="size-5 shrink-0"
              />
              <span className={active ? "font-semibold" : undefined}>
                {item.corto ?? item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
