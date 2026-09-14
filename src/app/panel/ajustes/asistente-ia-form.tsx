"use client";

import { useActionState, useState, useEffect } from "react";
import {
  actualizarAsistenteIa,
  actualizarPlantillaCumpleanos,
  type AjustesState,
} from "./actions";
import { Button, Toggle } from "@/components/ui";
import { useHapticos } from "@/lib/ui/hapticos";
import { Check, AlertCircle } from "lucide-react";

export function AsistenteIaForm({
  gimnasioId,
  activo,
  llamadasUsadas,
  techoMensual,
  plantillaCumpleanos,
}: {
  gimnasioId: string;
  activo: boolean;
  llamadasUsadas: number;
  techoMensual: number;
  plantillaCumpleanos: string;
}) {
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarAsistenteIa,
    {},
  );
  const [checked, setChecked] = useState(activo);
  const hapticos = useHapticos();

  const [statePlantilla, formActionPlantilla, pendingPlantilla] = useActionState<
    AjustesState,
    FormData
  >(actualizarPlantillaCumpleanos, {});
  const [plantilla, setPlantilla] = useState(plantillaCumpleanos);

  useEffect(() => {
    if (statePlantilla.ok) hapticos.exito();
    else if (statePlantilla.error) hapticos.error();
  }, [statePlantilla.ok, statePlantilla.error, hapticos]);

  useEffect(() => {
    if (state.ok) {
      hapticos.exito();
    } else if (state.error) {
      hapticos.error();
    }
  }, [state.ok, state.error, hapticos]);

  return (
    <>
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      {/* FEEDBACK INMEDIATO AL TOPE (CERO SCROLL) */}
      {state.ok ? (
        <div className="rounded-[12px] border border-ok/40 bg-ok/10 p-3.5 flex items-center gap-3 animate-fade-in">
          <div className="size-6 rounded-full bg-ok/20 text-ok grid place-items-center shrink-0">
            <Check className="size-3.5 stroke-[3]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-ok">{state.ok}</p>
            <p className="text-[11px] text-ink-soft">
              Los cambios ya se guardaron y están activos en tu gimnasio.
            </p>
          </div>
        </div>
      ) : null}

      {state.error ? (
        <div
          className="rounded-[12px] border border-danger/40 bg-danger/10 p-3.5 flex items-center gap-3 animate-fade-in"
          role="alert"
        >
          <div className="size-6 rounded-full bg-danger/20 text-danger grid place-items-center shrink-0">
            <AlertCircle className="size-3.5 stroke-[2.5]" />
          </div>
          <p className="text-xs font-medium text-danger">{state.error}</p>
        </div>
      ) : null}

      {/* TARJETA PRINCIPAL DEL SWITCH (MÁXIMA VISIBILIDAD) */}
      <div
        className={`rounded-[16px] border p-4 transition-all duration-200 ${
          checked
            ? "border-volt/60 bg-volt/5 shadow-[0_0_24px_rgba(16,231,160,0.12)]"
            : "border-rule bg-paper-2"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  checked
                    ? "bg-volt/20 text-volt border border-volt/40"
                    : "bg-paper-3 text-ink-soft border border-rule"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    checked ? "bg-volt animate-pulse" : "bg-ink-soft/40"
                  }`}
                />
                {checked ? "Asistente Activado" : "Asistente Desactivado"}
              </span>
            </div>
            <h3 className="text-sm font-bold text-ink">Activar asistente IA</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Avisos por riesgo de abandono, cumpleaños y balance mensual redactados automáticamente por inteligencia artificial.
            </p>
          </div>

          <div className="shrink-0 flex items-center pt-1">
            <Toggle
              name="activo"
              checked={checked}
              onCheckedChange={setChecked}
              disabled={pending}
            />
          </div>
        </div>

        {/* BARRA DE ACCIÓN DIRECTA (BOTÓN VISIBLE SIN SCROLL) */}
        <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink-soft font-mono">
            Uso mensual:{" "}
            <strong className="text-ink">
              {llamadasUsadas} / {techoMensual}
            </strong>
          </span>

          <Button
            type="submit"
            loading={pending}
            className="h-9 px-4 text-xs font-semibold"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
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
    </form>

    {/* PLANTILLA DE CUMPLEAÑOS: editable a mano, se cachea y se reusa para
       todos los socios (solo cambia el nombre) — no se regenera con IA en
       cada cumpleaños. */}
    <form
      action={formActionPlantilla}
      className="mt-4 rounded-[12px] border border-rule/80 bg-paper-1/60 p-4 space-y-3"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <div className="flex items-center gap-2">
        <span className="text-base select-none">🎂</span>
        <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
          Plantilla de saludo de cumpleaños
        </h4>
      </div>
      <p className="text-[11px] text-ink-soft leading-relaxed">
        Se genera una vez con IA y se reutiliza para todos los socios (solo
        cambia el nombre) — no se redacta de nuevo en cada cumpleaños. Si
        querés un tono distinto, editala acá. Usá{" "}
        <code className="text-[10px] bg-paper-2 border border-rule/50 rounded px-1 py-0.5">
          {"{{nombre}}"}
        </code>{" "}
        donde quieras que aparezca el nombre del socio.
      </p>

      {statePlantilla.ok ? (
        <div className="rounded-[10px] border border-ok/40 bg-ok/10 p-2.5 flex items-center gap-2 animate-fade-in">
          <Check className="size-3.5 text-ok stroke-[3] shrink-0" />
          <p className="text-[11px] font-medium text-ok">{statePlantilla.ok}</p>
        </div>
      ) : null}
      {statePlantilla.error ? (
        <div
          className="rounded-[10px] border border-danger/40 bg-danger/10 p-2.5 flex items-center gap-2 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="size-3.5 text-danger stroke-[2.5] shrink-0" />
          <p className="text-[11px] font-medium text-danger">{statePlantilla.error}</p>
        </div>
      ) : null}

      <textarea
        name="plantilla_cumpleanos"
        value={plantilla}
        onChange={(e) => setPlantilla(e.target.value)}
        rows={3}
        placeholder="Vacío = se genera automáticamente con IA la primera vez que un socio cumple años."
        className="w-full rounded-[10px] border border-rule bg-paper-2 p-2.5 text-xs text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-ink-soft">
          {plantilla ? "Plantilla guardada" : "Todavía no se generó ninguna"}
        </span>
        <Button
          type="submit"
          loading={pendingPlantilla}
          className="h-8 px-3.5 text-[11px] font-semibold"
        >
          {pendingPlantilla ? "Guardando…" : "Guardar plantilla"}
        </Button>
      </div>
    </form>
    </>
  );
}
