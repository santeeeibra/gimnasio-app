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
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoExito,
  hapticoError,
  hapticoImpactoSuave,
} from "@/lib/ui/hapticos";

// ─────────────────────────────────────────────────────────────────────────────
// RulerWeightPicker — Dial horizontal estilo regla / temporizador iOS
// ─────────────────────────────────────────────────────────────────────────────
const PX_PER_STEP = 9; // píxeles por cada 0.1 kg (90px por cada 1 kg)
const MIN_KG = 30;
const MAX_KG = 220;

interface RulerProps {
  defaultValue: number;
  onChange: (peso: number) => void;
}

export function RulerWeightPicker({ defaultValue, onChange }: RulerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const weightRef = useRef(defaultValue);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const lastEmittedRef = useRef(Math.round(defaultValue * 10) / 10);

  // Redibujar el canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.offsetWidth;
    const h = 76;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const curW = weightRef.current;

    // Rango de marcas visibles
    const halfVisibleKg = (cx / PX_PER_STEP) * 0.1 + 1.5;
    const startStep = Math.max(
      MIN_KG * 10,
      Math.floor((curW - halfVisibleKg) * 10)
    );
    const endStep = Math.min(
      MAX_KG * 10,
      Math.ceil((curW + halfVisibleKg) * 10)
    );

    // Dibujar marcas verticales de la regla
    for (let step = startStep; step <= endStep; step++) {
      const kg = step / 10;
      const x = cx + (kg - curW) * 10 * PX_PER_STEP;

      const isMajor = step % 10 === 0; // 1.0 kg
      const isMedium = step % 5 === 0; // 0.5 kg

      if (isMajor) {
        // Número arriba de la marca mayor
        ctx.fillStyle = "rgba(255, 159, 10, 0.88)";
        ctx.font = "600 11px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(Math.round(kg)), x, 14);

        // Marca alta
        ctx.fillStyle = "#ff9f0a";
        ctx.fillRect(x - 1, 22, 2, 28);
      } else if (isMedium) {
        // Marca media (0.5 kg)
        ctx.fillStyle = "rgba(255, 159, 10, 0.65)";
        ctx.fillRect(x - 0.75, 27, 1.5, 23);
      } else {
        // Marca corta (0.1 kg)
        ctx.fillStyle = "rgba(255, 159, 10, 0.35)";
        ctx.fillRect(x - 0.5, 34, 1, 16);
      }
    }

    // Puntero central: triángulo naranja pointing up (▲)
    ctx.fillStyle = "#ff9f0a";
    ctx.shadowColor = "rgba(255, 159, 10, 0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, 53);
    ctx.lineTo(cx - 5.5, 64);
    ctx.lineTo(cx + 5.5, 64);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }, []);

  const updateWeight = useCallback(
    (newVal: number) => {
      const clamped = Math.max(MIN_KG, Math.min(MAX_KG, newVal));
      weightRef.current = clamped;
      draw();

      const rounded = Math.round(clamped * 10) / 10;
      if (rounded !== lastEmittedRef.current) {
        lastEmittedRef.current = rounded;
        onChange(rounded);
        hapticoDial();
      }
    },
    [draw, onChange]
  );

  // Inercia con physics decay
  const startMomentum = useCallback(() => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);

    const step = () => {
      velocityRef.current *= 0.93; // fricción suave

      if (Math.abs(velocityRef.current) > 0.08) {
        const deltaKg = (velocityRef.current / PX_PER_STEP) * 0.1;
        updateWeight(weightRef.current - deltaKg);
        animIdRef.current = requestAnimationFrame(step);
      } else {
        // Imán final al 0.1 más cercano
        const snap = Math.round(weightRef.current * 10) / 10;
        updateWeight(snap);
        velocityRef.current = 0;
      }
    };

    animIdRef.current = requestAnimationFrame(step);
  }, [updateWeight]);

  // Pointer events (touch + mouse unificados)
  const onPointerDown = (e: React.PointerEvent) => {
    iniciarAudioHaptico();
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const dx = e.clientX - lastXRef.current;

    // Calcular velocidad instantánea (px/frame)
    velocityRef.current = (dx / dt) * 16;

    lastXRef.current = e.clientX;
    lastTimeRef.current = now;

    // Arrastrar a la derecha mueve hacia valores menores, izquierda hacia mayores
    const deltaKg = (dx / PX_PER_STEP) * 0.1;
    updateWeight(weightRef.current - deltaKg);
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

  // Scroll con rueda de mouse / trackpad
  const onWheel = (e: React.WheelEvent) => {
    iniciarAudioHaptico();
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const deltaKg = (delta / PX_PER_STEP) * 0.05;
    updateWeight(weightRef.current + deltaKg);
  };

  // Resize listener
  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      className="relative w-full h-[76px] cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        // Máscara transparente a los costados para desvanecerse en el fondo oscuro
        maskImage:
          "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
      }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gráfico de línea canvas (Historial)
