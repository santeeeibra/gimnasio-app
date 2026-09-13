"use client";

import { useState } from "react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { hapticoImpactoSuave, iniciarAudioHaptico, hapticoExito } from "@/lib/ui/hapticos";
import { buscarReemplazoMaquinaOcupada, obtenerTipsTecnica } from "@/app/mi/rutina/asistente-actions";

type Mensaje = { id: string; role: "pulpo" | "user"; tipo: "texto" | "alternativas"; contenido: string; payload?: any };

export function PulpoAsistenteChat({ ejercicioId, trigger }: { ejercicioId?: string; trigger: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [posePulpo, setPosePulpo] = useState<'saludo' | 'buscando' | 'tecnica' | 'exito' | 'error'>('saludo');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { id: "1", role: "pulpo", tipo: "texto", contenido: "¡Hola! Soy Volt 🐙. ¿Con qué te ayudo en este ejercicio?" }
  ]);

  const abrir = () => {
    iniciarAudioHaptico();
    hapticoImpactoSuave();
    setAbierto(true);
  };

  const cerrar = () => {
    hapticoImpactoSuave();
    setAbierto(false);
    setTimeout(() => setMensajes([mensajes[0]]), 300); // reset al cerrar
  };

  const handleMaquinaOcupada = async () => {
    if (!ejercicioId) return;
    hapticoImpactoSuave();
    setMensajes((prev) => [...prev, { id: Date.now().toString(), role: "user", tipo: "texto", contenido: "La máquina está ocupada" }]);
    setCargando(true); setPosePulpo('buscando');
    
    const res = await buscarReemplazoMaquinaOcupada(ejercicioId);
    setCargando(false);
    
    if (res.error) { setPosePulpo('error');
      setMensajes((prev) => [...prev, { id: Date.now().toString(), role: "pulpo", tipo: "texto", contenido: "Mmm, hubo un error buscando. ¡Avisale al staff!" }]);
      return;
    }
    
    if (res.alternativas.length === 0) { setPosePulpo('error');
      setMensajes((prev) => [...prev, { id: Date.now().toString(), role: "pulpo", tipo: "texto", contenido: "Parece que no hay alternativas registradas para este músculo en tu gym actual." }]);
      return;
    }

    hapticoExito(); setPosePulpo('exito');
    setMensajes((prev) => [
      ...prev,
      { 
        id: Date.now().toString(), 
        role: "pulpo", 
        tipo: "alternativas", 
        contenido: "¡Acá tenés alternativas que trabajan igual pero con otro equipo!", 
        payload: res.alternativas 
      }
    ]);
  };

  const handleTecnica = async () => {
    if (!ejercicioId) return;
    hapticoImpactoSuave();
    setMensajes((prev) => [...prev, { id: Date.now().toString(), role: "user", tipo: "texto", contenido: "No sé hacer esto" }]);
    setCargando(true); setPosePulpo('buscando');
    
    const res = await obtenerTipsTecnica(ejercicioId);
    setCargando(false);

    if (res.error) { setPosePulpo('error');
      setMensajes((prev) => [...prev, { id: Date.now().toString(), role: "pulpo", tipo: "texto", contenido: "No tengo los tips de este ejercicio en la base." }]);
      return;
    }

    hapticoExito(); setPosePulpo("tecnica");
    setMensajes((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "pulpo", tipo: "texto", contenido: res.ejercicio.descripcion || "¡Mantené la espalda recta y controlá la bajada!" }
    ]);
  };

  return (
    <>
      <div onClick={abrir}>{trigger}</div>

      {/* Backdrop */}
      {abierto && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" 
          onClick={cerrar}
          aria-hidden
        />
      )}

      {/* Bottom Sheet */}
      <div 
        className={ixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]  + 
        (abierto ? "translate-y-0" : "translate-y-full")}
      >
        <div className="mx-auto max-w-md bg-zinc-950 rounded-t-[24px] shadow-2xl border-t border-zinc-800 flex flex-col h-[75vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <div className="flex-shrink-0 w-12 h-12 rounded-[12px] bg-zinc-950 border border-emerald-500/30 overflow-hidden shadow-[0_0_15px_rgba(16,231,160,0.15)] grid place-items-center"><img src={`/mascota/chat/${posePulpo}.${posePulpo === "error" ? "png" : "svg"}`} alt="Volt" className="w-10 h-10 object-contain drop-shadow-md transition-all duration-300" /></div>
            <div>
              <h3 className="text-white font-bold tracking-wide text-sm">Volt IA</h3>
              <p className="text-emerald-400 text-xs font-medium">Asistente en línea</p>
            </div>
            <button onClick={cerrar} className="ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 active:scale-95 transition-transform">
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mensajes.map((m) => (
              <div key={m.id} className={lex flex-col }>
                <div className={px-4 py-2.5 rounded-[18px] max-w-[85%] text-sm }>
                  {m.contenido}
                </div>

                {m.tipo === "alternativas" && m.payload && (
                  <div className="mt-2 space-y-2 w-full max-w-[85%]">
                    {m.payload.map((alt: any) => (
                      <div key={alt.id} className="p-3 bg-zinc-900 rounded-[14px] border border-zinc-800 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{alt.nombre}</p>
                          <p className="text-xs text-zinc-500 capitalize">{alt.equipo}</p>
                        </div>
                        <button className="text-xs font-bold bg-zinc-800 text-emerald-400 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                          Cambiar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {cargando && (
              <div className="flex items-start">
                <div className="px-4 py-3 bg-zinc-800 rounded-[18px] rounded-bl-sm text-emerald-400 flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950 space-y-2 pb-safe">
            <p className="text-xs text-zinc-500 font-medium px-1 mb-2">ACCIONES RÁPIDAS</p>
            <div className="flex gap-2 overflow-x-auto snap-x pb-2 hide-scrollbar">
              <button 
                onClick={handleMaquinaOcupada}
                disabled={cargando || !ejercicioId}
                className="snap-start shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-200 px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
              >
                🔄 Máquina Ocupada
              </button>
              <button 
                onClick={handleTecnica}
                disabled={cargando || !ejercicioId}
                className="snap-start shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-200 px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
              >
                ❓ No sé hacerlo
              </button>
              <button 
                disabled={true}
                className="snap-start shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-500 px-4 py-2 rounded-full text-sm font-medium opacity-60"
              >
                ⬆️ Muy fácil
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

