"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Calculator } from "lucide-react";
import { hapticoSeleccion, hapticoImpactoSuave } from "@/lib/ui/hapticos";

// Discos estándar disponibles en un gimnasio, de mayor a menor.
const DISCOS_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

// Colores estándar de placas olímpicas (convención internacional / gimnasio).
const DISCO_COLOR: Record<(typeof DISCOS_KG)[number], string> = {
  25: "#dc2626", // rojo
  20: "#2563eb", // azul
  15: "#eab308", // amarillo
  10: "#16a34a", // verde
  5: "#f8fafc", // blanco
  2.5: "#0f172a", // negro
  1.25: "#94a3b8", // gris (fraccional)
};

const DISCO_ANCHO: Record<(typeof DISCOS_KG)[number], number> = {
  25: 18,
  20: 16,
  15: 14,
  10: 12,
  5: 10,
  2.5: 8,
  1.25: 6,
};

const DISCO_ALTO: Record<(typeof DISCOS_KG)[number], number> = {
  25: 88,
  20: 78,
  15: 68,
  10: 60,
  5: 46,
  2.5: 38,
  1.25: 32,
};

type TipoBarra = "olimpica" | "liviana" | "wz" | "multipower" | "prensa";

const BARRAS: { id: TipoBarra; label: string; kg: number }[] = [
  { id: "olimpica", label: "Olímpica", kg: 20 },
  { id: "liviana", label: "Liviana", kg: 15 },
  { id: "wz", label: "Barra W/Z", kg: 10 },
  { id: "multipower", label: "Multipower", kg: 25 },
  { id: "prensa", label: "Prensa 45°", kg: 30 },
];

interface DesgloseDisco {
  peso: (typeof DISCOS_KG)[number];
  cantidad: number;
}

function calcularDesglose(pesoPorLado: number): {
  discos: DesgloseDisco[];
  restante: number;
} {
  let restante = Math.max(0, pesoPorLado);
  const discos: DesgloseDisco[] = [];
  for (const disco of DISCOS_KG) {
    let cantidad = 0;
    // Tolerancia para errores de coma flotante.
    while (restante - disco >= -0.001) {
      cantidad++;
      restante = Math.round((restante - disco) * 100) / 100;
    }
    if (cantidad > 0) discos.push({ peso: disco, cantidad });
  }
  return { discos, restante: Math.max(0, restante) };
}

interface CalculadoraDiscosModalProps {
  open: boolean;
  onClose: () => void;
  pesoInicial?: number;
  ejercicioNombre?: string;
}

