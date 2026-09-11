"use client";

import { useEffect, useRef } from "react";

type Particula = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  oscillationSpeed: number;
  oscillationDistance: number;
  opacity: number;
  shape: "rect" | "circle";
};

const COLORES_RECORD = [
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#d97706", // amber-600
  "#10e7a0", // volt SysGym
  "#34d399", // emerald-400
  "#ffffff", // blanco brillante
  "#fef08a", // yellow-200
];

const COLORES_RACHA = [
  "#10e7a0", // volt SysGym
  "#34d399", // emerald-400
  "#10b981", // emerald-500
  "#059669", // emerald-600
  "#fbbf24", // toque ámbar/llama
  "#ffffff", // blanco
];

export type ConfetiCelebracionProps = {
  activo?: boolean;
  tipo?: "record" | "racha";
  duracionMs?: number;
  className?: string;
};

/**
 * Confeti ultra-liviano sobre Canvas nativo (60fps/120fps GPU).
 * Cero dependencias externas, auto-limpiable, con física estilo iOS.
 */
export function ConfetiCelebracion({
  activo = true,
  tipo = "record",
  duracionMs = 3600,
  className = "",
}: ConfetiCelebracionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!activo) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize, { passive: true });

    const colores = tipo === "record" ? COLORES_RECORD : COLORES_RACHA;
    const totalParticulas = Math.min(100, Math.floor(w / 10) + 40);
    const particulas: Particula[] = [];

    // Ráfagas desde ambos lados inferiores disparadas hacia arriba-centro
    for (let i = 0; i < totalParticulas; i++) {
      const desdeIzquierda = i % 2 === 0;
      const startX = desdeIzquierda ? w * 0.15 : w * 0.85;
      const startY = h * 0.85;

      const angle = desdeIzquierda
        ? -Math.PI / 2 + (Math.random() * 0.6 - 0.1)
        : -Math.PI / 2 - (Math.random() * 0.6 - 0.1);

      const speed = Math.random() * 14 + 10;

      particulas.push({
        x: startX + (Math.random() * 40 - 20),
        y: startY + (Math.random() * 40 - 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 7 + 5,
        color: colores[Math.floor(Math.random() * colores.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.18,
        oscillationSpeed: Math.random() * 0.08 + 0.02,
        oscillationDistance: Math.random() * 2 + 1,
        opacity: 1,
        shape: Math.random() > 0.35 ? "rect" : "circle",
      });
    }

    const startTime = performance.now();
    let lastTime = startTime;

    const gravity = 0.35;
    const drag = 0.982;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const dt = Math.min(2, (now - lastTime) / 16.67);
      lastTime = now;

      ctx.clearRect(0, 0, w, h);

      const fadeStart = duracionMs * 0.75;
      const globalAlpha =
        elapsed > fadeStart
          ? Math.max(0, 1 - (elapsed - fadeStart) / (duracionMs - fadeStart))
          : 1;

      for (const p of particulas) {
        p.vx *= Math.pow(drag, dt);
        p.vy = (p.vy + gravity * dt) * Math.pow(drag, dt);

        p.x += (p.vx + Math.sin(elapsed * p.oscillationSpeed) * p.oscillationDistance) * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity * globalAlpha;
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const hRatio = Math.abs(Math.sin(p.rotation));
          ctx.fillRect(-p.size * 0.5, (-p.size * hRatio) / 2, p.size, p.size * 0.6 * hRatio);
        }

        ctx.restore();
      }

      if (elapsed < duracionMs && globalAlpha > 0.01) {
        animId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    animId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", onResize);
      if (animId) cancelAnimationFrame(animId);
      if (ctx && canvas) ctx.clearRect(0, 0, w, h);
    };
  }, [activo, tipo, duracionMs]);

  if (!activo) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[65] h-full w-full select-none ${className}`}
    />
  );
}
