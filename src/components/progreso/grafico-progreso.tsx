"use client";

import { useRef, useEffect } from "react";
import type { RegistroProgreso } from "@/lib/progreso/actions";

/** Gráfico de línea canvas (fecha vs. kg levantado) para un ejercicio. */
export function GraficoProgreso({ registros }: { registros: RegistroProgreso[] }) {
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

    // registros vienen desc; para graficar los necesitamos asc
    const datos = [...registros].reverse();

    if (datos.length < 2) {
      ctx.font = "11px system-ui";
      ctx.fillStyle = colorInkSoft;
      ctx.textAlign = "center";
      ctx.fillText("Registrá al menos 2 sesiones para ver la curva", W / 2, H / 2);
      return;
    }

    const padL = 42;
    const padR = 12;
    const padT = 10;
    const padB = 22;
    const gW = W - padL - padR;
    const gH = H - padT - padB;

    // Calcular el 1RM (Repetición Máxima) para cada punto si hay reps, sino usar peso.
    const valoresRM = datos.map((d) => 
      d.reps ? Math.round(d.peso * (1 + d.reps / 30)) : d.peso
    );
    
    const minP = Math.min(...valoresRM);
    const maxP = Math.max(...valoresRM);
    const rangoP = maxP - minP || 1;

    const toX = (i: number) => padL + (i / (datos.length - 1)) * gW;
    const toY = (p: number) => padT + gH - ((p - minP) / rangoP) * gH;

    // Grilla
    ctx.strokeStyle = colorRule;
    ctx.lineWidth = 1;
    for (let t = 0; t <= 3; t++) {
      const y = padT + (gH / 3) * t;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    // Área rellena
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    valoresRM.forEach((rm, i) => {
      const x = toX(i);
      const y = toY(rm);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(valoresRM.length - 1), padT + gH);
    ctx.lineTo(toX(0), padT + gH);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Línea
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    valoresRM.forEach((rm, i) => {
      const x = toX(i);
      const y = toY(rm);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Puntos
    valoresRM.forEach((rm, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(rm), 3, 0, Math.PI * 2);
      ctx.fillStyle = colorAccent;
      ctx.fill();
    });

    // Eje Y (Etiquetas de 1RM)
    ctx.font = "10px system-ui";
    ctx.fillStyle = colorInkSoft;
    ctx.textAlign = "right";
    ctx.fillText(`${maxP}kg`, padL - 4, padT + 4);
    ctx.fillText(`${minP}kg`, padL - 4, padT + gH + 4);

    // Eje X (primera / última fecha)
    const fmt = (f: string) => {
      const dt = new Date(f + "T12:00:00");
      return dt.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
    };
    ctx.textAlign = "center";
    ctx.fillText(fmt(datos[0].fecha), padL, H - 4);
    ctx.fillText(fmt(datos[datos.length - 1].fecha), toX(datos.length - 1), H - 4);
  }, [registros]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-[110px] block"
      aria-label="Gráfico de progreso del ejercicio"
    />
  );
}
