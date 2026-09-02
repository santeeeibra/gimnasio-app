"use client";

import { temaToVars, type Tema } from "@/lib/tema";

/** Preview expandido con maqueta completa de la app */
export function TemaPreviewCompleto({ tema }: { tema: Tema }) {
  const vars = temaToVars(tema);

  // Tamaño del número héroe según densidad
  const heroSize = {
    compact: "text-5xl",
    comfortable: "text-6xl",
    spacious: "text-7xl",
  }[tema.densidad];

  // Padding según espaciado (visual aproximado)
  const cardPadding = {
    compact: "p-2.5",
    normal: "p-3",
    spacious: "p-4",
  }[tema.espaciado];

  return (
    <div>
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        Vista previa
      </span>
      <div
        style={vars}
        data-estilo-visual={tema.estiloVisual}
        className="rounded-lg border-2 border-[color:var(--rule)] overflow-hidden bg-[color:var(--paper)] shadow-lg h-[calc(100vh-8rem)] max-h-[600px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--paper-2)] border-b border-[color:var(--rule)]">
          <span
            className="font-display text-sm font-semibold text-[color:var(--ink)]"
            style={{ fontFamily: "var(--app-font-display)" }}
          >
            Mi Gimnasio
          </span>
          <button className="text-xs text-[color:var(--ink-soft)] underline underline-offset-2">
            Salir
          </button>
        </div>

        {/* Navegación móvil (top) */}
        {tema.navegacionMovil === "top" && (
          <div className="flex border-b border-[color:var(--rule)] bg-[color:var(--paper)]">
            <NavItem label="Panel" active />
            <NavItem label="Clientes" />
            <NavItem label="Mensajes" />
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans" style={{ fontFamily: "var(--app-font-sans)" }}>
          {/* Número héroe */}
          <div>
            <p
              className={`font-display tracking-tight ${heroSize} text-[#2f7d4f] leading-none`}
              style={{ 
                fontFamily: "var(--app-font-display)",
                fontSize: `calc(${heroSize === "text-5xl" ? "3rem" : heroSize === "text-6xl" ? "3.75rem" : "4.5rem"} * var(--font-scale))`,
              }}
            >
              42
            </p>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]" style={{ fontSize: `calc(0.875rem * var(--font-scale))` }}>
              clientes al día
            </p>
          </div>

          {/* Card de cliente */}
          <div
            className={`${cardPadding} border border-[color:var(--rule)] border-l-2 border-l-[color:var(--volt)] bg-[color:var(--paper-2)]`}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <p className="text-sm font-medium text-[color:var(--ink)]" style={{ fontSize: `calc(0.875rem * var(--font-scale))` }}>
              Lucía Fernández
            </p>
            <p className="text-xs text-[color:var(--ink-soft)] mt-1" style={{ fontSize: `calc(0.75rem * var(--font-scale))` }}>
              Vence en 12 días
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`${cardPadding} border border-[color:var(--rule)] bg-[color:var(--paper-2)]`}
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <p className="font-display text-xl font-semibold text-[color:var(--ink)]" style={{ fontFamily: "var(--app-font-display)" }}>
                24
              </p>
              <p className="text-xs text-[color:var(--ink-soft)] mt-1" style={{ fontSize: `calc(0.75rem * var(--font-scale))` }}>
                Activos
              </p>
            </div>
            <div
              className={`${cardPadding} border border-[color:var(--rule)] border-l-2 border-l-[#c1362f] bg-[color:var(--paper-2)]`}
              style={{ borderRadius: "var(--radius-md)" }}
            >
              <p className="font-display text-xl font-semibold text-[#c1362f]" style={{ fontFamily: "var(--app-font-display)" }}>
                3
              </p>
              <p className="text-xs text-[color:var(--ink-soft)] mt-1" style={{ fontSize: `calc(0.75rem * var(--font-scale))` }}>
                Por vencer
              </p>
            </div>
          </div>

          {/* Botón */}
          <button
            className="w-full h-10 bg-[color:var(--volt)] text-[color:var(--volt-ink)] font-medium text-sm"
            style={{ 
              borderRadius: "var(--radius-md)",
              fontSize: `calc(0.875rem * var(--font-scale))`,
            }}
          >
            Registrar pago
          </button>

          {/* Input */}
          <input
            className="w-full h-10 px-3 border border-[color:var(--rule)] bg-[color:var(--paper)] text-sm"
            placeholder="Buscar cliente…"
            readOnly
            style={{ 
              borderRadius: "var(--radius-md)",
              fontSize: `calc(0.875rem * var(--font-scale))`,
            }}
          />

          {/* Badge */}
          <div
            className={`${cardPadding} border border-[color:var(--rule)] border-l-2 border-l-[color:var(--volt)] bg-[color:var(--paper-2)]`}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-[color:var(--volt)] text-[color:var(--volt-ink)]"
                style={{ 
                  borderRadius: "var(--radius-sm)",
                  fontSize: `calc(0.625rem * var(--font-scale))`,
                }}
              >
                nuevo
              </span>
              <p className="text-sm font-medium text-[color:var(--ink)]" style={{ fontSize: `calc(0.875rem * var(--font-scale))` }}>
                Mensaje de cliente
              </p>
            </div>
          </div>
        </div>

        {/* Navegación bottom */}
        {tema.navegacionMovil === "bottom" && (
          <nav className="flex border-t border-[color:var(--rule)] bg-[color:var(--paper)]">
            <NavItem label="Panel" active />
            <NavItem label="Clientes" />
            <NavItem label="Mensajes" />
          </nav>
        )}

        {/* Indicador sidebar */}
        {tema.navegacionMovil === "sidebar" && (
          <div className="flex items-center justify-center py-3 border-t border-[color:var(--rule)] bg-[color:var(--paper-2)]">
            <p className="text-xs text-[color:var(--ink-soft)]">☰ Menú lateral deslizable</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="relative flex-1 flex flex-col items-center gap-1 py-2.5">
      <span
        className={`absolute top-0 h-0.5 w-8 rounded-full ${
          active ? "bg-[color:var(--volt)]" : "bg-transparent"
        }`}
      />
      <span
        className={`text-[11px] ${
          active ? "text-[color:var(--ink)] font-medium" : "text-[color:var(--ink-soft)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
