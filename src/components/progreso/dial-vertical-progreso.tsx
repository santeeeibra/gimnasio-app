"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useActionState,
} from "react";
import { Spinner } from "@/components/ui";
import type { ProgresoState } from "@/lib/progreso/actions";
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoExito,
  hapticoError,
} from "@/lib/ui/hapticos";
import { CartelLogro } from "@/components/logros/cartel-logro";
import { tituloRecord } from "@/lib/logros/compartir";
import type { ColoresImagen } from "@/lib/logros/imagen";
import type { ResultadoRecord } from "@/lib/logros/tipos";

// ─────────────────────────────────────────────────────────────────────────────
// DialVerticalProgreso — Dial vertical de regla estilo iOS para cada ejercicio
// Se ubica exactamente debajo de la imagen / GIF (ancho 68px)
// ─────────────────────────────────────────────────────────────────────────────
const PY_PER_STEP = 7; // píxeles por cada 0.5 kg (14px por cada 1.0 kg)
const MIN_KG = 0;
const MAX_KG = 300;

export type TipoEquipoDial = "corporal" | "barra" | "mancuerna" | "polea" | "maquina" | "otro";

export function DialVerticalProgreso({
  ejercicioId,
  action,
  fetchUltimoPeso,
  tipoEquipo = "otro",
  esCorporal: esCorporalLegacy,
  ejercicioNombre,
  gimnasioNombre,
  logoUrl,
  colores,
}: {
  ejercicioId: string;
  action: (prev: ProgresoState, fd: FormData) => Promise<ProgresoState>;
  fetchUltimoPeso: (eid: string) => Promise<{ peso: number; reps: number | null } | null>;
  tipoEquipo?: TipoEquipoDial;
  esCorporal?: boolean;
  /** Datos para el <CartelLogro> de récord. Si faltan, no se ofrece compartir. */
  ejercicioNombre?: string;
  gimnasioNombre?: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const esCorporal = tipoEquipo === "corporal" || Boolean(esCorporalLegacy);
  const esBarra = tipoEquipo === "barra";
  const esMancuerna = tipoEquipo === "mancuerna";
  const esPolea = tipoEquipo === "polea";
  const esMaquina = tipoEquipo === "maquina";

  const pesoInicial = esCorporal ? 0 : 20;
  const [peso, setPeso] = useState<number>(pesoInicial);
  const weightRef = useRef(pesoInicial);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const lastEmittedRef = useRef(pesoInicial);

  const [state, formAction, pending] = useActionState(action, {});
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [logro, setLogro] = useState<ResultadoRecord | null>(null);

  // Cargar último peso registrado como punto de partida
  useEffect(() => {
    fetchUltimoPeso(ejercicioId).then((r) => {
      if (r && r.peso !== undefined && r.peso !== null) {
        setPeso(r.peso);
        weightRef.current = r.peso;
        lastEmittedRef.current = r.peso;
        draw();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioId]);

  // Dibujar regla vertical en canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 68;
    const h = 88;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cy = h / 2;
    const curW = weightRef.current;

    // Rango de marcas visibles
    const halfVisibleKg = (cy / (PY_PER_STEP * 2)) + 2.5;
    const startStep = Math.max(
      MIN_KG * 2,
      Math.floor((curW - halfVisibleKg) * 2)
    );
    const endStep = Math.min(
      MAX_KG * 2,
      Math.ceil((curW + halfVisibleKg) * 2)
    );

    // Dibujar marcas horizontales
    for (let step = startStep; step <= endStep; step++) {
      const kg = step / 2;
      // Empujar arriba aumenta el peso: valores mayores están arriba
      const y = cy - (kg - curW) * 2 * PY_PER_STEP;

      const isMajor = step % 10 === 0; // cada 5 kg (e.g. 20, 25, 30...)
      const isMedium = step % 2 === 0; // cada 1 kg

      if (isMajor) {
        // Marca larga con número
        ctx.fillStyle = "#ff9f0a";
        ctx.fillRect(17, y - 1, 16, 2);

        ctx.fillStyle = "rgba(255, 159, 10, 0.85)";
        ctx.font = "600 9px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Math.round(kg)), 36, y);
      } else if (isMedium) {
        // Marca intermedia
        ctx.fillStyle = "rgba(255, 159, 10, 0.6)";
        ctx.fillRect(17, y - 0.75, 11, 1.5);
      } else {
        // Marca corta (0.5 kg)
        ctx.fillStyle = "rgba(255, 159, 10, 0.3)";
        ctx.fillRect(17, y - 0.5, 7, 1);
      }
    }

    // Puntero central: triángulo naranja apuntando a la derecha (▶) hacia la marca
    ctx.fillStyle = "#ff9f0a";
    ctx.shadowColor = "rgba(255, 159, 10, 0.6)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(14, cy);
    ctx.lineTo(6, cy - 4.5);
    ctx.lineTo(6, cy + 4.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  const updateWeight = useCallback(
    (newVal: number) => {
      const clamped = Math.max(MIN_KG, Math.min(MAX_KG, newVal));
      weightRef.current = clamped;
      draw();

      const rounded = Math.round(clamped * 2) / 2;
      if (rounded !== lastEmittedRef.current) {
        lastEmittedRef.current = rounded;
        setPeso(rounded);
        hapticoDial();
      }
    },
    [draw]
  );

  const startMomentum = useCallback(() => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);

    const step = () => {
      velocityRef.current *= 0.92;

      if (Math.abs(velocityRef.current) > 0.08) {
        const deltaKg = (velocityRef.current / (PY_PER_STEP * 2)) * 0.5;
        updateWeight(weightRef.current + deltaKg);
        animIdRef.current = requestAnimationFrame(step);
      } else {
        const snap = Math.round(weightRef.current * 2) / 2;
        updateWeight(snap);
        velocityRef.current = 0;
      }
    };

    animIdRef.current = requestAnimationFrame(step);
  }, [updateWeight]);

  const onPointerDown = (e: React.PointerEvent) => {
    iniciarAudioHaptico();
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dy = e.clientY - lastYRef.current;

    velocityRef.current = (dy / dt) * 16;
    lastYRef.current = e.clientY;
    lastTimeRef.current = now;

    // Arrastrar hacia arriba aumenta el peso, hacia abajo disminuye
    const deltaKg = (dy / (PY_PER_STEP * 2)) * 0.5;
    updateWeight(weightRef.current + deltaKg);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ok */
    }
    startMomentum();
  };

  const onWheel = (e: React.WheelEvent) => {
    iniciarAudioHaptico();
    e.preventDefault();
    const deltaKg = (e.deltaY / (PY_PER_STEP * 2)) * 0.25;
    updateWeight(weightRef.current + deltaKg);
  };

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (state.ok) {
      hapticoExito();
      setFeedbackOk(true);
      if (state.record?.esRecord && colores && gimnasioNombre) {
        setLogro(state.record);
      }
      const t = setTimeout(() => setFeedbackOk(false), 2000);
      return () => clearTimeout(t);
    } else if (state.error) {
      hapticoError();
    }
  }, [state]);

  return (
    <>
    {logro && colores && gimnasioNombre && (
      <CartelLogro
        tipo="record"
        titulo={tituloRecord(logro.pesoKg, ejercicioNombre ?? "tu ejercicio")}
        subtitulo={
          logro.pesoAnteriorKg != null
            ? `Tu marca anterior era ${logro.pesoAnteriorKg} kg`
            : undefined
        }
        gimnasioNombre={gimnasioNombre}
        logoUrl={logoUrl ?? null}
        colores={colores}
        whatsapp={{ pesoKg: logro.pesoKg, ejercicio: ejercicioNombre ?? "" }}
        onCerrar={() => setLogro(null)}
      />
    )}
    <form
      action={formAction}
      className="flex flex-col items-center w-[68px] rounded-[10px] border border-rule/70 bg-paper-2/90 p-1 select-none"
    >
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />
      <input type="hidden" name="peso" value={peso} />

      {/* Valor digital en naranja ámbar con badge distintivo */}
      <div className="flex flex-col items-center leading-none pt-0.5">
        {esCorporal && (
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#ff9f0a] bg-[#ff9f0a]/20 px-1 py-0.5 rounded-[4px] mb-0.5">
            Lastre
          </span>
        )}
        {esBarra && (
          <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-[#ff9f0a]/90 bg-[#ff9f0a]/15 px-1 py-0.5 rounded-[4px] mb-0.5">
            Barra+Discos
          </span>
        )}
        <div className="flex items-baseline justify-center gap-0.5">
          <span
            className="text-[13px] font-bold text-[#ff9f0a] tabular-nums"
            style={{
              fontFamily: "var(--font-hero, system-ui)",
              textShadow: "0 0 10px rgba(255, 159, 10, 0.35)",
            }}
          >
            {esCorporal ? `${peso > 0 ? "+" : ""}${peso % 1 === 0 ? peso : peso.toFixed(1)}` : (peso % 1 === 0 ? peso : peso.toFixed(1))}
          </span>
          <span className="text-[9px] font-semibold text-[#ff9f0a]/70">kg</span>
        </div>
      </div>

      {/* Dial vertical de regla con fade en bordes */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        className="relative w-full h-[88px] cursor-grab active:cursor-grabbing touch-none my-0.5"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Botón guardar rápido de 1 tap */}
      <button
        type="submit"
        disabled={pending}
        aria-label="Guardar peso de este ejercicio"
        className={`w-full h-6 rounded-[6px] text-[10px] font-bold tracking-tight transition-all duration-150 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 ${
          feedbackOk
            ? "bg-ok text-ok-ink border border-ok"
            : "bg-[#ff9f0a]/20 hover:bg-[#ff9f0a]/30 border border-[#ff9f0a]/40 text-[#ff9f0a]"
        }`}
      >
        {pending ? (
          <Spinner className="size-3 text-[#ff9f0a]" />
        ) : feedbackOk ? (
          <span>✓ Listo</span>
        ) : (
          <span>Guardar</span>
        )}
      </button>

      {/* Micro-aclaración biomecánica debajo de Guardar (ubicación exacta señalada por el usuario) */}
      {esCorporal && (
        <p className="mt-1 text-[8px] font-medium leading-[1.15] text-center text-ink-soft opacity-80 select-none">
          Lastre extra<br />(cinturón)
        </p>
      )}
      {esBarra && (
        <p className="mt-1 text-[8px] font-medium leading-[1.15] text-center text-ink-soft opacity-80 select-none">
          Barra +<br />discos
        </p>
      )}
      {esMancuerna && (
        <p className="mt-1 text-[8px] font-medium leading-[1.15] text-center text-ink-soft opacity-80 select-none">
          Por<br />mancuerna
        </p>
      )}
      {(esPolea || esMaquina) && (
        <p className="mt-1 text-[8px] font-medium leading-[1.15] text-center text-ink-soft opacity-80 select-none">
          Carga en<br />placas
        </p>
      )}
    </form>
    </>
  );
}
