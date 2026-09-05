"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useActionState,
} from "react";
import { Spinner } from "@/components/ui";
import type { RegistroPeso, PesoState } from "@/lib/peso/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Sonido: click suave con Web Audio API (creado lazy tras gesto del usuario)
// ─────────────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playTick() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Resume si estaba suspendido (política autoplay)
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.025);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

function vibrate(ms = 5) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DrumColumn — una columna de valores tipo "rueda de iOS"
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_H = 48; // alto de cada ítem en px
const VISIBLE = 5; // ítems visibles (el del medio es el seleccionado)
const COL_H = ITEM_H * VISIBLE; // 240px
const PAD = ITEM_H * 2; // relleno top/bottom para centrar primero/último

interface DrumColumnProps {
  items: string[];
  initialIndex: number;
  onChange: (index: number) => void;
  label: string;
  unit?: string;
}

function DrumColumn({ items, initialIndex, onChange, label, unit }: DrumColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevIdx = useRef(initialIndex);
  const isScrolling = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll inicial al valor por defecto
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = initialIndex * ITEM_H;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isScrolling.current = true;

    // Calcular el índice más cercano al centro sin snapear todavía
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));

    if (clamped !== prevIdx.current) {
      prevIdx.current = clamped;
      onChange(clamped);
      playTick();
      vibrate(4);
    }

    // Detectar fin de scroll para limpiar flag
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  }, [items.length, onChange]);

  // Para cada ítem, calcular la rotación 3D en función de la distancia al centro
  // Usamos un IntersectionObserver-free approach: animamos via CSS perspective
  // en el contenedor y los ítems tienen rotateX proporcional a su posición.
  // Lo hacemos con un onScroll que actualiza un CSS custom property.
  const updateRotations = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const centerY = el.scrollTop + COL_H / 2;
    el.querySelectorAll<HTMLElement>("[data-drum-item]").forEach((item, i) => {
      const itemCenterY = PAD + i * ITEM_H + ITEM_H / 2;
      const dist = itemCenterY - centerY;
      // Máxima rotación: ±65° (items a ±2 posiciones)
      const angle = (dist / ITEM_H) * 22;
      const scale = Math.cos((dist / ITEM_H) * (Math.PI / 4));
      const opacity = Math.max(0.15, 1 - Math.abs(dist / ITEM_H) * 0.28);
      // SOLO transform y opacity — compositor-only, 0 layout thrashing
      item.style.transform = `rotateX(${angle}deg) scale(${Math.max(0.75, scale)})`;
      item.style.opacity = String(Math.min(1, opacity));
    });
  }, []);

  const onScroll = useCallback(() => {
    handleScroll();
    updateRotations();
  }, [handleScroll, updateRotations]);

  // Aplicar rotaciones también en mount
  useEffect(() => {
    // Pequeño delay para que el scroll inicial esté asentado
    const t = setTimeout(updateRotations, 50);
    return () => clearTimeout(t);
  }, [updateRotations]);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">
        {label}
      </span>
      <div
        className="relative overflow-hidden rounded-[16px]"
        style={{ height: COL_H, width: 88, perspective: "300px" }}
        aria-label={`Selector de ${label}`}
      >
        {/* Banda de selección central — solo fondo, sin tamaño animado */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10 rounded-[10px] border border-rule/60 bg-paper-2"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />

        {/* Máscara de opacidad top/bottom — compositor (opacity) */}
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              "linear-gradient(to bottom, var(--color-paper, white) 0%, transparent 28%, transparent 72%, var(--color-paper, white) 100%)",
          }}
        />

        {/* Contenedor scrolleable — overflow-y: scroll + scroll-snap */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-scroll"
          style={{
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
            // Webkit hidden scrollbar
            msOverflowStyle: "none",
          }}
          // Accesibilidad: flechas de teclado
          onKeyDown={(e) => {
            const el = scrollRef.current;
            if (!el) return;
            if (e.key === "ArrowUp") el.scrollBy({ top: -ITEM_H, behavior: "smooth" });
            if (e.key === "ArrowDown") el.scrollBy({ top: ITEM_H, behavior: "smooth" });
          }}
          tabIndex={0}
          role="listbox"
          aria-label={label}
        >
          {/* Relleno superior */}
          <div style={{ height: PAD, scrollSnapAlign: "none" }} aria-hidden />

          {items.map((item, i) => (
            <div
              key={i}
              data-drum-item
              role="option"
              aria-selected={i === prevIdx.current}
              onClick={() => {
                const el = scrollRef.current;
                if (el) el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
              }}
              className="flex cursor-pointer items-center justify-center"
              style={{
                height: ITEM_H,
                scrollSnapAlign: "center",
                // will-change solo en la columna activa → se quita cuando el scroll para
                willChange: "transform",
                transformStyle: "preserve-3d",
              }}
            >
              <span
                className="text-[26px] font-bold leading-none tabular-nums text-ink transition-none"
                style={{ fontFamily: "var(--font-hero, system-ui)" }}
              >
                {item}
              </span>
            </div>
          ))}

          {/* Relleno inferior */}
          <div style={{ height: PAD, scrollSnapAlign: "none" }} aria-hidden />
        </div>

        {/* Ocultar scrollbar webkit */}
        <style>{`
          [data-drum-scroll]::-webkit-scrollbar { display: none; }
        `}</style>
      </div>

      {unit && (
        <span className="text-[11px] font-medium text-ink-soft">{unit}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PesoPicker — las dos columnas: enteros + decimal
// ─────────────────────────────────────────────────────────────────────────────
function buildKgItems(min: number, max: number): string[] {
  const out: string[] = [];
  for (let i = min; i <= max; i++) out.push(String(i));
  return out;
}

const DECIMAL_ITEMS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const KG_ITEMS = buildKgItems(20, 300);

interface PesoPickerProps {
  defaultValue?: number; // ej. 75.5
  onChange: (peso: number) => void;
}

export function PesoPicker({ defaultValue = 70, onChange }: PesoPickerProps) {
  const kgInt = Math.min(300, Math.max(20, Math.floor(defaultValue)));
  const kgDec = Math.round((defaultValue - kgInt) * 10);

  const [kgIdx, setKgIdx] = useState(kgInt - 20); // índice en KG_ITEMS
  const [decIdx, setDecIdx] = useState(kgDec); // índice en DECIMAL_ITEMS

  const kgIdxRef = useRef(kgIdx);
  const decIdxRef = useRef(decIdx);

  function onKgChange(idx: number) {
    kgIdxRef.current = idx;
    setKgIdx(idx);
    const peso = parseFloat(`${KG_ITEMS[idx]}.${DECIMAL_ITEMS[decIdxRef.current]}`);
    onChange(peso);
  }

  function onDecChange(idx: number) {
    decIdxRef.current = idx;
    setDecIdx(idx);
    const peso = parseFloat(`${KG_ITEMS[kgIdxRef.current]}.${DECIMAL_ITEMS[idx]}`);
    onChange(peso);
  }

  const peso = parseFloat(`${KG_ITEMS[kgIdx]}.${DECIMAL_ITEMS[decIdx]}`);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Peso actual grande */}
      <div className="text-[42px] font-bold leading-none tracking-tight text-ink tabular-nums"
        style={{ fontFamily: "var(--font-hero, system-ui)" }}
        aria-live="polite"
        aria-atomic="true"
        aria-label={`${peso} kilogramos`}
      >
        {KG_ITEMS[kgIdx]}
        <span className="text-[28px] text-ink-soft">.</span>
        <span className="text-[28px]">{DECIMAL_ITEMS[decIdx]}</span>
        <span className="ml-1 text-[18px] font-medium text-ink-soft">kg</span>
      </div>

      {/* Las dos ruedas */}
      <div className="flex items-end gap-1">
        <DrumColumn
          items={KG_ITEMS}
          initialIndex={kgIdx}
          onChange={onKgChange}
          label="kg"
        />

        {/* Separador decimal */}
        <div className="pb-[calc(48px*2+16px)] text-[26px] font-bold text-ink-soft" aria-hidden>
          .
        </div>

        <DrumColumn
          items={DECIMAL_ITEMS}
          initialIndex={decIdx}
          onChange={onDecChange}
          label="dec"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gráfico de línea canvas
// ─────────────────────────────────────────────────────────────────────────────
import { useRef as useCanvasRef } from "react";

function GraficoPeso({ registros }: { registros: RegistroPeso[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const colorAccent = style.getPropertyValue("--color-accent").trim() || "#3b82f6";
    const colorInkSoft = style.getPropertyValue("--color-ink-soft").trim() || "#888";
    const colorRule = style.getPropertyValue("--color-rule").trim() || "#e5e7eb";

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const datos = [...registros].reverse();

    if (datos.length < 2) {
      ctx.font = "12px system-ui";
      ctx.fillStyle = colorInkSoft;
      ctx.textAlign = "center";
      ctx.fillText("Registrá al menos 2 datos para ver el gráfico", W / 2, H / 2);
      return;
    }

    const padL = 44, padR = 16, padT = 12, padB = 28;
    const gW = W - padL - padR;
    const gH = H - padT - padB;
    const pesos = datos.map((d) => d.peso);
    const minP = Math.min(...pesos);
    const maxP = Math.max(...pesos);
    const rangoP = maxP - minP || 1;
    const toX = (i: number) => padL + (i / (datos.length - 1)) * gW;
    const toY = (p: number) => padT + gH - ((p - minP) / rangoP) * gH;

    ctx.strokeStyle = colorRule;
    ctx.lineWidth = 1;
    for (let t = 0; t <= 4; t++) {
      const y = padT + (gH / 4) * t;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }

    ctx.globalAlpha = 0.08;
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    datos.forEach((d, i) => { i === 0 ? ctx.moveTo(toX(i), toY(d.peso)) : ctx.lineTo(toX(i), toY(d.peso)); });
    ctx.lineTo(toX(datos.length - 1), padT + gH); ctx.lineTo(toX(0), padT + gH); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = colorAccent; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath();
    datos.forEach((d, i) => { i === 0 ? ctx.moveTo(toX(i), toY(d.peso)) : ctx.lineTo(toX(i), toY(d.peso)); });
    ctx.stroke();

    datos.forEach((d, i) => {
      ctx.beginPath(); ctx.arc(toX(i), toY(d.peso), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = colorAccent; ctx.fill();
    });

    ctx.font = "10px system-ui"; ctx.fillStyle = colorInkSoft; ctx.textAlign = "right";
    ctx.fillText(`${maxP} kg`, padL - 4, padT + 4);
    ctx.fillText(`${minP} kg`, padL - 4, padT + gH + 4);

    const fmt = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    ctx.textAlign = "center";
    ctx.fillText(fmt(datos[0].fecha), padL, H - 4);
    if (datos.length > 1) ctx.fillText(fmt(datos[datos.length - 1].fecha), toX(datos.length - 1), H - 4);
  }, [registros]);

  return (
    <canvas ref={canvasRef} className="w-full h-[140px] block" aria-label="Gráfico de evolución del peso corporal" />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardPeso — componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function CardPeso({
  clienteId,
  creadoPor,
  action,
  fetchRegistros,
}: {
  clienteId: string;
  creadoPor: "cliente" | "dueno";
  action: (prev: PesoState, fd: FormData) => Promise<PesoState>;
  fetchRegistros: () => Promise<RegistroPeso[]>;
}) {
  const [registros, setRegistros] = useState<RegistroPeso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pesoSeleccionado, setPesoSeleccionado] = useState<number>(70);
  const pesoRef = useRef(70);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    fetchRegistros()
      .then((data) => {
        setRegistros(data);
        if (data.length > 0) {
          const ultimo = data[0].peso;
          setPesoSeleccionado(ultimo);
          pesoRef.current = ultimo;
        }
      })
      .finally(() => setCargando(false));
  }, [fetchRegistros]);

  // Recargar después de guardar
  useEffect(() => {
    if (state.ok) {
      fetchRegistros().then((data) => {
        setRegistros(data);
      });
    }
  }, [state, fetchRegistros]);

  function handlePickerChange(peso: number) {
    setPesoSeleccionado(peso);
    pesoRef.current = peso;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const registroHoy = registros.find((r) => r.fecha === hoy);

  return (
    <div className="rounded-[16px] border border-rule bg-paper-2 overflow-hidden">
      {/* Encabezado */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-soft">
            Peso corporal
          </h2>
          {registroHoy && (
            <span className="text-[11px] text-ink-soft">
              Registrado hoy:{" "}
              <b className="text-ink" style={{ fontFamily: "var(--font-hero)" }}>
                {registroHoy.peso} kg
              </b>
            </span>
          )}
        </div>

        {/* Picker */}
        <div className="mt-5">
          {cargando ? (
            <div className="flex items-center gap-2 text-sm text-ink-soft py-8 justify-center">
              <Spinner /> Cargando…
            </div>
          ) : (
            <PesoPicker
              defaultValue={registroHoy?.peso ?? (registros[0]?.peso ?? 70)}
              onChange={handlePickerChange}
            />
          )}
        </div>

        {/* Botón guardar */}
        <form
          action={formAction}
          onSubmit={(e) => {
            // Inyectar el valor del picker en el FormData
            const fd = new FormData(e.currentTarget);
            fd.set("peso", String(pesoRef.current));
          }}
          className="mt-5"
        >
          <input type="hidden" name="cliente_id" value={clienteId} />
          <input type="hidden" name="peso" value={pesoSeleccionado} />
          <input type="hidden" name="creado_por" value={creadoPor} />

          <button
            type="submit"
            disabled={pending || cargando}
            className="w-full h-12 rounded-[12px] bg-accent text-accent-ink text-sm font-bold transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {pending ? (
              <>
                <Spinner />
                Guardando…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {registroHoy ? "Actualizar peso de hoy" : "Guardar peso de hoy"}
              </>
            )}
          </button>

          {state.error && (
            <p className="mt-2 text-xs text-danger animate-fade-in text-center">{state.error}</p>
          )}
          {state.ok && (
            <p className="mt-2 text-xs text-ok animate-fade-in text-center font-medium">{state.ok}</p>
          )}
        </form>
      </div>

      {/* Historial colapsado */}
      {!cargando && registros.length > 0 && (
        <details className="group border-t border-rule">
          <summary className="flex cursor-pointer select-none list-none items-center justify-between px-5 py-3 text-[12px] font-medium text-ink-soft hover:text-ink transition-colors [&::-webkit-details-marker]:hidden">
            <span>
              Historial · {registros.length}{" "}
              {registros.length === 1 ? "registro" : "registros"}
            </span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="transition-transform duration-150 group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          <div className="px-5 pb-5 space-y-3 animate-fade-in">
            <div className="rounded-[10px] border border-rule bg-paper p-2">
              <GraficoPeso registros={registros} />
            </div>
            <ul className="divide-y divide-rule rounded-[10px] border border-rule bg-paper overflow-hidden text-sm">
              {registros.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[12px] text-ink-soft">
                    {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                    {r.creado_por === "dueno" && (
                      <span className="ml-1.5 text-[10px] opacity-60">(gym)</span>
                    )}
                  </span>
                  <span className="font-bold text-ink tabular-nums" style={{ fontFamily: "var(--font-hero)" }}>
                    {r.peso} kg
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