// ─────────────────────────────────────────────────────────────────────────────
function GraficoPeso({ registros }: { registros: RegistroPeso[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const colorAccent =
      style.getPropertyValue("--color-accent").trim() || "#ff9f0a";
    const colorInkSoft =
      style.getPropertyValue("--color-ink-soft").trim() || "#888";
    const colorRule =
      style.getPropertyValue("--color-rule").trim() || "#26262a";

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
      ctx.fillText(
        "Registrá al menos 2 datos para ver el gráfico",
        W / 2,
        H / 2
      );
      return;
    }

    const padL = 44,
      padR = 16,
      padT = 12,
      padB = 28;
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
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    datos.forEach((d, i) => {
      i === 0
        ? ctx.moveTo(toX(i), toY(d.peso))
        : ctx.lineTo(toX(i), toY(d.peso));
    });
    ctx.lineTo(toX(datos.length - 1), padT + gH);
    ctx.lineTo(toX(0), padT + gH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    datos.forEach((d, i) => {
      i === 0
        ? ctx.moveTo(toX(i), toY(d.peso))
        : ctx.lineTo(toX(i), toY(d.peso));
    });
    ctx.stroke();

    datos.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(d.peso), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = colorAccent;
      ctx.fill();
    });

    ctx.font = "10px system-ui";
    ctx.fillStyle = colorInkSoft;
    ctx.textAlign = "right";
    ctx.fillText(`${maxP} kg`, padL - 4, padT + 4);
    ctx.fillText(`${minP} kg`, padL - 4, padT + gH + 4);

    const fmt = (f: string) =>
      new Date(f + "T12:00:00").toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
      });
    ctx.textAlign = "center";
    ctx.fillText(fmt(datos[0].fecha), padL, H - 4);
    if (datos.length > 1)
      ctx.fillText(
        fmt(datos[datos.length - 1].fecha),
        toX(datos.length - 1),
        H - 4
      );
  }, [registros]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[140px] block"
      aria-label="Gráfico de evolución del peso corporal"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CardPeso — Card con diseño exacto al cronómetro/alarma de iOS
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
  const [pesoInicial, setPesoInicial] = useState<number | null>(null);
  const pesoRef = useRef(70);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    fetchRegistros()
      .then((data) => {
        setRegistros(data);
        const hoyStr = new Date().toISOString().slice(0, 10);
        const hoyReg = data.find((r) => r.fecha === hoyStr);
        const base = hoyReg
          ? Number(hoyReg.peso)
          : data.length > 0
          ? Number(data[0].peso)
          : 70;
        setPesoSeleccionado(base);
        pesoRef.current = base;
        setPesoInicial(base);
      })
      .finally(() => setCargando(false));
  }, [fetchRegistros]);

  // Recargar después de guardar exitosamente y disparar háptico
  useEffect(() => {
    if (state.ok) {
      hapticoExito();
      setPesoInicial(pesoRef.current);
      fetchRegistros().then((data) => {
        setRegistros(data);
      });
    } else if (state.error) {
      hapticoError();
    }
  }, [state, fetchRegistros]);

  function handleRulerChange(nuevoPeso: number) {
    setPesoSeleccionado(nuevoPeso);
    pesoRef.current = nuevoPeso;
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const registroHoy = registros.find((r) => r.fecha === hoy);
  const haCambiado =
    pesoInicial !== null && Math.abs(pesoSeleccionado - pesoInicial) >= 0.05;

  return (
    <div className="rounded-[18px] border border-rule bg-paper-2 overflow-hidden shadow-sm">
      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          fd.set("peso", String(pesoRef.current));
        }}
        className="p-5 space-y-4"
      >
        <input type="hidden" name="cliente_id" value={clienteId} />
        <input type="hidden" name="peso" value={pesoSeleccionado} />
        <input type="hidden" name="creado_por" value={creadoPor} />

        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
            Peso corporal
          </h2>
          {registroHoy && (
            <span className="text-[11px] text-ink-soft">
              Hoy:{" "}
              <b
                className="text-[#ff9f0a] font-semibold"
                style={{ fontFamily: "var(--font-hero)" }}
              >
                {registroHoy.peso} kg
              </b>
            </span>
          )}
        </div>

        {/* Dial de regla horizontal estilo iOS Timer */}
        <div className="pt-1">
          {cargando ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-soft">
              <Spinner /> Cargando…
            </div>
          ) : (
            <RulerWeightPicker
              defaultValue={
                registroHoy ? Number(registroHoy.peso) : pesoSeleccionado
              }
              onChange={handleRulerChange}
            />
          )}
        </div>

        {/* Fila inferior: Botón estilo pill iOS a la izquierda + Display digital a la derecha */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-rule/50">
          {/* Botón pill estilo 'Start Timer' */}
          <button
            type="submit"
            disabled={pending || cargando || !haCambiado}
            onClick={() => {
              if (haCambiado && !pending) {
                hapticoImpactoSuave();
              }
            }}
            className={`h-11 px-5 rounded-full text-xs font-bold tracking-wide transition-all duration-150 flex items-center gap-2 ${
              haCambiado && !pending
                ? "bg-[#ff9f0a]/15 border border-[#ff9f0a]/40 text-[#ff9f0a] shadow-[0_0_15px_rgba(255,159,10,0.15)] active:scale-95 hover:bg-[#ff9f0a]/25 cursor-pointer"
                : "bg-paper-3/50 border border-rule text-ink-soft/40 cursor-not-allowed opacity-60 shadow-none"
            }`}
          >
            {pending ? (
              <>
                <Spinner className="text-[#ff9f0a]" />
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                  className={haCambiado ? "text-[#ff9f0a]" : "text-ink-soft/40"}
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>
                  {registroHoy ? "Actualizar peso" : "Guardar peso"}
                </span>
              </>
            )}
          </button>

          {/* Display digital grande con brillo ámbar (igual que el '15:00' de la foto) */}
          <div className="flex items-baseline gap-1 text-right select-none">
            <span
              className="text-[34px] font-bold tracking-tight text-[#ff9f0a] tabular-nums"
              style={{
                fontFamily: "var(--font-hero, system-ui)",
                textShadow: "0 0 20px rgba(255, 159, 10, 0.4)",
              }}
            >
              {pesoSeleccionado.toFixed(1)}
            </span>
            <span className="text-[14px] font-semibold text-[#ff9f0a]/75">
              kg
            </span>
          </div>
        </div>

        {state.error && (
          <p className="text-xs text-danger animate-fade-in text-center">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="text-xs text-ok animate-fade-in text-center font-medium">
            {state.ok}
          </p>
        )}
      </form>

      {/* Historial colapsado con gráfico */}
      {!cargando && registros.length > 0 && (
        <details className="group border-t border-rule">
          <summary
            onClick={() => hapticoImpactoSuave()}
            className="flex cursor-pointer select-none list-none items-center justify-between px-5 py-3.5 text-xs font-medium text-ink-soft hover:text-ink active:bg-paper-3/40 transition-colors [&::-webkit-details-marker]:hidden"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Historial</span>
              <span className="px-2 py-0.5 rounded-full bg-paper-3 text-[11px] font-mono text-ink-soft border border-rule">
                {registros.length} {registros.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <span className="group-open:hidden">Ver gráfico y registros</span>
              <span className="hidden group-open:inline">Ocultar gráfico</span>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
                className="transition-transform duration-200 group-open:rotate-180 text-ink-soft"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </summary>

          <div className="px-5 pb-5 space-y-3 animate-fade-in">
            <div className="rounded-[10px] border border-rule bg-paper p-2">
              <GraficoPeso registros={registros} />
            </div>
            <ul className="divide-y divide-rule rounded-[10px] border border-rule bg-paper overflow-hidden text-sm">
              {registros.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2.5"
                >
                  <span className="text-[12px] text-ink-soft">
                    {new Date(r.fecha + "T12:00:00").toLocaleDateString(
                      "es-AR",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      }
                    )}
                    {r.creado_por === "dueno" && (
                      <span className="ml-1.5 text-[10px] opacity-60">
                        (gym)
                      </span>
                    )}
                  </span>
                  <span
                    className="font-bold text-[#ff9f0a] tabular-nums"
                    style={{ fontFamily: "var(--font-hero)" }}
                  >
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
