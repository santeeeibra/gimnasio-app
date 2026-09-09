"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { registrarGimnasio, RegistroState } from "./actions";
import { hapticoImpactoSuave, hapticoExito } from "@/lib/ui/hapticos";

export default function RegistroGimnasioPage() {
  const [tipoCuenta, setTipoCuenta] = useState<"dueno" | "solo">("dueno");
  const [state, formAction, isPending] = useActionState<RegistroState, FormData>(
    registrarGimnasio,
    {}
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans flex flex-col justify-between p-4 sm:p-6 selection:bg-[#c8ff00] selection:text-black">
      {/* Visual background element */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(circle_at_center,rgba(200,255,0,0.1),transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md mx-auto w-full pt-2 pb-6">
        <Link
          href="/"
          onClick={() => hapticoImpactoSuave()}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <span>← Volver a la web</span>
        </Link>
        <div className="flex items-center gap-2">
          <Image src="/logo-sysgym.png" alt="SysGym" width={24} height={24} className="object-contain" />
          <span className="font-extrabold text-sm text-white">Sys<span className="text-[#c8ff00]">Gym</span></span>
        </div>
      </header>

      {/* Main Card */}
      <main className="relative z-10 max-w-md mx-auto w-full bg-[#121214] border border-white/10 rounded-[24px] p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#18181c] border border-[#c8ff00]/30 p-2 mx-auto mb-3 flex items-center justify-center shadow-[0_0_20px_rgba(200,255,0,0.15)]">
            <Image
              src="/mascota/expresiones/01_feliz.png"
              alt="Mascota SysGym"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Creá tu cuenta en SysGym
          </h1>
          <p className="text-xs text-neutral-400">
            Elegí cómo querés usar la plataforma para comenzar de inmediato.
          </p>
        </div>

        {/* Account Type Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#18181c] border border-white/10 rounded-[16px] mb-6">
          <button
            type="button"
            onClick={() => {
              hapticoImpactoSuave();
              setTipoCuenta("dueno");
            }}
            className={`py-2.5 px-3 rounded-[12px] text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
              tipoCuenta === "dueno"
                ? "bg-[#c8ff00] text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span className="text-sm">🏢 Gimnasio / Trainer</span>
            <span className="text-[10px] font-semibold opacity-80">Prueba 14 días gratis</span>
          </button>

          <button
            type="button"
            onClick={() => {
              hapticoImpactoSuave();
              setTipoCuenta("solo");
            }}
            className={`py-2.5 px-3 rounded-[12px] text-xs font-bold transition-all text-center flex flex-col items-center gap-0.5 ${
              tipoCuenta === "solo"
                ? "bg-[#c8ff00] text-black shadow-md"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <span className="text-sm">🏋️‍♂️ Atleta Solo</span>
            <span className="text-[10px] font-semibold opacity-80">Rutinas + Progreso</span>
          </button>
        </div>

        {/* Error Notification */}
        {state.error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-[14px] text-xs font-semibold text-rose-400 text-center animate-shake">
            ⚠️ {state.error}
          </div>
        )}

        {/* Form */}
        <form action={formAction} onSubmit={() => hapticoExito()} className="space-y-4">
          <input type="hidden" name="tipoCuenta" value={tipoCuenta} />

          {/* Conditional field: Gym Name */}
          {tipoCuenta === "dueno" && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                Nombre de tu Gimnasio / Centro
              </label>
              <input
                type="text"
                name="nombreGimnasio"
                required={tipoCuenta === "dueno"}
                placeholder="Ej. Gimnasio Olimpo / LR Fitness"
                className="w-full px-4 py-3 bg-[#18181c] border border-white/10 rounded-[14px] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c8ff00] transition-colors"
              />
            </div>
          )}

          {/* User Full Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Tu Nombre Completo
            </label>
            <input
              type="text"
              name="nombreDueno"
              required
              placeholder="Ej. Juan Pérez"
              className="w-full px-4 py-3 bg-[#18181c] border border-white/10 rounded-[14px] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c8ff00] transition-colors"
            />
          </div>

          {/* Document / DNI */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              DNI / Documento de Identidad
            </label>
            <input
              type="text"
              name="dni"
              required
              placeholder="Sin puntos ni guiones (Ej. 38111222)"
              className="w-full px-4 py-3 bg-[#18181c] border border-white/10 rounded-[14px] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c8ff00] transition-colors"
            />
          </div>

          {/* Recovery Email */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Email <span className="text-neutral-500 font-normal lowercase">(opcional para recuperar clave)</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-3 bg-[#18181c] border border-white/10 rounded-[14px] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c8ff00] transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              Contraseña de Acceso
            </label>
            <input
              type="password"
              name="clave"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 bg-[#18181c] border border-white/10 rounded-[14px] text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c8ff00] transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-4 bg-[#c8ff00] hover:bg-[#b5e600] text-black font-extrabold text-sm rounded-[16px] shadow-[0_0_20px_rgba(200,255,0,0.25)] transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? (
              <span>Creando tu cuenta...</span>
            ) : (
              <>
                <span>⚡</span>
                <span>
                  {tipoCuenta === "dueno"
                    ? "Crear Gimnasio & Iniciar Prueba 14 Días"
                    : "Comenzar como Atleta Solo"}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-500">
          ¿Ya tenés una cuenta registrada?{" "}
          <Link
            href="/login"
            onClick={() => hapticoImpactoSuave()}
            className="text-[#c8ff00] font-bold hover:underline"
          >
            Ingresá acá
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-neutral-600">
        SysGym SaaS © {new Date().getFullYear()} — Plataforma de Entrenamiento de Alto Rendimiento
      </footer>
    </div>
  );
}
