"use client";

import { useActionState, useState } from "react";
import { actualizarAsistenteIa, type AjustesState } from "./actions";
import { Toggle } from "@/components/ui";

export function AsistenteIaForm({
  gimnasioId,
  activo,
  llamadasUsadas,
  techoMensual,
}: {
  gimnasioId: string;
  activo: boolean;
  llamadasUsadas: number;
  techoMensual: number;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarAsistenteIa,
    {},
  );
  const [checked, setChecked] = useState(activo);

  return (
    <form
      action={formAction}
      onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
      className="space-y-4"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <Toggle
        name="activo"
        checked={checked}
        onCheckedChange={setChecked}
        label="Activar asistente IA"
        hint="Avisos de riesgo de abandono, cumpleaños y balance mensual redactados automáticamente por inteligencia artificial."
        disabled={pending}
      />

      <div className="rounded-[10px] border border-rule bg-paper-2 p-3 flex items-center justify-between">
        <span className="text-xs text-ink-soft">Llamadas a la IA este mes</span>
        <span className="text-xs font-mono font-bold text-ink">
          {llamadasUsadas} / {techoMensual}
        </span>
      </div>

      {/* GUÍA DE FUNCIONAMIENTO Y CASOS DE USO */}
      <div className="rounded-[12px] border border-rule/80 bg-paper-1/60 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-[8px] bg-primary/10 text-primary text-xs font-bold">
            ✨
          </div>
          <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
            ¿Para qué sirve y cómo trabaja?
          </h4>
        </div>

        <p className="text-xs text-ink-soft leading-relaxed">
          El Asistente IA es un agente inteligente que trabaja en segundo plano todos los días a las <strong>10:00 AM</strong>. No tenés que escribir nada: analiza los datos de tus socios y redacta mensajes humanos, cercanos y profesionales en español rioplatense.
        </p>

        <div className="space-y-2.5 pt-1">
          <div className="rounded-[10px] border border-rule/50 bg-paper-2 p-3 flex gap-3">
            <span className="text-base select-none">🎂</span>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-ink">1. Saludos de Cumpleaños</p>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Revisa qué socios cumplen años hoy (según su fecha de nacimiento) y les envía un saludo alegre y personalizado por Web Push y al buzón de la app.
              </p>
            </div>
          </div>

          <div className="rounded-[10px] border border-rule/50 bg-paper-2 p-3 flex gap-3">
            <span className="text-base select-none">🏃‍♂️</span>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-ink">2. Rescate por Riesgo de Abandono</p>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Detecta socios con la cuota al día que no asisten ni registran actividad hace 7 a 14 días. Les escribe un mensaje cálido motivándolos a volver sin sonar a reproche ni reto.
              </p>
            </div>
          </div>

          <div className="rounded-[10px] border border-rule/50 bg-paper-2 p-3 flex gap-3">
            <span className="text-base select-none">📊</span>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-ink">3. Resumen Mensual Ejecutivo</p>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                El día 1 de cada mes te envía a vos (dueño) un informe sintético con la cantidad de socios activos y check-ins totales del mes anterior.
              </p>
            </div>
          </div>
        </div>

        {/* EJEMPLO REAL DE MENSAJE */}
        <div className="rounded-[10px] border border-rule/70 bg-paper-2/90 p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Ejemplo de mensaje redactado por la IA:
          </p>
          <div className="rounded-[8px] bg-paper-1 p-2.5 border border-rule/40 text-xs italic text-ink/90">
            &ldquo;¡Hola Lucas! Vimos que hace unos días no te das una vuelta por el gym. ¡Te extrañamos en el entrenamiento! Metete un rato hoy que el progreso no se detiene 💪&rdquo;
          </div>
        </div>

        {/* REGLAS DE SEGURIDAD */}
        <div className="border-t border-rule/60 pt-3 space-y-1 text-[11px] text-ink-soft">
          <p className="flex items-center gap-1.5">
            <span className="text-ok font-bold">✓</span> <strong>Cero Spam:</strong> Cuenta con filtro anti-duplicados (máximo 1 aviso por socio por semana).
          </p>
          <p className="flex items-center gap-1.5">
            <span className="text-ok font-bold">✓</span> <strong>Techo protegido:</strong> Límite de {techoMensual} llamadas/mes para que nunca pagues de más.
          </p>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
    </form>
  );
}
