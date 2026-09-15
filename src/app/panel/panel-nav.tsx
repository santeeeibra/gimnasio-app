"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions";
import { pillClasses } from "@/components/ui";
import { hapticoSeleccion, hapticoImpactoMedio } from "@/lib/ui/hapticos";
import { entrarComoAction } from "@/app/admin/impersonar-actions";
import {
  Award,
  Coins,
  CreditCard,
  Dumbbell,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Scale,
  ScanLine,
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
  seccion?: "operativo" | "gestion" | "sistema";
  badge?: string;
  Icono: LucideIcon;
};

export function getNavItems(tipoCuenta: string = "gym", rol: string = "dueno"): NavItem[] {
  if (rol === "staff") {
    return [
      { href: "/panel", label: "Mostrador", corto: "Resumen", seccion: "operativo", Icono: LayoutDashboard },
      { href: "/panel/clientes", label: "Clientes", seccion: "operativo", Icono: Users },
      { href: "/panel/caja", label: "Caja y Turnos", corto: "Caja", seccion: "operativo", Icono: Coins },
      { href: "/checkin", label: "Modo Check-in", corto: "Check-in", seccion: "operativo", soloDesktop: true, badge: "Elite", Icono: ScanLine },
      { href: "/panel/mensajes", label: "Mensajes", seccion: "operativo", Icono: MessageSquare },
    ];
  }

  if (tipoCuenta === "individual") {
    return [
      { href: "/panel", label: "Resumen", seccion: "operativo", Icono: LayoutDashboard },
      { href: "/mi/rutina", label: "Mi Rutina", corto: "Rutina", seccion: "operativo", Icono: Dumbbell },
      { href: "/mi/peso", label: "Mi Peso", corto: "Peso", seccion: "operativo", Icono: Scale },
      { href: "/panel/plantillas", label: "Compartir rutina", corto: "Compartir", seccion: "gestion", Icono: Share2 },
      { href: "/panel/plan", label: "Mi plan", soloDesktop: true, seccion: "sistema", Icono: CreditCard },
      { href: "/panel/ajustes", label: "Ajustes", seccion: "sistema", Icono: Settings },
    ];
  }

  if (tipoCuenta === "negocio_liviano") {
    return [
      { href: "/panel", label: "Mostrador", corto: "Resumen", seccion: "operativo", Icono: LayoutDashboard },
      { href: "/panel/clientes", label: "Clientes", seccion: "operativo", Icono: Users },
      { href: "/panel/caja", label: "Caja Turno", seccion: "operativo", Icono: Coins },
      { href: "/checkin", label: "Modo Check-in", corto: "Check-in", seccion: "operativo", soloDesktop: true, badge: "Elite", Icono: ScanLine },
      { href: "/panel/mensajes", label: "Mensajes", seccion: "operativo", Icono: MessageSquare },
      { href: "/panel/plan", label: "Mi plan", soloDesktop: true, seccion: "sistema", Icono: CreditCard },
      { href: "/panel/ajustes", label: "Ajustes", seccion: "sistema", Icono: Settings },
    ];
  }

  // gym completo
  return [
    { href: "/panel", label: "Mostrador", corto: "Resumen", seccion: "operativo", Icono: LayoutDashboard },
    { href: "/panel/clientes", label: "Clientes", seccion: "operativo", Icono: Users },
    { href: "/panel/caja", label: "Caja y Turnos", corto: "Caja", seccion: "operativo", Icono: Coins },
    { href: "/checkin", label: "Modo Check-in", corto: "Check-in", seccion: "operativo", soloDesktop: true, badge: "Elite", Icono: ScanLine },
    { href: "/panel/planes", label: "Planes de socios", corto: "Planes", seccion: "gestion", Icono: Tags },
    { href: "/panel/mensajes", label: "Mensajes", seccion: "gestion", Icono: MessageSquare },
    { href: "/panel/buzon", label: "Buzón", seccion: "gestion", Icono: Inbox },
    { href: "/panel/ingresos", label: "Ingresos", seccion: "gestion", Icono: Wallet },
    { href: "/panel/plantillas", label: "Compartir rutina", corto: "Compartir", soloDesktop: true, seccion: "gestion", Icono: Share2 },
    { href: "/panel/partner", label: "Partner", corto: "Partner", soloDesktop: true, seccion: "gestion", Icono: Award },
    { href: "/panel/plan", label: "Mi plan", soloDesktop: true, seccion: "sistema", Icono: CreditCard },
    { href: "/panel/ajustes", label: "Ajustes", seccion: "sistema", Icono: Settings },
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
      className={`${size} shrink-0 overflow-hidden rounded-[8px] border border-rule bg-paper-2 shadow-xs`}
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

/** Switch de 1 click entre dueño/socio del gym de testing "sante", sin
 * volver a /admin. Solo se renderiza cuando el layout lo habilita. */
function QuickSwitchSante({
  duenoId,
  socioId,
  rolActual,
  compacto = false,
}: {
  duenoId: string;
  socioId: string;
  rolActual: string;
  compacto?: boolean;
}) {
  const esDueno = rolActual !== "cliente";
  const base = compacto
    ? "px-2.5 py-1 text-[11px]"
    : "h-8.5 px-3 text-xs";

  return (
    <div className={`inline-flex overflow-hidden rounded-[8px] border border-rule ${compacto ? "" : "w-full"}`}>
      <form
        action={entrarComoAction}
        className={compacto ? "" : "flex-1"}
        onSubmit={() => hapticoImpactoMedio()}
      >
        <input type="hidden" name="profile_id" value={duenoId} />
        <button
          type="submit"
          disabled={esDueno}
          className={`${base} w-full font-medium transition-colors ${
            esDueno ? "bg-ink text-paper" : "bg-paper text-ink-soft hover:bg-paper-2"
          }`}
        >
          Dueño
        </button>
      </form>
      <form
        action={entrarComoAction}
        className={compacto ? "" : "flex-1"}
        onSubmit={() => hapticoImpactoMedio()}
      >
        <input type="hidden" name="profile_id" value={socioId} />
        <button
          type="submit"
          disabled={!esDueno}
          className={`${base} w-full border-l border-rule font-medium transition-colors ${
            !esDueno ? "bg-ink text-paper" : "bg-paper text-ink-soft hover:bg-paper-2"
          }`}
        >
          Socio
        </button>
      </form>
    </div>
  );
}

const SECCION_TITULOS: Record<string, string> = {
  operativo: "Mostrador",
  gestion: "Gestión",
  sistema: "Configuración",
};

/** Desktop: columna fija a la izquierda con iconos grandes y legibles. */
export function PanelSidebar({
  nombre,
  dueno,
  logo,
  tipoCuenta = "gym",
  esSuper = false,
  rol = "dueno",
  switchSante = null,
}: {
  nombre?: string | null;
  dueno: string;
  logo?: string | null;
  tipoCuenta?: string;
  esSuper?: boolean;
  rol?: string;
  switchSante?: { duenoId: string; socioId: string } | null;
}) {
  const pathname = usePathname();
  const items = getNavItems(tipoCuenta, rol);

  // Agrupar items por sección si corresponde
  const secciones = ["operativo", "gestion", "sistema"] as const;

  return (
    <aside className="hidden md:flex md:flex-col justify-between border-r border-rule p-4 md:sticky md:top-0 md:h-screen bg-paper select-none">
      <div className="flex flex-col gap-5 min-h-0">
        {/* Marca y gym */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <LogoMark logo={logo} size="size-10" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight truncate text-ink">{nombre}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-ink-soft truncate">{dueno}</p>
              {rol === "staff" ? (
                <span className="rounded bg-paper-3 px-1.5 py-0.2 text-[9px] font-bold text-ink-soft border border-rule uppercase">
                  Staff
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Navegación agrupada */}
        <nav className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1">
          {secciones.map((secKey) => {
            const secItems = items.filter((i) => i.seccion === secKey);
            if (secItems.length === 0) return null;

            return (
              <div key={secKey} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70 px-2.5 pb-0.5">
                  {SECCION_TITULOS[secKey]}
                </span>
                {secItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      aria-current={active ? "page" : undefined}
                      className={`px-3 py-2 rounded-[10px] text-[13.5px] transition-colors duration-150 inline-flex items-center justify-between ${
                        active
                          ? "bg-ink text-paper font-semibold shadow-xs"
                          : "text-ink-soft hover:bg-paper-2 hover:text-ink font-medium"
                      }`}
                    >
                      <div className="inline-flex items-center gap-3 min-w-0">
                        <item.Icono aria-hidden strokeWidth={active ? 2.2 : 2} className="size-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                          active
                            ? "bg-volt/30 text-volt border border-volt/40"
                            : "bg-volt/15 text-ink border border-volt/25"
                        }`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Pie de sidebar */}
      <div className="flex flex-col gap-2 pt-3 border-t border-rule mt-2">
        {switchSante ? (
          <QuickSwitchSante
            duenoId={switchSante.duenoId}
            socioId={switchSante.socioId}
            rolActual={rol}
          />
        ) : null}
        <a
          href={whatsappReporteUrl(nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8.5 items-center justify-center rounded-[8px] border border-rule px-3 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper-2 transition-colors"
        >
          Reportar problema
        </a>
        {esSuper ? (
          <Link href="/admin" className={`h-8.5 text-xs ${pillClasses.neutra}`}>
            <LifeBuoy aria-hidden strokeWidth={2} className="size-3.5" />
            Soporte (dev)
          </Link>
        ) : null}
        <form action={logout}>
          <button className={`w-full h-8.5 text-xs ${pillClasses.destructiva}`}>Salir</button>
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
  rol = "dueno",
}: {
  nombre?: string | null;
  logo?: string | null;
  esSuper?: boolean;
  rol?: string;
}) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-rule bg-paper/95 backdrop-blur-md px-5 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
      <div className="flex min-w-0 items-center gap-2">
        <LogoMark logo={logo} size="size-7" />
        <p className="font-display text-base leading-tight truncate">{nombre}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rol !== "staff" ? (
          <Link
            href="/panel/partner"
            className="px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 dark:text-[#10e7a0] border border-emerald-500/30 active:scale-95 transition-all"
          >
            <Award className="size-3" />
            <span>Partner</span>
          </Link>
        ) : null}
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
export function PanelBottomNav({
  tipoCuenta = "gym",
  rol = "dueno",
}: {
  tipoCuenta?: string;
  rol?: string;
}) {
  const pathname = usePathname();
  const items = getNavItems(tipoCuenta, rol).filter((i) => !i.soloDesktop);

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
