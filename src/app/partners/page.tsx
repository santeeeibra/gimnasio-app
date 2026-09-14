import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Percent,
  Award,
  Sparkles,
  ArrowRight,
  Link2,
  Users,
  Wallet,
  Gift,
  Play,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PartnerTier } from "@/types/partner";

export const metadata: Metadata = {
  title: "SysGym Partner — Recomendá gimnasios y ganá comisión",
  description:
    "Sumate al programa oficial de partners de SysGym: comisión sobre el primer pago de cada gimnasio que refieras, más bonos en efectivo por hitos.",
};

export const dynamic = "force-dynamic";

async function traerTiers(): Promise<PartnerTier[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("partner_tiers")
    .select("id, name, min_active_gyms, commission_pct, milestone_bonus_amount")
    .order("min_active_gyms", { ascending: true });
  return (data ?? []) as PartnerTier[];
}

export default async function PartnersLandingPage() {
  const tiers = await traerTiers();

  // Si por algún motivo no se pudo leer partner_tiers, no mostramos montos
  // inventados en una landing pública — mismo criterio que el dashboard.
  if (tiers.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-bold">SysGym Partner</h1>
          <p className="text-sm text-zinc-400">
            No pudimos cargar la información del programa en este momento. Probá recargar la página en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  const ascendente = [...tiers].sort((a, b) => a.min_active_gyms - b.min_active_gyms);
  const arranque = ascendente[0];
  const estandar = ascendente[1] ?? arranque;
  const hitos = ascendente.filter((t) => t.min_active_gyms > 0 && Number(t.milestone_bonus_amount) > 0);
  const bonosTotales = hitos.reduce((acc, t) => acc + Number(t.milestone_bonus_amount), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#10e7a0] selection:text-black">
      {/* Fondo con resplandor radial, mismo lenguaje visual que /registro-partner */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.14),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.05),transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 bg-[#0a0a0a] border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight text-white">
            Sys<span className="text-[#10e7a0]">Gym</span>
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-[#10e7a0] border border-emerald-500/30 px-2 py-0.5 rounded-full">
            Partners
          </span>
        </Link>
        <Link
          href="/registro-partner"
          className="h-9 px-4 rounded-[10px] bg-[#10e7a0] text-zinc-950 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-[#10e7a0]/90 transition-colors"
        >
          <span>Sumarme ahora</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="pt-14 sm:pt-20 pb-12 text-center space-y-6">
          <div className="flex justify-center">
            <PulpoCard
              size={84}
              pose="kettlebell"
              cardClassName="!bg-zinc-900/80 !border-emerald-500/40 shadow-emerald-500/10"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#10e7a0] text-xs font-bold tracking-wide">
            <ShieldCheck className="size-4" />
            <span>PROGRAMA OFICIAL SYSGYM PARTNER</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto text-white">
            Monetizá tu red de contactos del mundo fitness
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Recomendá SysGym a dueños de gimnasios y boxes. Ganá hasta{" "}
            <strong className="text-[#10e7a0]">{arranque.commission_pct}% de comisión</strong> en tus
            primeros {estandar.min_active_gyms} gimnasios, más{" "}
            <strong className="text-[#10e7a0]">
              ${bonosTotales.toLocaleString("es-AR")} ARS en bonos
            </strong>{" "}
            por hitos alcanzados.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/registro-partner"
              className="h-12 px-6 rounded-[14px] bg-[#10e7a0] hover:bg-[#10e7a0]/90 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10"
            >
              <span>Generar mi código de partner</span>
              <ArrowRight className="size-4" />
            </Link>
            <span className="text-xs text-zinc-500">Gratis, sin compromiso · activás la cuenta en 1 minuto</span>
          </div>
        </section>

        {/* ── Cómo funciona ─────────────────────────────────────────────── */}
        <section className="py-12 border-t border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 text-white">Cómo funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2.5">
              <div className="size-9 rounded-[12px] bg-emerald-500/15 text-[#10e7a0] flex items-center justify-center font-bold">
                <Link2 className="size-4" />
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Paso 1</span>
              <h3 className="text-sm font-bold text-white">Generás tu código</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Te registrás en 1 minuto y te asignamos un código de referido único y un link para compartir.
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2.5">
              <div className="size-9 rounded-[12px] bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                <Users className="size-4" />
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Paso 2</span>
              <h3 className="text-sm font-bold text-white">Tus referidos empiezan gratis</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El dueño se registra con tu link y prueba SysGym sin pagar nada hasta 40 alumnos activos. Cero fricción para que digan que sí.
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2.5">
              <div className="size-9 rounded-[12px] bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                <Wallet className="size-4" />
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Paso 3</span>
              <h3 className="text-sm font-bold text-white">Cobrás comisión y bonos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cuando el gimnasio pasa a un plan pago, te acreditamos tu comisión directa a tu CBU/CVU o Mercado Pago.
              </p>
            </div>
          </div>
        </section>

        {/* ── Modelo de ganancias ──────────────────────────────────────── */}
        <section className="py-12 border-t border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-white">Modelo de ganancias, sin letra chica</h2>
          <p className="text-xs text-zinc-500 text-center mb-8 max-w-xl mx-auto">
            Comisión única sobre el primer pago de cada gimnasio referido, calculada sobre el monto que efectivamente paga (con descuentos ya aplicados).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="rounded-[20px] border border-emerald-500/30 bg-emerald-500/[0.06] p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-[#10e7a0]">
                <Percent className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Fast-start</span>
              </div>
              <p className="text-2xl font-black">{arranque.commission_pct}%</p>
              <p className="text-xs text-zinc-400">
                en tus primeros {estandar.min_active_gyms} gimnasios activados
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-300">
                <Percent className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Estándar</span>
              </div>
              <p className="text-2xl font-black">{estandar.commission_pct}%</p>
              <p className="text-xs text-zinc-400">
                a partir del gimnasio {estandar.min_active_gyms + 1} en adelante
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">
                Bonos en efectivo por hitos — ${bonosTotales.toLocaleString("es-AR")} ARS en total
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {hitos.map((t, i) => (
                <div key={t.id} className="p-3.5 rounded-[14px] bg-paper/5 bg-black/30 border border-white/10">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">
                    Hito {i + 1} · {t.min_active_gyms} gimnasios
                  </span>
                  <p className="text-lg font-black text-white mt-1">
                    +${Number(t.milestone_bonus_amount).toLocaleString("es-AR")} ARS
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-4">
              "Gimnasio con pago activo" = más de 40 alumnos activos y plan Pro o Elite vigente. Los bonos son acumulativos: al llegar a {hitos[hitos.length - 1]?.min_active_gyms ?? "15"} gimnasios cobrás los {hitos.length} juntos.
            </p>
          </div>
        </section>

        {/* ── Diferenciales ────────────────────────────────────────────── */}
        <section className="py-12 border-t border-white/10">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 text-white">No te dejamos vender solo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2">
              <Gift className="size-5 text-[#10e7a0]" />
              <h3 className="text-sm font-bold text-white">Setup bonificado para tus referidos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hoy el costo de setup (carga de socios, diseño y logo) está 100% bonificado por tiempo limitado — un argumento de cierre extra para que el dueño diga que sí.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2">
              <Play className="size-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Demo interactiva en vivo</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tu cuenta de partner incluye un gimnasio de prueba propio: le mostrás al dueño la app funcionando de verdad, desde tu teléfono, en el momento.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-zinc-900/60 p-5 space-y-2">
              <FileText className="size-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Kit de ventas incluido</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pitch de cierre, comparativa de planes y guía paso a paso para dar de alta a un dueño, todo dentro de tu panel de partner.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA final ─────────────────────────────────────────────────── */}
        <section className="py-16 border-t border-white/10 text-center">
          <div className="max-w-xl mx-auto space-y-5">
            <Sparkles className="size-6 text-[#10e7a0] mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Activá tu cuenta de partner hoy
            </h2>
            <p className="text-sm text-zinc-400">
              Sin costo, sin mínimos ni exclusividad. Generás tu código, compartís tu link y empezás a sumar comisiones desde el primer gimnasio que se active.
            </p>
            <Link
              href="/registro-partner"
              className="h-12 px-7 rounded-[14px] bg-[#10e7a0] hover:bg-[#10e7a0]/90 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/10"
            >
              <span>Quiero ser partner</span>
              <ArrowRight className="size-4" />
            </Link>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              <CheckCircle2 className="size-3.5 text-[#10e7a0]" />
              <span>Ya tenés cuenta? </span>
              <Link href="/login" className="font-semibold text-[#10e7a0] hover:underline">
                Iniciá sesión
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-zinc-600 border-t border-white/10">
        © {new Date().getFullYear()} SysGym · Programa Oficial de Partners
      </footer>
    </div>
  );
}
