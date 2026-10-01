"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoNav } from "./demo-nav";

export type DemoVista = "inicio" | "rutina" | "peso";

const Ctx = createContext<{ vista: DemoVista; ir: (v: DemoVista) => void }>({
  vista: "inicio",
  ir: () => {},
});

export const useDemoVista = () => useContext(Ctx);

/**
 * Cáscara del demo: gobierna qué "pantalla" se ve (Inicio / Rutina / Peso) sin
 * tocar la URL ni el router, para que la navegación se sienta instantánea como
 * en la app real. El tema y el chrome los pone `layout.tsx`.
 */
export function DemoShell({ children }: { children: React.ReactNode }) {
  const [vista, setVista] = useState<DemoVista>("inicio");
  const pathname = usePathname();
  return (
    <Ctx.Provider value={{ vista, ir: setVista }}>
      <nav aria-label="Elegir demo" className="flex gap-2 border-b border-rule p-3">
        {[
          { href: "/demo/presentacion", label: "Conocé SysGym" },
          { href: "/demo/dueno", label: "Dueño" },
          { href: "/demo", label: "Socio" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-[12px] px-2 text-center text-xs font-semibold ${pathname === href ? "bg-volt text-volt-ink" : "bg-paper-2 text-ink-soft"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 flex flex-col pb-28 sm:pb-32">{children}</div>
      {pathname === "/demo" && <DemoNav />}
    </Ctx.Provider>
  );
}