export function CalculadoraDiscosModal({
  open,
  onClose,
  pesoInicial = 20,
  ejercicioNombre,
}: CalculadoraDiscosModalProps) {
  const [mounted, setMounted] = useState(false);
  const [barra, setBarra] = useState<TipoBarra>(() => {
    if (ejercicioNombre) {
      const nom = ejercicioNombre.toLowerCase();
      if (nom.includes("prensa") || nom.includes("leg press") || nom.includes("hack")) {
        return "prensa";
      }
      if (nom.includes("w") || nom.includes("ez") || nom.includes("curl w") || nom.includes("biceps")) {
        return "wz";
      }
      if (nom.includes("multipower") || nom.includes("smith")) {
        return "multipower";
      }
    }
    return "olimpica";
  });
  const [pesoTotal, setPesoTotal] = useState(pesoInicial);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      const defaultBar = ejercicioNombre
        ? (() => {
            const nom = ejercicioNombre.toLowerCase();
            if (nom.includes("prensa") || nom.includes("leg press") || nom.includes("hack")) return "prensa";
            if (nom.includes("w") || nom.includes("ez") || nom.includes("curl w") || nom.includes("biceps")) return "wz";
            if (nom.includes("multipower") || nom.includes("smith")) return "multipower";
            return "olimpica";
          })()
        : "olimpica";

      const barKg = BARRAS.find((b) => b.id === defaultBar)?.kg ?? 20;
      setBarra(defaultBar);
      setPesoTotal(pesoInicial > 0 ? Math.max(pesoInicial, barKg) : barKg);
    }
  }, [open, pesoInicial, ejercicioNombre]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    const scrollOrig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = scrollOrig;
    };
  }, [open, onClose]);

  const barraKg = BARRAS.find((b) => b.id === barra)?.kg ?? 20;
  const pesoPorLado = Math.max(0, (pesoTotal - barraKg) / 2);
  const { discos, restante } = useMemo(
    () => calcularDesglose(pesoPorLado),
    [pesoPorLado],
  );

  function ajustarPeso(delta: number) {
    hapticoSeleccion();
    setPesoTotal((prev) => Math.max(barraKg, Math.round((prev + delta) * 100) / 100));
  }

  function elegirBarra(id: TipoBarra) {
    hapticoSeleccion();
    setBarra(id);
    const targetKg = BARRAS.find((b) => b.id === id)?.kg ?? 20;
    if (pesoTotal < targetKg) {
      setPesoTotal(targetKg);
    }
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Calculadora de discos"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[22px] border border-rule bg-paper/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col gap-4 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent">
              <Calculator className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink leading-tight truncate">
                Calculadora de discos
              </h2>
              {ejercicioNombre ? (
                <p className="text-[11px] text-ink-soft truncate">{ejercicioNombre}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="size-9 shrink-0 grid place-items-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Selector de barra */}
        <div className="grid grid-cols-2 gap-2">
          {BARRAS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => elegirBarra(b.id)}
              className={`h-11 rounded-[12px] border px-3 text-xs font-semibold transition-[transform,color,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                b.id === "prensa" ? "col-span-2" : ""
              } ${
                barra === b.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-rule bg-paper-2 text-ink-soft"
              }`}
            >
              {b.label}
              <span className="ml-1 font-mono tabular-nums opacity-70">
                {b.kg}kg
              </span>
            </button>
          ))}
        </div>

        {/* Control de peso total */}
        <div className="flex items-center justify-between gap-2 rounded-[14px] border border-rule bg-paper-2 p-2.5">
          <button
            type="button"
            onClick={() => ajustarPeso(-2.5)}
            className="size-9 rounded-[10px] border border-rule bg-paper text-sm font-bold text-ink active:scale-90 transition-transform"
            aria-label="Restar 2.5 kg"
          >
            −
          </button>
          <div className="text-center leading-none">
            <span className="font-mono text-2xl font-extrabold tabular-nums text-ink">
              {pesoTotal}
            </span>
            <span className="ml-1 text-xs font-semibold text-ink-soft">kg total</span>
          </div>
          <button
            type="button"
            onClick={() => ajustarPeso(2.5)}
            className="size-9 rounded-[10px] border border-rule bg-paper text-sm font-bold text-ink active:scale-90 transition-transform"
            aria-label="Sumar 2.5 kg"
          >
            +
          </button>
        </div>

        {/* Visualización gráfica de la barra */}
        <div className="flex flex-col items-center gap-2 py-1">
          <BarraVisual barra={barra} discos={discos} />
          <div className="flex items-baseline gap-1.5 font-mono text-sm tabular-nums text-ink-soft">
            <span className="font-bold text-ink">{pesoPorLado.toFixed(2)}</span>
            <span>kg por lado</span>
          </div>
        </div>

        {/* Desglose numérico */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            Discos por lado {barra === "prensa" ? "(prensa)" : ""}
          </p>
          {discos.length === 0 ? (
            <p className="text-xs text-ink-soft">
              {barra === "prensa"
                ? "Solo el carro base de la prensa, sin discos."
                : "Solo la barra, sin discos."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {discos.map((d) => (
                <span
                  key={d.peso}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-2.5 py-1 text-xs"
                >
                  <span
                    className="inline-block size-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: DISCO_COLOR[d.peso] }}
                    aria-hidden
                  />
                  <span className="font-mono font-bold tabular-nums text-ink">
                    {d.cantidad}×{d.peso}
                  </span>
                  <span className="text-ink-soft">kg</span>
                </span>
              ))}
            </div>
          )}
          {restante > 0.01 ? (
            <p className="text-[11px] font-medium text-red-500">
              No se puede completar exacto: sobran {restante.toFixed(2)} kg por lado
              con los discos disponibles.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.getElementById("portal-root") ?? document.body,
  );
}

function BarraVisual({
  barra,
  discos,
}: {
  barra: TipoBarra;
  discos: DesgloseDisco[];
}) {
  const pila = discos.flatMap((d) => Array.from({ length: d.cantidad }, () => d.peso));

  const renderDiscosLeft = () => (
    <div className="flex items-center z-10">
      {[...pila].reverse().map((peso, i) => (
        <div
          key={`l-${i}`}
          className="rounded-[2px] border border-black/20 shrink-0 shadow-sm"
          style={{
            width: DISCO_ANCHO[peso],
            height: DISCO_ALTO[peso],
            backgroundColor: DISCO_COLOR[peso],
            marginRight: -1,
          }}
        />
      ))}
    </div>
  );

  const renderDiscosRight = () => (
    <div className="flex items-center z-10">
      {pila.map((peso, i) => (
        <div
          key={`r-${i}`}
          className="rounded-[2px] border border-black/20 shrink-0 shadow-sm"
          style={{
            width: DISCO_ANCHO[peso],
            height: DISCO_ALTO[peso],
            backgroundColor: DISCO_COLOR[peso],
            marginLeft: -1,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="relative flex items-center justify-center min-h-[110px] w-full px-2 py-3 bg-paper-2/40 rounded-[16px] border border-rule/60 overflow-hidden select-none">
      {barra === "wz" && (
        <div className="flex items-center justify-center">
          {renderDiscosLeft()}
          <div className="h-4 w-1.5 bg-ink-soft/80 rounded-l-[1px] shrink-0" />
          <div className="w-20 sm:w-24 h-8 shrink-0 flex items-center justify-center text-ink-soft">
            <svg
              viewBox="0 0 100 30"
              className="w-full h-full text-ink-soft/90 overflow-visible"
              fill="none"
            >
              <path
                d="M 0,15 L 15,15 L 28,7 L 44,23 L 56,7 L 72,23 L 85,15 L 100,15"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="h-4 w-1.5 bg-ink-soft/80 rounded-r-[1px] shrink-0" />
          {renderDiscosRight()}
        </div>
      )}

      {barra === "multipower" && (
        <div className="relative flex items-center justify-center w-full">
          <div className="absolute inset-y-0 left-2 w-1 border-r-2 border-dashed border-accent/40 flex flex-col justify-between py-1" />
          <div className="absolute inset-y-0 right-2 w-1 border-l-2 border-dashed border-accent/40 flex flex-col justify-between py-1" />

          <div className="flex items-center">
            {renderDiscosLeft()}
            <div className="h-4 w-2 rounded-l-[2px] bg-ink-soft/80 shrink-0" />
            <div className="relative h-2 w-20 sm:w-24 bg-gradient-to-r from-ink-soft/60 via-ink-soft to-ink-soft/60 shrink-0 flex items-center justify-around">
              <div className="w-1.5 h-3.5 -mt-2.5 bg-ink/80 rounded-t-[1px]" />
              <div className="w-1.5 h-3.5 -mt-2.5 bg-ink/80 rounded-t-[1px]" />
            </div>
            <div className="h-4 w-2 rounded-r-[2px] bg-ink-soft/80 shrink-0" />
            {renderDiscosRight()}
          </div>
        </div>
      )}

      {barra === "prensa" && (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="flex items-center justify-center">
            {renderDiscosLeft()}
            <div className="h-3 w-3 bg-amber-500/80 rounded-l-[2px] shrink-0 border-y border-l border-amber-600/50" />
            <div className="mx-1 px-3 py-1.5 rounded-[12px] bg-gradient-to-b from-paper-2 via-paper to-paper-2 border border-rule shadow-sm flex flex-col items-center justify-center shrink-0 min-w-[100px]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                <span className="inline-block size-1.5 rounded-full bg-accent animate-pulse" />
                Prensa 45°
              </div>
              <span className="text-[9.5px] font-mono font-medium text-ink-soft">
                Carro 30kg
              </span>
            </div>
            <div className="h-3 w-3 bg-amber-500/80 rounded-r-[2px] shrink-0 border-y border-r border-amber-600/50" />
            {renderDiscosRight()}
          </div>
        </div>
      )}

      {barra === "olimpica" && (
        <div className="flex items-center justify-center">
          {renderDiscosLeft()}
          <div className="h-4 w-2 rounded-l-[2px] bg-ink-soft/80 shrink-0" />
          <div className="h-2 w-24 sm:w-28 bg-gradient-to-r from-ink-soft/50 via-ink-soft/80 to-ink-soft/50 shrink-0 rounded-sm" />
          <div className="h-4 w-2 rounded-r-[2px] bg-ink-soft/80 shrink-0" />
          {renderDiscosRight()}
        </div>
      )}

      {barra === "liviana" && (
        <div className="flex items-center justify-center">
          {renderDiscosLeft()}
          <div className="h-3 w-1.5 rounded-l-[1px] bg-ink-soft/70 shrink-0" />
          <div className="h-1.5 w-20 sm:w-24 bg-ink-soft/60 shrink-0" />
          <div className="h-3 w-1.5 rounded-r-[1px] bg-ink-soft/70 shrink-0" />
          {renderDiscosRight()}
        </div>
      )}
    </div>
  );
}

/** Pill táctil que abre la calculadora. Úsala junto al peso del ejercicio. */
export function PillCalculadoraDiscos({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticoImpactoSuave();
        onOpen();
      }}
      className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-2.5 py-1 text-[11px] text-ink-soft transition-[transform,color,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      aria-label="Calculadora de discos"
    >
      <Calculator className="size-3.5" />
      <b className="font-[700] text-ink">Discos</b>
    </button>
  );
}
