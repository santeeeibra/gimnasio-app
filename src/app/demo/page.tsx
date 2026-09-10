"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  Plus,
  RotateCcw,
  Scale,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import { generarPlan } from "@/lib/rutina/motor";
import { CATALOGO_UNIVERSAL_EMERGENCIA } from "@/lib/rutina/fallbacks";
import type { Nivel, Objetivo, PlanGenerado } from "@/lib/rutina/tipos";
import {
  hapticoExito,
  hapticoImpactoMedio,
  hapticoImpactoSuave,
  hapticoSeleccion,
} from "@/lib/ui/hapticos";

export default function DemoPage() {
  const [tab, setTab] = useState<"rutina" | "peso">("rutina");

  // Estado del generador en memoria
  const [objetivo, setObjetivo] = useState<Objetivo>("hipertrofia");
  const [nivel, setNivel] = useState<Nivel>("intermedio");
  const [dias, setDias] = useState<number>(4);
  const [plan, setPlan] = useState<PlanGenerado | null>(null);

  // Estado de peso en memoria
  const [historialPeso, setHistorialPeso] = useState([
    { id: "1", fecha: "01 Sep", peso: 76.5 },
    { id: "2", fecha: "04 Sep", peso: 75.9 },
    { id: "3", fecha: "08 Sep", peso: 75.2 },
  ]);
  const [nuevoPeso, setNuevoPeso] = useState("");

  function handleGenerarRutina() {
    hapticoImpactoMedio();
    const generado = generarPlan(
      {
        objetivo,
        nivel,
        dias,
        preferencia: "gimnasio",
        sexo: "hombre",
        enfasis: [],
        seed: Date.now(),
      },
      [...CATALOGO_UNIVERSAL_EMERGENCIA],
    );
    setPlan(generado);
    hapticoExito();
  }

  function handleAgregarPeso(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(nuevoPeso);
    if (isNaN(val) || val <= 30 || val >= 250) return;

    hapticoImpactoMedio();
    const ahora = new Date();
    const fechaStr = `${ahora.getDate()} ${ahora.toLocaleString("es-AR", { month: "short" })}`;

    setHistorialPeso((prev) => [
      ...prev,
      { id: String(Date.now()), fecha: fechaStr, peso: val },
    ]);
    setNuevoPeso("");
    hapticoExito();
  }

  return (
    <div className="min-h-screen bg-[#0c0d11] text-white flex flex-col font-sans selection:bg-[#10e7a0]/30 selection:text-white">
      {/* Header fijo estilo Apple Glass */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0c0d11]/80 backdrop-blur-xl px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-[#10e7a0]/15 border border-[#10e7a0]/30 flex items-center justify-center text-[#10e7a0] font-bold">
            <Zap className="size-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              SysGym Demo
            </span>
            <span className="text-[11px] text-gray-400 block -mt-0.5">
              Probá el motor en vivo sin registrarte
            </span>
          </div>
        </div>

        <Link
          href="/registrarse"
          onClick={() => hapticoImpactoMedio()}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#10e7a0] text-black text-xs font-bold shadow-[0_0_20px_rgba(16,231,160,0.3)] hover:brightness-105 active:scale-95 transition-all touch-manipulation"
        >
          <span>Crear cuenta gratis</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Banner Explicativo */}
        <div className="rounded-[20px] border border-white/10 bg-gradient-to-br from-[#171922] to-[#12131a] p-5 mb-6 shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-3 relative z-10">
            <div className="size-9 rounded-xl bg-volt/15 text-volt border border-volt/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Motor Científico de Rutinas & Peso
              </h1>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Todo lo que pruebes acá se ejecuta en tiempo real en tu navegador.
                Sin riesgo, sin llamadas a servidores y sin costo.
              </p>
            </div>
          </div>
        </div>

        {/* Segmented Control iOS */}
        <div className="flex rounded-[14px] bg-[#161720] p-1 border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              setTab("rutina");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-[10px] transition-all ${
              tab === "rutina"
                ? "bg-[#10e7a0] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Dumbbell className="size-4" />
            <span>1. Generar Rutina</span>
          </button>
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              setTab("peso");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-[10px] transition-all ${
              tab === "peso"
                ? "bg-[#10e7a0] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Scale className="size-4" />
            <span>2. Control de Peso</span>
          </button>
        </div>

        {/* Tab 1: Rutina */}
        {tab === "rutina" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Controles de Configuración */}
            <div className="rounded-[20px] border border-white/10 bg-[#161720] p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Objetivo Principal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["hipertrofia", "fuerza", "definicion"] as Objetivo[]).map((obj) => (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => {
                        hapticoSeleccion();
                        setObjetivo(obj);
                      }}
                      className={`h-10 rounded-[10px] text-xs font-bold capitalize transition-all border ${
                        objetivo === obj
                          ? "bg-white/15 border-[#10e7a0] text-[#10e7a0]"
                          : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {obj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Nivel de Experiencia
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["principiante", "intermedio", "avanzado"] as Nivel[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        hapticoSeleccion();
                        setNivel(n);
                      }}
                      className={`h-10 rounded-[10px] text-xs font-bold capitalize transition-all border ${
                        nivel === n
                          ? "bg-white/15 border-[#10e7a0] text-[#10e7a0]"
                          : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Días por semana: {dias} días
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        hapticoSeleccion();
                        setDias(num);
                      }}
                      className={`flex-1 h-10 rounded-[10px] text-xs font-bold transition-all border ${
                        dias === num
                          ? "bg-[#10e7a0] border-[#10e7a0] text-black"
                          : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerarRutina}
                className="w-full h-12 rounded-[12px] bg-[#10e7a0] text-black font-bold text-sm tracking-wide shadow-[0_4px_24px_rgba(16,231,160,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Sparkles className="size-4" />
                <span>Generar rutina con evidencia científica</span>
              </button>
            </div>

            {/* Resultado del Plan Generado */}
            {plan && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#10e7a0]" />
                    <span>Plan armado: {plan.dias.length} días de entrenamiento</span>
                  </h2>
                  <button
                    type="button"
                    onClick={handleGenerarRutina}
                    className="text-xs text-[#10e7a0] hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" />
                    <span>Regenerar</span>
                  </button>
                </div>

                {plan.dias.map((dia, idx) => (
                  <div
                    key={idx}
                    className="rounded-[16px] border border-white/10 bg-[#161720] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-sm text-[#10e7a0]">
                        Día {idx + 1}: {dia.titulo || "Entrenamiento"}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {dia.items.length} ejercicios
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dia.items.map((item, itemIdx) => {
                        const ejObj = CATALOGO_UNIVERSAL_EMERGENCIA.find(
                          (e) => e.slug === item.ejercicio_slug,
                        );
                        const nombre = ejObj?.nombre ?? item.ejercicio_slug.replace(/-/g, " ");
                        const grupo = ejObj?.grupo_muscular ?? "cuerpo completo";

                        return (
                          <div
                            key={itemIdx}
                            className="flex items-center justify-between py-1.5 px-2.5 rounded-[8px] bg-black/20 border border-white/5 text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-white block truncate">
                                {nombre}
                              </span>
                              <span className="text-[10px] text-gray-400 capitalize">
                                {item.rol ?? "ejercicio"} • {grupo}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#10e7a0] block">
                                {item.series} × {item.repeticiones}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {item.nota}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Control de Peso */}
        {tab === "peso" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Card de Registro */}
            <div className="rounded-[20px] border border-white/10 bg-[#161720] p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Scale className="size-4 text-[#10e7a0]" />
                <span>Registrar pesaje</span>
              </h2>

              <form onSubmit={handleAgregarPeso} className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 74.8"
                  value={nuevoPeso}
                  onChange={(e) => setNuevoPeso(e.target.value)}
                  className="flex-1 h-12 rounded-[12px] bg-black/40 border border-white/10 px-4 text-white text-base outline-none focus:border-[#10e7a0]"
                />
                <button
                  type="submit"
                  className="h-12 px-5 rounded-[12px] bg-[#10e7a0] text-black font-bold text-sm tracking-wide active:scale-95 transition-transform flex items-center gap-2 shrink-0"
                >
                  <Plus className="size-4" />
                  <span>Anotar</span>
                </button>
              </form>
            </div>

            {/* Resumen & Progresión en Memoria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[16px] border border-white/10 bg-[#161720] p-4">
                <span className="text-xs text-gray-400 block mb-1">Último peso</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">
                    {historialPeso[historialPeso.length - 1]?.peso ?? "--"}
                  </span>
                  <span className="text-xs text-gray-400 font-bold">kg</span>
                </div>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-[#161720] p-4">
                <span className="text-xs text-gray-400 block mb-1">Evolución</span>
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm mt-1">
                  <TrendingDown className="size-4" />
                  <span>-1.3 kg en 7 días</span>
                </div>
              </div>
            </div>

            {/* Lista Histórica */}
            <div className="rounded-[20px] border border-white/10 bg-[#161720] p-5 space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Historial de registros
              </span>

              <div className="space-y-2">
                {historialPeso.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2.5 px-3.5 rounded-[10px] bg-black/30 border border-white/5"
                  >
                    <span className="text-xs text-gray-300 font-medium">
                      {item.fecha}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {item.peso} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Barra fija inferior con CTA para convertir visitantes */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0c0d11]/90 backdrop-blur-xl p-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="min-w-0 pr-3">
          <p className="text-xs font-bold text-white truncate">
            ¿Te gustó? Guardá tus progresos
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            Plan individual o entrenador para tus clientes
          </p>
        </div>

        <Link
          href="/registrarse"
          onClick={() => hapticoImpactoMedio()}
          className="h-11 px-5 rounded-[12px] bg-[#10e7a0] text-black font-bold text-xs tracking-wide shadow-[0_0_24px_rgba(16,231,160,0.4)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 touch-manipulation"
        >
          <span>Crear mi cuenta gratis</span>
          <ArrowRight className="size-4" />
        </Link>
      </footer>
    </div>
  );
}
