"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useActionState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Spinner } from "@/components/ui";
import type { ProgresoState } from "@/lib/progreso/actions";
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoExito,
  hapticoError,
  hapticoRecordPersonal,
} from "@/lib/ui/hapticos";
import { encolar } from "@/lib/offline/cola";
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

export type DialVerticalProgresoHandle = {
  /** Fija el peso del dial desde afuera (p.ej. la calculadora de discos) y,
     si `guardar` es true, dispara el mismo submit que el botón "Guardar". */
  aplicarPeso: (kg: number, guardar?: boolean) => void;
};

export const DialVerticalProgreso = forwardRef<
  DialVerticalProgresoHandle,
  {
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
    repsIniciales?: number;
    /** Se dispara con cada cambio de peso (arrastre, +/-, o carga inicial) para
       que quien use el dial (p.ej. la calculadora de discos y la rampa de
       calentamiento) trabaje siempre con el peso que se ve en pantalla, no
       con el último guardado. */
    onPesoChange?: (peso: number) => void;
  }
>(function DialVerticalProgreso(
  {
    ejercicioId,
    action,
    fetchUltimoPeso,
    tipoEquipo = "otro",
    esCorporal: esCorporalLegacy,
    ejercicioNombre,
    gimnasioNombre,
    logoUrl,
    colores,
    repsIniciales = 10,
    onPesoChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const guardarPendienteRef = useRef(false);

  const esCorporal = tipoEquipo === "corporal" || Boolean(esCorporalLegacy);
  const esBarra = tipoEquipo === "barra";
  const esMancuerna = tipoEquipo === "mancuerna";

  const pesoInicial = esCorporal ? 0 : 20;
  const [peso, setPeso] = useState<number>(pesoInicial);
  const [reps, setReps] = useState<number>(repsIniciales);
  const weightRef = useRef(pesoInicial);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const lastEmittedRef = useRef(pesoInicial);

  // Envuelve la Server Action: si el dispositivo está sin conexión (o el fetch
  // falla con un error de red), encola el registro en la cola offline y devuelve
  // éxito optimista para no bloquear al socio en el gimnasio.
  const accionConCola = useCallback(
    async (prev: ProgresoState, fd: FormData): Promise<ProgresoState> => {
      const payload = {
        ejercicio_id: String(fd.get("ejercicio_id") ?? ""),
        peso: Number(fd.get("peso") ?? 0),
        reps: fd.get("reps") ? Number(fd.get("reps")) : null,
      };
      const offline =
        typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        encolar("progreso_ejercicio", payload);
        return { ok: "✓" };
      }
      try {
        return await action(prev, fd);
      } catch (err) {
        if (
          err instanceof TypeError ||
          (err instanceof Error && /fetch|network/i.test(err.message))
        ) {
          encolar("progreso_ejercicio", payload);
          return { ok: "✓" };
        }
        throw err;
      }
    },
    [action],
  );

  const [state, formAction, pending] = useActionState(accionConCola, {});
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [logro, setLogro] = useState<ResultadoRecord | null>(null);

  // Cargar último peso y reps registrado como punto de partida
  useEffect(() => {
    fetchUltimoPeso(ejercicioId).then((r) => {
      if (r && r.peso !== undefined && r.peso !== null) {
        setPeso(r.peso);
        weightRef.current = r.peso;
        lastEmittedRef.current = r.peso;
        if (r.reps && r.reps > 0) {
          setReps(r.reps);
        }
        draw();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioId]);

  // Avisar al padre el peso vigente en el dial (incluye el que trae
  // fetchUltimoPeso al montar y cada ajuste posterior por arrastre o +/-),
  // para que herramientas externas (rampa de calentamiento, calculadora de
  // discos) calculen sobre lo que el socio está viendo, no un valor stale.
  useEffect(() => {
    onPesoChange?.(peso);
    // El submit se dispara acá (no en aplicarPeso) para asegurar que el
    // input hidden "peso" ya haya confirmado el valor nuevo en el DOM.
    if (guardarPendienteRef.current) {
      guardarPendienteRef.current = false;
      formRef.current?.requestSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peso]);

  // Dibujar regla vertical en canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 84;
    const h = 108;

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

  useImperativeHandle(
    ref,
    () => ({
      aplicarPeso: (kg, guardar = false) => {
        const rounded = Math.round(kg * 2) / 2;
        if (guardar) {
          if (rounded === lastEmittedRef.current) {
            // updateWeight no dispara el effect de [peso] si el valor no
            // cambia (ya es el mismo que se ve): submiteá directo.
            requestAnimationFrame(() => formRef.current?.requestSubmit());
          } else {
            guardarPendienteRef.current = true;
          }
        }
        updateWeight(kg);
      },
    }),
    [updateWeight],
  );

  // Sin inercia: al soltar, snap inmediato al 0,5 más cercano del valor real
  // donde quedó el dedo. Antes el "flywheel" seguía girando y pasaba de largo
  // (soltabas en 15 y caía en 15,5).
  const snapAlSoltar = useCallback(() => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    velocityRef.current = 0;
    updateWeight(Math.round(weightRef.current * 2) / 2);
  }, [updateWeight]);

  // Ajuste fino ±1 kg (botones). Redondea primero a 0,5 para no arrastrar
  // decimales del dial.
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nudge = useCallback(
    (delta: number) => {
      iniciarAudioHaptico();
      // "+" te lleva al kg entero de arriba, "−" al de abajo: si venías de un
      // 13,5 del dial, "+" = 14 y "−" = 13 (no 14,5 / 12,5).
      const w = weightRef.current;
      const base = delta > 0 ? Math.floor(w) : Math.ceil(w);
      updateWeight(base + delta);
    },
    [updateWeight],
  );
  const startHold = (delta: number) => {
    nudge(delta);
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = setInterval(() => nudge(delta), 130);
  };
  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };
  useEffect(() => () => stopHold(), []);

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
    snapAlSoltar();
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
      if (state.record?.esRecord) {
        iniciarAudioHaptico();
        hapticoRecordPersonal();
        setLogro(state.record);
      } else {
        hapticoExito();
      }
      setFeedbackOk(true);
      const t = setTimeout(() => setFeedbackOk(false), 2000);
      return () => clearTimeout(t);
    } else if (state.error) {
      hapticoError();
    }
  }, [state]);

  const coloresEfectivos: ColoresImagen = colores ?? {
    paper: "#09090b",
    ink: "#f4f4f5",
    volt: "#10e7a0",
    voltInk: "#042f22",
  };
  const gymNombreEfectivo =
    gimnasioNombre && gimnasioNombre.trim().length > 0
      ? gimnasioNombre
      : "SysGym";

  return (
    <>
    {logro && (
      <CartelLogro
        tipo="record"
        titulo={tituloRecord(logro.pesoKg, ejercicioNombre ?? "tu ejercicio")}
        subtitulo={
          logro.pesoAnteriorKg != null
            ? `Superaste tu marca anterior de ${logro.pesoAnteriorKg} kg`
            : "¡Primer registro histórico en este ejercicio!"
        }
        gimnasioNombre={gymNombreEfectivo}
        logoUrl={logoUrl ?? null}
        colores={coloresEfectivos}
        whatsapp={{ pesoKg: logro.pesoKg, ejercicio: ejercicioNombre ?? "" }}
        onCerrar={() => setLogro(null)}
      />
    )}
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col items-center w-[84px] rounded-[10px] border border-rule/70 bg-paper-2/90 p-1 select-none"
    >
      <input type="hidden" name="ejercicio_id" value={ejercicioId} />
      <input type="hidden" name="peso" value={peso} />

      {/* Valor digital en naranja ámbar con badge distintivo */}
      <div className="flex flex-col items-center leading-none pt-0.5">
        {esCorporal && (
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-[#ff9f0a] bg-[#ff9f0a]/20 px-1 py-0.5 rounded-[4px] mb-0.5">
            Peso extra
          </span>
        )}
        {esBarra && (
          <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-[#ff9f0a]/90 bg-[#ff9f0a]/15 px-1 py-0.5 rounded-[4px] mb-0.5">
            Sin la barra
          </span>
        )}
        {esMancuerna && (
          <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-[#ff9f0a]/90 bg-[#ff9f0a]/15 px-1 py-0.5 rounded-[4px] mb-0.5">
            Cada mancuerna
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
            {(() => {
              const n = peso % 1 === 0 ? peso : peso.toFixed(1);
              const aditivo = esCorporal || esBarra || esMancuerna;
              return aditivo && peso > 0 ? `+${n}` : `${n}`;
            })()}
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
        className="relative w-full h-[108px] cursor-grab active:cursor-grabbing touch-none my-0.5"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Ajuste fino ±1 kg: el dial es el movimiento grueso, estos clavan el valor */}
      <div className="flex w-full gap-1 my-0.5">
        <button
          type="button"
          aria-label="Bajar 1 kg"
          onPointerDown={(e) => {
            e.preventDefault();
            startHold(-1);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="flex-1 h-6 grid place-items-center rounded-[6px] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 text-[#ff9f0a] text-[14px] font-bold leading-none transition-transform duration-150 active:scale-90 touch-none"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Subir 1 kg"
          onPointerDown={(e) => {
            e.preventDefault();
            startHold(1);
          }}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="flex-1 h-6 grid place-items-center rounded-[6px] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 text-[#ff9f0a] text-[14px] font-bold leading-none transition-transform duration-150 active:scale-90 touch-none"
        >
          +
        </button>
      </div>

      {/* Botón guardar rápido de 1 tap (Feedback optimista instantáneo 0ms) */}
      <button
        type="submit"
        disabled={pending && !feedbackOk}
        onClick={() => {
          iniciarAudioHaptico();
          hapticoExito();
          setFeedbackOk(true);
          setTimeout(() => setFeedbackOk(false), 2000);
        }}
        aria-label="Guardar peso y reps de este ejercicio"
        className={`w-full h-6 rounded-[6px] text-[10px] font-bold tracking-tight transition-all duration-150 flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50 my-0.5 ${
          feedbackOk
            ? "bg-ok text-ok-ink border border-ok shadow-sm"
            : "bg-[#ff9f0a]/20 hover:bg-[#ff9f0a]/30 border border-[#ff9f0a]/40 text-[#ff9f0a]"
        }`}
      >
        {feedbackOk ? (
          <span>✓ Listo</span>
        ) : pending ? (
          <Spinner className="size-3 text-[#ff9f0a]" />
        ) : (
          <span>Guardar</span>
        )}
      </button>

      {/* Reps: ya no se editan acá (se duplicaba con "REPS REALIZADAS" por
         serie a la derecha); este dial sólo maneja peso. El valor de reps
         que viaja en el submit queda fijo en el último cargado/inicial. */}
      <input type="hidden" name="reps" value={reps} />

    </form>
    </>
  );
});
