"use client";

/* ---- helpers de color (mezcla hex + contraste) ---- */

function hexToRgb(h: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function luminance(h: string): number {
  const [r, g, b] = hexToRgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readableOn(bg: string): string {
  return luminance(bg) > 0.42 ? "#16181d" : "#ffffff";
}

/* ---- preview ---- */

export function TemaPreview({
  primario,
  acento,
  fondo,
}: {
  primario: string;
  acento: string;
  fondo: string;
}) {
  const vars = {
    "--paper": fondo,
    "--paper-2": mix(fondo, primario, 0.06),
    "--rule": mix(fondo, primario, 0.14),
    "--ink": primario,
    "--ink-soft": mix(primario, fondo, 0.42),
    "--volt": acento,
    "--volt-ink": readableOn(acento),
  } as React.CSSProperties;

  return (
    <div>
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        Vista previa
      </span>
      <div
        style={vars}
        className="rounded-[6px] border border-[color:var(--rule)] overflow-hidden [&_*]:transition-[background-color,color,border-color] [&_*]:duration-150 [&_*]:ease-out"
      >
        {/* barra superior */}
        <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--paper-2)] border-b border-[color:var(--rule)]">
          <span
            className="font-display text-sm font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Mi Gimnasio
          </span>
          <span className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
            Dueño
          </span>
        </div>

        <div className="p-4 space-y-3 bg-[color:var(--paper)]">
          {/* stat + alerta */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-[5px] border border-[color:var(--rule)] p-3">
              <p
                className="font-display text-xl font-semibold"
                style={{ color: "var(--ink)" }}
              >
                24
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                Clientes activos
              </p>
            </div>
            <div className="flex-1 rounded-[5px] border-l-2 border-l-[#c1362f] border border-[color:var(--rule)] p-3">
              <p className="font-display text-xl font-semibold text-[#c1362f]">
                3
              </p>
              <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
                Cuotas por vencer
              </p>
            </div>
          </div>

          {/* fila cliente */}
          <div className="rounded-[5px] border border-[color:var(--rule)] border-l-2 border-l-[#2f7d4f] px-3 py-2.5">
            <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
              Lucía Fernández
            </p>
            <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>
              Plan Mensual · 18 días restantes
            </p>
          </div>

          {/* botones */}
          <div className="flex gap-2">
            <span
              className="inline-flex h-9 items-center rounded-[5px] px-3 text-[13px] font-medium"
              style={{ background: "var(--ink)", color: "var(--paper)" }}
            >
              Registrar pago
            </span>
            <span
              className="inline-flex h-9 items-center rounded-[5px] border border-[color:var(--rule)] px-3 text-[13px] font-medium"
              style={{ color: "var(--ink)" }}
            >
              Ver ficha
            </span>
          </div>

          {/* mensaje sin leer */}
          <div
            className="rounded-[5px] border border-[color:var(--rule)] border-l-2 px-3 py-2.5"
            style={{ borderLeftColor: "var(--volt)" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "var(--volt)", color: "var(--volt-ink)" }}
              >
                nuevo
              </span>
              <p className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
                Recordatorio de pago
              </p>
            </div>
            <p className="mt-1 text-[11px]" style={{ color: "var(--ink-soft)" }}>
              Tu cuota vence en 5 días. Podés abonar por transferencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
