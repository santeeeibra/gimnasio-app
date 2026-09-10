"use client";

import { useState } from "react";
import { Calendar, Check, ChevronDown, Download, ExternalLink } from "lucide-react";
import {
  generarGoogleCalendarUrl,
  descargarIcsEntrenamiento,
  abrirAppleCalendar,
  type EventoEntrenamiento,
} from "@/lib/calendar/google-calendar";
import { hapticoImpactoSuave, hapticoSeleccion } from "@/lib/ui/hapticos";

export interface BotonGoogleCalendarProps {
  tituloPlan: string;
  gimnasioNombre: string;
  dias: Array<{
    numero: number;
    titulo: string;
    items: Array<{
      ejercicio: { nombre: string } | null;
      series: number;
      repeticiones: string;
      nota?: string;
    }>;
  }>;
}

export function BotonGoogleCalendar({
  tituloPlan,
  gimnasioNombre,
  dias,
}: BotonGoogleCalendarProps) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Armar el resumen de la rutina para Calendario
  const armarEvento = (diaIndex?: number): EventoEntrenamiento => {
    if (typeof diaIndex === "number" && dias[diaIndex]) {
      const d = dias[diaIndex];
      const listaEjercicios = d.items
        .map(
          (it, i) =>
            `${i + 1}. ${it.ejercicio?.nombre ?? "Ejercicio"} - ${it.series}x${it.repeticiones}${it.nota ? ` (${it.nota})` : ""}`,
        )
        .join("\n");

      return {
        titulo: `SysGym: ${d.titulo || `Día ${d.numero}`}`,
        descripcion: `Entrenamiento programado en ${gimnasioNombre}:\n\n${listaEjercicios}\n\nPlan: ${tituloPlan}\nRegistrado en SysGym.`,
        ubicacion: gimnasioNombre,
        recurrenteSemanal: true,
      };
    }

    // Plan general completo
    const resumenDias = dias
      .map((d) => {
        const exs = d.items
          .map((it) => `• ${it.ejercicio?.nombre ?? "Ejercicio"} (${it.series}x${it.repeticiones})`)
          .join("\n");
        return `[${d.titulo || `Día ${d.numero}`}]\n${exs}`;
      })
      .join("\n\n");

    return {
      titulo: `SysGym: Rutina ${tituloPlan}`,
      descripcion: `Plan de entrenamiento semanal en ${gimnasioNombre}:\n\n${resumenDias}\n\nSeguimiento en SysGym.`,
      ubicacion: gimnasioNombre,
      recurrenteSemanal: true,
    };
  };

  const handleAbrirGoogle = (diaIndex?: number) => {
    hapticoImpactoSuave();
    const evento = armarEvento(diaIndex);
    const url = generarGoogleCalendarUrl(evento);
    window.open(url, "_blank", "noopener,noreferrer");
    setAbierto(false);
  };

  const handleAbrirApple = (diaIndex?: number) => {
    hapticoImpactoSuave();
    const evento = armarEvento(diaIndex);
    abrirAppleCalendar(evento);
    setAbierto(false);
  };

  const handleDescargarIcs = (diaIndex?: number) => {
    hapticoImpactoSuave();
    const evento = armarEvento(diaIndex);
    descargarIcsEntrenamiento(evento);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    setAbierto(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => {
          hapticoSeleccion();
          setAbierto((v) => !v);
        }}
        className="group inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 active:scale-95 text-ink border border-rule transition-all duration-150 touch-manipulation cursor-pointer shadow-xs"
        aria-expanded={abierto}
        aria-label="Agregar a Calendario"
      >
        <Calendar className="size-3.5 text-accent" />
        <span>Agendar en Calendario</span>
        <ChevronDown
          className={`size-3 transition-transform duration-200 text-ink-soft ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute left-0 mt-1.5 w-[min(17rem,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#1a1d26] p-1.5 text-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-white/10 mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sincronizar entrenamiento
              </p>
              <p className="text-xs text-slate-300">
                Recordatorios semanales en tu calendario
              </p>
            </div>

            {/* Opción Apple Calendar (iOS / Mac) */}
            <button
              type="button"
              onClick={() => handleAbrirApple()}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <svg className="size-4 shrink-0 fill-current text-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.73-14.44-6.3-10.02-11.28-21.57-14.93-34.66-3.65-13.09-5.48-25.04-5.48-35.85 0-14.36 3.65-26.31 10.95-35.85 7.3-9.54 16.5-14.37 27.6-14.49 5.86 0 12.18 1.48 18.96 4.45 6.78 2.97 10.95 4.51 12.51 4.62 1.34 0 5.86-1.74 13.56-5.22 7.7-3.48 14.13-4.99 19.3-4.52 14.38.65 25.59 6.29 33.64 16.92-12.82 7.74-19.11 18.28-18.87 31.62.24 10.45 4.3 19.13 12.18 26.04 4.13 3.69 8.8 6.3 14.02 7.82-2.83 8.27-6.53 16.86-11.11 25.77zM119.22 33.15c0-7.83 2.76-15.08 8.27-21.75 5.51-6.67 12.33-10.87 20.47-12.6 0 .33.05.77.16 1.31.11.55.16 1.04.16 1.48 0 7.73-2.94 15.22-8.83 22.48-5.89 7.26-12.85 11.51-20.88 12.76-.11-1.2-.35-2.43-.35-3.68z" />
                </svg>
                <span>Apple Calendar (iOS / Mac)</span>
              </div>
              <ExternalLink className="size-3.5 text-slate-400 group-hover:text-white" />
            </button>

            {/* Opción Google Calendar */}
            <button
              type="button"
              onClick={() => handleAbrirGoogle()}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google Calendar (Android / Web)</span>
              </div>
              <ExternalLink className="size-3.5 text-slate-400 group-hover:text-white" />
            </button>

            {dias.length > 1 && (
              <div className="my-1 border-t border-white/5 py-1">
                <span className="block px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Agendar día específico:
                </span>
                {dias.map((d, idx) => (
                  <button
                    key={d.numero}
                    type="button"
                    onClick={() => handleAbrirGoogle(idx)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <span className="truncate">{d.titulo || `Día ${d.numero}`}</span>
                    <span className="text-[10px] text-slate-400">Google ↗</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-white/10 pt-1 mt-1">
              <button
                type="button"
                onClick={() => handleDescargarIcs()}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="size-3.5 text-slate-400" />
                  <span>Descargar archivo .ics (Apple/Outlook)</span>
                </div>
                {copiado && <Check className="size-3.5 text-emerald-400" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
