"use client";

import { createContext, useContext, useState } from "react";
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
  return (
    <Ctx.Provider value={{ vista, ir: setVista }}>
      <div className="flex-1 flex flex-col pb-28 sm:pb-32">{children}</div>
      <DemoNav />
    </Ctx.Provider>
  );
}
