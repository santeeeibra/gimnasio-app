"use client";

import { LayoutDashboard, Users, Coins, MessageSquare, Settings } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { SkinMotif } from "@/components/skin-motif";
import { temaToVars, polaridadTema, resolverMotion, type Tema } from "@/lib/tema";

const NAV = [
  { label: "Resumen", Icono: LayoutDashboard },
  { label: "Clientes", Icono: Users },
  { label: "Caja", Icono: Coins },
  { label: "Mensajes", Icono: MessageSquare },
  { label: "Ajustes", Icono: Settings },
];

/** Muestra el acabado con los mismos componentes y medidas de la app. */
export function TemaPreviewCompleto({ tema }: { tema: Tema }) {
  return (
    <section aria-label="Vista previa de apariencia">
      <p className="mb-2 text-[13px] font-medium text-ink-soft">Vista previa de apariencia</p>
      <p className="mb-3 text-xs text-ink-soft">Datos de muestra. La distribución y los accesos de tu gimnasio se conservan.</p>
      <div
        style={temaToVars(tema)}
        data-estilo-visual={tema.estiloVisual}
        data-theme-polarity={polaridadTema(tema)}
        data-motion={resolverMotion(tema)}
        className="skin-app skin-preview flex h-[460px] max-h-[65vh] min-h-[320px] flex-col overflow-hidden rounded-[16px] border border-rule bg-paper text-ink"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-rule bg-paper px-4 py-3">
          <span className="font-display text-sm font-semibold">Mi Gimnasio</span>
          <span className="text-xs text-ink-soft">Vista móvil</span>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 font-sans">
          <div>
            <p className="text-xs text-ink-soft">Mostrador</p>
            <h2 className="mt-1 font-display text-2xl">Todo listo para entrenar</h2>
          </div>
          <div className="skin-metric futurista-fondo rounded-[16px] border border-rule bg-paper-2 p-4">
            <SkinMotif />
            <p className="text-xs text-ink-soft">Socios al día</p>
            <p className="skin-metric-value mt-2 text-5xl leading-none tabular-nums text-ink">42</p>
            <p className="mt-2 text-xs text-ok">Cuotas vigentes</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="skin-tile rounded-[16px] border border-rule bg-paper-2 p-3">
              <p className="font-display text-xl tabular-nums">24</p>
              <p className="mt-1 text-xs text-ink-soft">Entradas hoy</p>
            </div>
            <div className="skin-tile rounded-[16px] border border-rule bg-paper-2 p-3">
              <p className="font-display text-xl tabular-nums text-warn">3</p>
              <p className="mt-1 text-xs text-ink-soft">Cuotas por vencer</p>
            </div>
          </div>
          <div className="rounded-[16px] border border-rule bg-paper-2 p-3">
            <p className="text-sm font-medium">Lucía Fernández</p>
            <p className="mt-1 text-xs text-ink-soft">Vence en 12 días</p>
          </div>
          <Button type="button" variant="volt" className="w-full" aria-disabled="true">Registrar pago · Muestra</Button>
          <Field label="Buscar cliente" placeholder="Nombre o DNI" readOnly tabIndex={-1} />
        </div>
        <nav aria-label="Navegación de muestra" className="flex shrink-0 border-t border-rule bg-paper p-1">
          {NAV.map(({ label, Icono }, i) => (
            <span key={label} className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] text-[10px] ${i === 0 ? "bg-accent-weak text-accent" : "text-ink-soft"}`}>
              <Icono aria-hidden className="size-5" />
              {label}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
