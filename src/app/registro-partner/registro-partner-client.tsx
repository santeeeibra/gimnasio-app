"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Percent,
  Award,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  Lock,
  Phone,
} from "lucide-react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { useHapticos } from "@/lib/ui/hapticos";
import type { PartnerTier } from "@/types/partner";
import { registrarPartnerAction, type RegistroPartnerState } from "./actions";

export function RegistroPartnerClient({ tiers }: { tiers: PartnerTier[] }) {
  const hapticos = useHapticos();

  // partner_tiers es la única fuente de verdad para % y bonos (ver
  // panel/partner). El server component ya filtra el caso vacío antes de
  // renderizar este componente, pero estos valores nunca deben caer a
  // números hardcodeados si por algo llegaran vacíos.
  const ascendente = [...tiers].sort((a, b) => a.min_active_gyms - b.min_active_gyms);
  const arranque = ascendente[0];
  const estandar = ascendente[1] ?? arranque;
  const hitos = ascendente.filter(
    (t) => t.min_active_gyms > 0 && Number(t.milestone_bonus_amount) > 0
  );
  const bonosTotales = hitos.reduce((acc, t) => acc + Number(t.milestone_bonus_amount), 0);
  const bonosDetalle = hitos
    .map((t) => `$${Number(t.milestone_bonus_amount).toLocaleString("es-AR")} (${t.min_active_gyms} gyms)`)
    .join(", ");
  const [state, formAction, isPending] = useActionState<RegistroPartnerState, FormData>(
    registrarPartnerAction,
    {}
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-between p-4 sm:p-6 selection:bg-[#10e7a0] selection:text-black">
      {/* Resplandor radial de fondo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.12),transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-md mx-auto w-full pt-2 pb-6">
        <Link
          href="/"
          onClick={() => hapticos.suave()}
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          ← Volver al inicio
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-white tracking-tight">
            Sys<span className="text-[#10e7a0]">Gym</span> Partner
          </span>
        </div>
      </header>

      {/* Tarjeta Principal */}
      <main className="relative z-10 max-w-md mx-auto w-full bg-[#121214] border border-white/10 rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6 animate-fade-in">
        {/* Mascota y Titular */}
        <div className="flex flex-col items-center text-center space-y-3">
          <PulpoCard
            size={72}
            pose="kettlebell"
            cardClassName="!bg-zinc-900 !border-emerald-500/40 shadow-emerald-500/10"
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#10e7a0] text-[11px] font-bold tracking-wider uppercase">
            <ShieldCheck className="size-3.5" />
            <span>Colaboradores y Referidos B2B</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            Activá tu cuenta de Partner
          </h1>

          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
            Recomendá SysGym a dueños de gimnasios o boxes y recibí comisiones recurrentes en tu cuenta.
          </p>
        </div>

        {/* Beneficios clave */}
        <div className="rounded-[16px] bg-zinc-900/80 border border-zinc-800 p-3.5 space-y-2 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <div className="p-1 rounded-[10px] bg-emerald-500/20 text-[#10e7a0]">
              <Percent className="size-3.5" />
            </div>
            <span><strong>{arranque.commission_pct}% en tus primeros {estandar.min_active_gyms} gimnasios</strong> ({estandar.commission_pct}% estándar luego) en su primer pago.</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <div className="p-1 rounded-[10px] bg-purple-500/20 text-purple-400">
              <Award className="size-3.5" />
            </div>
            <span><strong>${bonosTotales.toLocaleString("es-AR")} ARS en Bonos</strong>: {bonosDetalle}.</span>
          </div>
        </div>

        {/* Banner Comunidad WhatsApp Oficial */}
        <a
          href="https://chat.whatsapp.com/BahGi6pehnB6Iq7M1fW5Y4"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => hapticos.suave()}
          className="flex items-center justify-between p-3 rounded-[14px] bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-xs group"
        >
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-[10px] bg-emerald-500/20 text-[#10e7a0] flex items-center justify-center font-bold">
              💬
            </div>
            <div>
              <p className="font-bold text-white group-hover:text-[#10e7a0] transition-colors">
                Comunidad Oficial de Partners
              </p>
              <p className="text-[11px] text-zinc-400">
                Sumate al grupo de WhatsApp con otros colaboradores
              </p>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-zinc-400 group-hover:text-[#10e7a0] group-hover:translate-x-0.5 transition-all" />
        </a>

        {/* Formulario */}
        <form
          action={formAction}
          onSubmit={() => hapticos.medio()}
          className="space-y-4"
        >
          {state.error && (
            <div className="p-3 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              {state.error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Tu nombre y apellido
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                name="nombre"
                required
                placeholder="ej. Martín Benítez"
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-zinc-900 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-[#10e7a0] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Tu email de contacto
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
              <input
                type="email"
                name="email"
                required
                placeholder="martin@ejemplo.com"
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-zinc-900 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-[#10e7a0] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Contraseña para tu panel
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
              <input
                type="password"
                name="clave"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-zinc-900 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-[#10e7a0] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-1">
              Teléfono / WhatsApp <span className="text-zinc-600">(opcional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 pointer-events-none" />
              <input
                type="tel"
                name="telefono"
                placeholder="ej. +54 9 11 1234-5678"
                className="w-full h-11 pl-9 pr-3 rounded-[12px] bg-zinc-900 border border-zinc-700/80 text-white text-sm focus:outline-none focus:border-[#10e7a0] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-[14px] bg-[#10e7a0] hover:bg-[#10e7a0]/90 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            <span>{isPending ? "Creando tu cuenta…" : "Activar mi cuenta de Partner"}</span>
            <ArrowRight className="size-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-zinc-400">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#10e7a0] hover:underline"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} SysGym · Programa Oficial de Partners
      </footer>
    </div>
  );
}
