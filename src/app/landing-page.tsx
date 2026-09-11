"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { hapticoSerieCompletada, hapticoRecordPersonal, hapticoImpactoSuave } from "@/lib/ui/hapticos";
import { PulpoCard } from "@/components/mascota/pulpo";

export default function LandingPage() {
  const [socios, setSocios] = useState(60);
  const [hapticPlayed, setHapticPlayed] = useState(false);

  // Cálculos dinámicos de la calculadora
  const horasAhorradas = Math.round((socios * 0.45));
  const morosidadRecuperada = Math.round(socios * 8.5); // USD aprox o equiv

  const probarHaptico = (tipo: "serie" | "record") => {
    if (tipo === "serie") {
      hapticoSerieCompletada();
    } else {
      hapticoRecordPersonal();
    }
    setHapticPlayed(true);
    setTimeout(() => setHapticPlayed(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Estuve viendo la web de SysGym y me interesa probar el sistema en mi gimnasio (tengo aproximadamente ${socios} socios).`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-[#c8ff00] selection:text-black">
      {/* Background Visual Depth */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(200,255,0,0.12),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(200,255,0,0.05),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 sticky top-0 backdrop-blur-md bg-[#0a0a0a]/80 border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-[10px] overflow-hidden bg-[#161618] border border-[#c8ff00]/30 p-1 flex items-center justify-center">
            <Image
              src="/logo-sysgym.png"
              alt="SysGym Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white">Sys<span className="text-[#c8ff00]">Gym</span></span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-[#c8ff00]/10 text-[#c8ff00] border border-[#c8ff00]/30 px-2 py-0.5 rounded-full">
              SaaS B2B
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            onClick={() => hapticoImpactoSuave()}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-[12px] border border-white/10 transition-colors"
          >
            Ingresar
          </Link>
          <Link
            href="/registro-gimnasio"
            onClick={() => hapticoImpactoSuave()}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-black bg-[#c8ff00] hover:bg-[#b5e600] rounded-[12px] shadow-[0_0_15px_rgba(200,255,0,0.3)] transition-all transform active:scale-95"
          >
            Probar Gratis
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 pt-12 sm:pt-20 pb-16 text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c8ff00]/10 border border-[#c8ff00]/30 text-[#c8ff00] text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <span>⚡</span>
          <span>El Sistema N°1 de Rutinas y Gestión de Gimnasios</span>
        </div>

        {/* Mascot Greeting */}
        <div className="relative mb-6 group cursor-pointer" onClick={() => probarHaptico("serie")}>
          <PulpoCard
            size={84}
            pose="festejo"
            cardClassName="!rounded-full border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,231,160,0.3)] !p-3 transition-transform hover:scale-105"
          />
          <div className="absolute -bottom-2 -right-2 bg-emerald-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border border-black uppercase tracking-wider">
            ¡Tócame!
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl mb-6">
          Automatizá tu gimnasio. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c8ff00] via-lime-400 to-emerald-400">
            Cobrá sin morosidad y armá rutinas en segundos.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-xl text-neutral-400 max-w-2xl mb-8 leading-relaxed">
          La primera app mobile-first con feedback háptico 120fps, notificaciones push sin costo e integración directa con MercadoPago Connect.
        </p>

        {/* CTA Group */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center mb-12">
          <Link
            href="/registro-gimnasio"
            onClick={() => hapticoImpactoSuave()}
            className="w-full sm:w-auto px-8 py-4 text-base font-bold text-black bg-[#c8ff00] hover:bg-[#b5e600] rounded-[16px] shadow-[0_0_25px_rgba(200,255,0,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>⚡</span>
            <span>Crear Cuenta & Probar 14 Días Gratis</span>
          </Link>
          <Link
            href="/login"
            onClick={() => hapticoImpactoSuave()}
            className="w-full sm:w-auto px-6 py-4 text-base font-semibold text-white bg-[#161618] hover:bg-neutral-800 rounded-[16px] border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <span>🔑</span>
            <span>Ingresar como Socio / Dueño</span>
          </Link>
        </div>

        {/* Interactive Haptic Showcase Box */}
        <div className="w-full max-w-2xl bg-[#161618]/90 border border-[#c8ff00]/20 rounded-[20px] p-6 text-left shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📳</span>
              <div>
                <h3 className="text-base font-bold text-white">Probá la Experiencia Sensorial (Háptica)</h3>
                <p className="text-xs text-neutral-400">Si estás en un celular, tocá los botones para sentir la vibración y el sonido sintetizado.</p>
              </div>
            </div>
            {hapticPlayed && (
              <span className="text-xs font-bold text-[#c8ff00] bg-[#c8ff00]/10 border border-[#c8ff00]/30 px-2.5 py-1 rounded-full animate-bounce">
                ¡Háptico Activo! ⚡
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => probarHaptico("serie")}
              className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-[#c8ff00]/50 rounded-[12px] text-xs font-bold text-white flex items-center justify-between transition-all"
            >
              <span>✅ Completar Serie en Sala</span>
              <span className="text-[#c8ff00]">Sentir ⚡</span>
            </button>
            <button
              onClick={() => probarHaptico("record")}
              className="px-4 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-[#c8ff00]/50 rounded-[12px] text-xs font-bold text-white flex items-center justify-between transition-all"
            >
              <span>🏆 Récord Personal (PR)</span>
              <span className="text-[#c8ff00]">Sentir ⚡</span>
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Time & Money Savings Calculator */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        <div className="bg-[#121214] border border-white/10 rounded-[24px] p-6 sm:p-10 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Calculá cuánto tiempo y dinero ahorrás con SysGym
            </h2>
            <p className="text-sm text-neutral-400">
              Deslizá para indicar la cantidad de alumnos/socios activos en tu gimnasio.
            </p>
          </div>

          <div className="max-w-xl mx-auto mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Socios Activos</span>
              <span className="text-2xl font-black text-[#c8ff00] bg-[#c8ff00]/10 px-4 py-1 rounded-full border border-[#c8ff00]/30">
                {socios} socios
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={socios}
              onChange={(e) => {
                setSocios(Number(e.target.value));
                hapticoImpactoSuave();
              }}
              className="w-full h-3 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#c8ff00]"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-bold mt-1">
              <span>10 socios</span>
              <span>150 socios</span>
              <span>300 socios</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#18181c] border border-white/10 rounded-[16px] p-5 text-center">
              <div className="text-3xl font-black text-white mb-1">~{horasAhorradas} hs / mes</div>
              <div className="text-xs font-semibold text-[#c8ff00] uppercase tracking-wider mb-2">Ahorro de Tiempo en Rutinas</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Gracias al motor científico de volumen hipertrófico algorítmico (RP/Schoenfeld) y RIR.
              </p>
            </div>
            <div className="bg-[#18181c] border border-white/10 rounded-[16px] p-5 text-center">
              <div className="text-3xl font-black text-emerald-400 mb-1">+${morosidadRecuperada} USD / mes</div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Recupero de Morosidad</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Por cobros automáticos en MercadoPago Connect y recordatorios Web Push sin costo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
            Todo lo que tu gimnasio necesita en una sola app
          </h2>
          <p className="text-sm sm:text-base text-neutral-400">
            Diseñada desde cero para mobile-first. Cero complejidad, 100% efectividad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-[#c8ff00]/10 border border-[#c8ff00]/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🧠
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Science Workout Engine</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Prescripción de entrenamiento con base en evidencia científica. Cálculo de volumen por grupo muscular, RIR y sustituciones por molestia articular.
            </p>
          </div>

          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              💳
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cobro Automático MercadoPago</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Vinculá tu cuenta de MercadoPago en 1 tap. Tus alumnos pagan la cuota directamente desde su celular y el dinero entra directo a tu cuenta.
            </p>
          </div>

          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🔔
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Push Notifications VAPID</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Notificaciones nativas al teléfono de tu socio para avisarle que vence la cuota o enviarle novedades de su rutina, sin gastar en servicios de SMS.
            </p>
          </div>

          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🎨
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Branding & Logo Propio</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Subí el logo de tu gimnasio y la app extraerá automáticamente los colores principales para adaptar el tema visual a tu marca.
            </p>
          </div>

          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📥
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Buzón de Opinión Anónimo</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Feedback real y honesto de tus clientes sobre el equipamiento, la música o la limpieza para mantener la satisfacción al máximo.
            </p>
          </div>

          <div className="bg-[#161618] border border-white/10 rounded-[20px] p-6 hover:border-[#c8ff00]/40 transition-all group">
            <div className="w-12 h-12 rounded-[14px] bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🔒
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Seguridad RLS Supabase</h3>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Tus datos y los de tus socios están 100% aislados a nivel de base de datos con políticas de nivel de fila (Row Level Security).
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
            Planes pensados para crecer
          </h2>
          <p className="text-sm text-neutral-400">
            Sin contratos a largo plazo. Cancelá o cambiá cuando quieras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Plan Starter */}
          <div className="bg-[#121214] border border-white/10 rounded-[24px] p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Starter / Personal Trainer</div>
              <div className="text-3xl font-black text-white mb-1">Gratis</div>
              <div className="text-xs text-neutral-500 mb-6">Hasta 15 socios activos</div>
              <ul className="space-y-3 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><span>✓</span> Carga y asignación de rutinas</li>
                <li className="flex items-center gap-2"><span>✓</span> Experiencia háptica 120fps</li>
                <li className="flex items-center gap-2"><span>✓</span> PWA móvil para socios</li>
              </ul>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-[12px] text-xs font-bold text-center transition-colors"
            >
              Empezar Gratis
            </a>
          </div>

          {/* Plan Pro */}
          <div className="bg-[#161618] border-2 border-[#c8ff00] rounded-[24px] p-6 flex flex-col justify-between relative shadow-[0_0_30px_rgba(200,255,0,0.15)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#c8ff00] text-black text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
              Más Popular
            </div>
            <div>
              <div className="text-xs font-bold text-[#c8ff00] uppercase tracking-wider mb-2">Gimnasio Pro</div>
              <div className="text-3xl font-black text-white mb-1">$29 <span className="text-xs font-normal text-neutral-400">USD / mes</span></div>
              <div className="text-xs text-neutral-400 mb-6">Hasta 150 socios activos</div>
              <ul className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-center gap-2"><span className="text-[#c8ff00]">✓</span> Todo lo de Starter</li>
                <li className="flex items-center gap-2"><span className="text-[#c8ff00]">✓</span> Cobros automáticos MercadoPago Connect</li>
                <li className="flex items-center gap-2"><span className="text-[#c8ff00]">✓</span> Gestor de Morosidad & Notificaciones Push</li>
                <li className="flex items-center gap-2"><span className="text-[#c8ff00]">✓</span> Science Workout Engine completo</li>
                <li className="flex items-center gap-2"><span className="text-[#c8ff00]">✓</span> Logo y colores personalizados</li>
              </ul>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full py-3.5 bg-[#c8ff00] hover:bg-[#b5e600] text-black rounded-[12px] text-xs font-extrabold text-center shadow-lg transition-transform active:scale-95"
            >
              Probar 14 Días Gratis
            </a>
          </div>

          {/* Plan Multi Sede */}
          <div className="bg-[#121214] border border-white/10 rounded-[24px] p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Multi-Sede / Cadenas</div>
              <div className="text-3xl font-black text-white mb-1">$69 <span className="text-xs font-normal text-neutral-400">USD / mes</span></div>
              <div className="text-xs text-neutral-500 mb-6">Socios ilimitados + Múltiples sedes</div>
              <ul className="space-y-3 text-xs text-neutral-300">
                <li className="flex items-center gap-2"><span>✓</span> Todo lo de Gimnasio Pro</li>
                <li className="flex items-center gap-2"><span>✓</span> Soporte prioritario 24/7</li>
                <li className="flex items-center gap-2"><span>✓</span> Asesoría de migración de datos</li>
              </ul>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-[12px] text-xs font-bold text-center transition-colors"
            >
              Consultar Plan
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-[8px] overflow-hidden bg-[#161618] border border-[#c8ff00]/30 p-1 flex items-center justify-center">
              <Image src="/logo-sysgym.png" alt="SysGym Logo" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-extrabold text-base text-white">Sys<span className="text-[#c8ff00]">Gym</span></span>
          </div>

          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} SysGym SaaS. Todos los derechos reservados.
          </p>

          <div className="flex items-center gap-4 text-xs text-neutral-400 font-semibold">
            <Link href="/registro-partner" className="text-[#c8ff00] hover:text-[#b5e600] transition-colors">Programa de Partners</Link>
            <Link href="/login" className="hover:text-white transition-colors">Ingresar</Link>
            <Link href="/login/olvide-clave" className="hover:text-white transition-colors">Recuperar Clave</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
