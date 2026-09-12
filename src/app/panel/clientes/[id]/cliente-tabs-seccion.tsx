"use client";

import { useState } from "react";
import { hapticoDial } from "@/lib/ui/hapticos";
import { KeyRound, Dumbbell, Scale, Paperclip } from "lucide-react";

interface ClienteTabsSeccionProps {
  accesoContent: React.ReactNode;
  rutinaContent: React.ReactNode;
  pesoContent: React.ReactNode;
  archivosContent: React.ReactNode;
  tieneRutina: boolean;
}

export function ClienteTabsSeccion({
  accesoContent,
  rutinaContent,
  pesoContent,
  archivosContent,
  tieneRutina,
}: ClienteTabsSeccionProps) {
  const [activeTab, setActiveTab] = useState<"acceso" | "rutina" | "peso" | "archivos">(
    tieneRutina ? "rutina" : "acceso",
  );

  const handleTabChange = (tab: "acceso" | "rutina" | "peso" | "archivos") => {
    hapticoDial();
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Selector de Pills estilo iOS */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-dark border border-rule/60 rounded-[12px] overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange("acceso")}
          className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-[9px] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === "acceso"
              ? "bg-brand text-black font-semibold shadow-sm"
              : "text-ink-soft hover:text-ink hover:bg-surface-elevated/40"
          }`}
        >
          <KeyRound className="size-4 shrink-0" />
          <span>Acceso y Datos</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("rutina")}
          className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-[9px] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === "rutina"
              ? "bg-brand text-black font-semibold shadow-sm"
              : "text-ink-soft hover:text-ink hover:bg-surface-elevated/40"
          }`}
        >
          <Dumbbell className="size-4 shrink-0" />
          <span>Rutina</span>
          {tieneRutina && (
            <span className="size-2 rounded-full bg-ok shrink-0 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("peso")}
          className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-[9px] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === "peso"
              ? "bg-brand text-black font-semibold shadow-sm"
              : "text-ink-soft hover:text-ink hover:bg-surface-elevated/40"
          }`}
        >
          <Scale className="size-4 shrink-0" />
          <span>Peso corporal</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("archivos")}
          className={`flex-1 min-h-[42px] px-3.5 py-2 rounded-[9px] text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === "archivos"
              ? "bg-brand text-black font-semibold shadow-sm"
              : "text-ink-soft hover:text-ink hover:bg-surface-elevated/40"
          }`}
        >
          <Paperclip className="size-4 shrink-0" />
          <span>Archivos</span>
        </button>
      </div>

      {/* Contenido dinámico según Tab activo */}
      <div className="transition-all duration-200">
        {activeTab === "acceso" && (
          <div className="animate-in fade-in-50 duration-150">{accesoContent}</div>
        )}
        {activeTab === "rutina" && (
          <div className="animate-in fade-in-50 duration-150">{rutinaContent}</div>
        )}
        {activeTab === "peso" && (
          <div className="animate-in fade-in-50 duration-150">{pesoContent}</div>
        )}
        {activeTab === "archivos" && (
          <div className="animate-in fade-in-50 duration-150">{archivosContent}</div>
        )}
      </div>
    </div>
  );
}
