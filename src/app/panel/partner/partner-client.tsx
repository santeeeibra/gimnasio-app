"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  Award,
  Wallet,
  Building2,
  TrendingUp,
  Percent,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  AlertCircle,
  X,
  Share2,
  Users,
  MessageCircle,
  Clock,
  Crown,
  BookOpen,
  Headphones,
  Rocket,
} from "lucide-react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { useHapticos } from "@/lib/ui/hapticos";
import {
  type ResumenPartner,
  type PartnerCommission,
  type PartnerPayout,
  RETIRO_MINIMO_ARS,
  BONOS_HITO,
  calcularRangoPartner,
  COMISION_ARRANQUE_PCT,
  COMISION_ESTANDAR_PCT,
} from "@/types/partner";
import {
  actualizarDatosCobroAction,
  solicitarRetiroAction,
} from "./actions";

export function PartnerDashboardClient({
  resumen,
  comisiones,
  payouts,
}: {
  resumen: ResumenPartner;
  comisiones: PartnerCommission[];
  payouts: PartnerPayout[];
}) {
  const hapticos = useHapticos();
  const [copiado, setCopiado] = useState(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [modalRetiroAbierto, setModalRetiroAbierto] = useState(false);

  // Form states
  const [cobroPending, startCobroTransition] = useTransition();
  const [cobroResult, setCobroResult] = useState<{ ok?: boolean; error?: string; msg?: string } | null>(null);

  const [retiroPending, startRetiroTransition] = useTransition();
  const [retiroResult, setRetiroResult] = useState<{ ok?: boolean; error?: string; msg?: string } | null>(null);

  const {
    partner,
    balanceDisponible,
    gimnasiosReferidos,
    gimnasiosPagoActivos,
    hitosAlcanzados,
    proximoHito,
    gimnasiosDetalle = [],
  } = resumen;

  const urlReferido = typeof window !== "undefined"
    ? `${window.location.origin}/registro?ref=${partner.referral_code}`
    : `https://sysgym.app/registro?ref=${partner.referral_code}`;

  const mensajeWhatsApp = `¡Hola! Te recomiendo SysGym para tu gimnasio o box. Automatiza cobros con Mercado Pago, control de acceso QR en puerta y rutinas para alumnos. ¡Es 100% gratis para los primeros 40 alumnos! Probá registrarte acá: ${urlReferido}`;
  const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`;

  const handleCopiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(urlReferido);
      setCopiado(true);
      hapticos.exito();
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      hapticos.suave();
    }
  };

  const handleCopiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(partner.referral_code);
      setCopiadoCodigo(true);
      hapticos.suave();
      setTimeout(() => setCopiadoCodigo(false), 2500);
    } catch {
      hapticos.suave();
    }
  };

  const handleGuardarCobro = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    hapticos.medio();
    const formData = new FormData(e.currentTarget);
    startCobroTransition(async () => {
      const res = await actualizarDatosCobroAction({}, formData);
      setCobroResult(res);
      if (res.ok) {
        hapticos.exito();
        setTimeout(() => setModalCobroAbierto(false), 1200);
      } else {
        hapticos.error();
      }
    });
  };

  const handleSolicitarRetiro = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    hapticos.medio();
    const formData = new FormData(e.currentTarget);
    startRetiroTransition(async () => {
      const res = await solicitarRetiroAction({}, formData);
      setRetiroResult(res);
      if (res.ok) {
        hapticos.record();
        setTimeout(() => setModalRetiroAbierto(false), 1500);
      } else {
        hapticos.error();
      }
    });
  };

  // Rango oficial y estado de fast-start
  const rangoActual = calcularRangoPartner(gimnasiosPagoActivos);
  const quedaArranque = Math.max(0, 5 - gimnasiosPagoActivos);
  const esArranqueActivo = quedaArranque > 0;
  const faltan = proximoHito ? proximoHito.faltan : 0;

  // Estado para copiar scripts del Arsenal
  const [copiadoScriptId, setCopiadoScriptId] = useState<string | null>(null);

  const copiarScript = async (id: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoScriptId(id);
      hapticos.exito();
      setTimeout(() => setCopiadoScriptId(null), 2500);
    } catch {
      hapticos.suave();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in pb-12">
      {/* ── 1. Hero del Partner Oficial ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] border border-emerald-500/30 bg-zinc-950 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,231,160,0.18)_0%,transparent_65%)] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#10e7a0] text-xs font-bold tracking-wide">
                <ShieldCheck className="size-4" />
                <span>PROGRAMA OFICIAL SYSGYM PARTNER</span>
              </div>
              {esArranqueActivo && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold animate-pulse">
                  <Rocket className="size-3.5 text-amber-400" />
                  <span>20% Bono Arranque Activo ({quedaArranque} restante{quedaArranque === 1 ? "" : "s"})</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Impulsá gimnasios con SysGym y ganá{" "}
              <span className="text-[#10e7a0]">
                {esArranqueActivo ? "20% inicial" : "15% inicial"}
              </span>{" "}
              + $180.000 ARS en Bonos
            </h1>

            <p className="text-sm text-zinc-400 leading-relaxed">
              Recibís comisión directa sobre el primer pago de cada gimnasio adherido ({COMISION_ARRANQUE_PCT}% en tus primeros 5 gimnasios, {COMISION_ESTANDAR_PCT}% en los siguientes) más bonos acumulativos en efectivo de ${BONOS_HITO[5].toLocaleString("es-AR")}, ${BONOS_HITO[10].toLocaleString("es-AR")} y ${BONOS_HITO[15].toLocaleString("es-AR")} ARS al llegar a 5, 10 y 15 sedes activas.
            </p>
          </div>

          <div className="shrink-0 self-center md:self-auto">
            <PulpoCard
              size={88}
              pose="kettlebell"
              cardClassName="!bg-zinc-900/80 !border-emerald-500/40 shadow-emerald-500/10"
            />
          </div>
        </div>

        {/* Barra de enlace de referido interactivo */}
        {/* Barra de Código y Enlaces Interactivos */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium">Tu código:</span>
            <button
              type="button"
              onClick={handleCopiarCodigo}
              title="Copiar código"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-zinc-900 border border-zinc-700 hover:border-emerald-500/60 font-mono font-bold text-sm text-[#10e7a0] active:scale-95 transition-all"
            >
              <span>{partner.referral_code}</span>
              {copiadoCodigo ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5 text-zinc-400" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={urlWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticos.medio()}
              className="h-10 px-4 rounded-[12px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
            >
              <MessageCircle className="size-4" />
              <span>Enviar por WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopiarEnlace}
              className={`h-10 px-4 rounded-[12px] font-bold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md ${
                copiado
                  ? "bg-emerald-500 text-black"
                  : "bg-[#10e7a0] text-zinc-950 hover:bg-[#10e7a0]/90"
              }`}
            >
              {copiado ? (
                <>
                  <Check className="size-4" />
                  <span>¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Copiar enlace</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                hapticos.suave();
                setModalCobroAbierto(true);
              }}
              className="h-10 px-3.5 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <CreditCard className="size-3.5" />
              <span>Datos de cobro</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 1.5. Credencial Digital Holográfica & Rango Oficial ───────────── */}
      <div className="relative overflow-hidden rounded-[24px] border border-rule bg-paper p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="size-14 rounded-[16px] flex items-center justify-center text-2xl shadow-inner border"
              style={{
                backgroundColor: `${rangoActual.color}18`,
                borderColor: `${rangoActual.color}45`,
              }}
            >
              <Crown className="size-7" style={{ color: rangoActual.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-ink-soft">
                  Credencial Oficial
                </span>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${rangoActual.color}25`,
                    color: rangoActual.color,
                  }}
                >
                  {rangoActual.badge}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-ink mt-0.5">
                {rangoActual.nombre}
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                {rangoActual.beneficio}
              </p>
            </div>
          </div>

          {/* Mini medidor al siguiente rango */}
          <div className="w-full md:w-auto min-w-[240px] p-3.5 rounded-[14px] bg-paper-2/70 border border-rule space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-soft">Siguiente escalafón</span>
              <span className="font-bold font-mono text-ink">
                {gimnasiosPagoActivos >= 15
                  ? "¡Nivel Máximo!"
                  : `${Math.min(15, gimnasiosPagoActivos)} / ${gimnasiosPagoActivos < 5 ? 5 : gimnasiosPagoActivos < 10 ? 10 : 15} gyms`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-paper overflow-hidden border border-rule">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, (gimnasiosPagoActivos / (gimnasiosPagoActivos < 5 ? 5 : gimnasiosPagoActivos < 10 ? 10 : 15)) * 100)}%`,
                  backgroundColor: rangoActual.color,
                }}
              />
            </div>
            <p className="text-[10px] text-ink-soft text-right">
              {gimnasiosPagoActivos < 5
                ? `Faltan ${5 - gimnasiosPagoActivos} para Partner Pro 🥈`
                : gimnasiosPagoActivos < 10
                ? `Faltan ${10 - gimnasiosPagoActivos} para Partner Elite 🥇`
                : gimnasiosPagoActivos < 15
                ? `Faltan ${15 - gimnasiosPagoActivos} para Embajador Black 💎`
                : "¡Sos Embajador Black oficial de SysGym!"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Métricas Clave Liquid Glass ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Disponible */}
        <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Balance Disponible
            </span>
            <div className="p-2 rounded-[10px] bg-emerald-500/15 text-emerald-500">
              <Wallet className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-ink">
              ${balanceDisponible.toLocaleString("es-AR")}
              <span className="text-xs font-normal text-ink-soft ml-1">ARS</span>
            </div>
            <p className="text-[11px] text-ink-soft mt-1">
              Mínimo de retiro: ${RETIRO_MINIMO_ARS.toLocaleString("es-AR")} ARS
            </p>
          </div>

          <button
            type="button"
            disabled={balanceDisponible < RETIRO_MINIMO_ARS}
            onClick={() => {
              hapticos.medio();
              setModalRetiroAbierto(true);
            }}
            className="w-full h-9 rounded-[10px] font-bold text-xs inline-flex items-center justify-center gap-1.5 bg-accent text-accent-contrast disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <span>Retirar fondos</span>
            <ArrowUpRight className="size-3.5" />
          </button>
        </div>

        {/* Gimnasios Referidos */}
        <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Gimnasios Registrados
            </span>
            <div className="p-2 rounded-[10px] bg-blue-500/15 text-blue-500">
              <Building2 className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-ink">
              {gimnasiosReferidos}
            </div>
            <p className="text-[11px] text-ink-soft mt-1">
              Cuentas creadas con tu código
            </p>
          </div>

          <div className="text-xs font-semibold text-ink-soft flex items-center gap-1">
            <span>Código:</span>
            <span className="font-mono text-ink bg-paper-2 px-2 py-0.5 rounded border border-rule">
              {partner.referral_code}
            </span>
          </div>
        </div>

        {/* Gimnasios con Pago Activo */}
        <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Gimnasios Pagos Activos
            </span>
            <div className="p-2 rounded-[10px] bg-purple-500/15 text-purple-500">
              <Award className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-ink">
              {gimnasiosPagoActivos}
            </div>
            <p className="text-[11px] text-ink-soft mt-1">
              Con +40 alumnos y Plan Pro/Elite
            </p>
          </div>

          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
            <span>Suman para bonos de hitos</span>
          </div>
        </div>

        {/* Comisión Inicial */}
        <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Tasa de Comisión
            </span>
            <div className="p-2 rounded-[10px] bg-amber-500/15 text-amber-500">
              <Percent className="size-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-ink">
              {esArranqueActivo ? `${COMISION_ARRANQUE_PCT}%` : `${COMISION_ESTANDAR_PCT}%`}
              <span className="text-xs font-normal text-ink-soft ml-1">en 1er pago</span>
            </div>
            <p className="text-[11px] text-ink-soft mt-1">
              {esArranqueActivo
                ? `Tasa preferencial: quedan ${quedaArranque} de 5 gyms`
                : "Tasa estándar aplicada a nuevos gyms"}
            </p>
          </div>

          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="size-3" />
            <span>+ $180k en bonos por metas</span>
          </div>
        </div>
      </div>

      {/* ── 3. Gimnasios Adheridos con tu Código (Seguimiento Detallado) ─── */}
      <div className="rounded-[22px] border border-rule bg-paper p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-accent" />
              <h2 className="text-lg font-bold text-ink">
                Gimnasios Adheridos con tu Código
              </h2>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Seguimiento en tiempo real: cantidad de alumnos activos y si califica como pago activo para comisiones.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-paper-2 border border-rule text-ink-soft self-start sm:self-auto">
            {gimnasiosDetalle.length} {gimnasiosDetalle.length === 1 ? "gimnasio" : "gimnasios"} registrados
          </span>
        </div>

        {gimnasiosDetalle.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-[18px] bg-paper-2/50 border border-rule space-y-4">
            <div className="flex justify-center">
              <PulpoCard size={72} pose="festejo" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-ink">
                Aún no tenés gimnasios adheridos
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Compartí tu código <strong className="text-accent">{partner.referral_code}</strong> o enviá el mensaje de invitación por WhatsApp a colegas o dueños de gimnasios para verlos acá.
              </p>
            </div>
            <a
              href={urlWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticos.medio()}
              className="h-10 px-5 rounded-[12px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <MessageCircle className="size-4" />
              <span>Enviar invitación por WhatsApp</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gimnasiosDetalle.map((g) => (
              <div
                key={g.id}
                className="rounded-[16px] border border-rule bg-paper-2/60 p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-accent/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-ink leading-snug">
                      {g.nombre}
                    </h4>
                    <span className="text-[11px] text-ink-soft flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" />
                      Registrado el {new Date(g.creado_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                      g.esPagoActivo
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-[#10e7a0] border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {g.esPagoActivo ? "Pago Activo · 15%" : "Plan Inicial"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-rule/60">
                  <div className="flex items-center gap-1.5 text-ink-soft">
                    <Users className="size-3.5" />
                    <span>Alumnos activos:</span>
                    <strong className="text-ink font-mono">{g.alumnosActivos}</strong>
                    {!g.esPagoActivo && g.alumnosActivos <= 40 ? (
                      <span className="text-[10px] text-ink-soft">/ 40 gratis</span>
                    ) : null}
                  </div>

                  <span className="text-[11px] font-semibold text-ink-soft">
                    {g.planNombre}
                  </span>
                </div>

                <p className="text-[11px] text-ink-soft leading-tight">
                  {g.esPagoActivo
                    ? "✅ Califica para bono por hito y comisión inicial del 15% por activación."
                    : g.alumnosActivos >= 35
                    ? "⏳ Cerca de los 40 alumnos: cuando pase a Pro/Elite generará tu comisión y sumará para los bonos."
                    : "🌱 Utilizando el Plan Inicial Gratuito para probar la plataforma."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Tablero de Hitos y Bonos en Efectivo ─────────────────────── */}
      <div className="rounded-[22px] border border-rule bg-paper p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <h2 className="text-lg font-bold text-ink">
                Bonos en Efectivo por Hitos
              </h2>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Premios adicionales en efectivo al alcanzar metas de gimnasios con pago activo.
            </p>
          </div>

          {proximoHito ? (
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/15 text-accent border border-accent/30 self-start sm:self-auto">
              ¡Faltan {faltan} {faltan === 1 ? "gym" : "gyms"} para el siguiente bono!
            </div>
          ) : (
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-ok/15 text-ok border border-ok/30 self-start sm:self-auto">
              ¡Todos los hitos completados! 🏆
            </div>
          )}
        </div>

        {/* Tarjetas de Hitos: 5, 10 y 15 Gimnasios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hito 1: 5 Gimnasios */}
          <div
            className={`rounded-[18px] border p-5 flex flex-col justify-between gap-4 transition-all ${
              hitosAlcanzados.includes(5)
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                : "bg-paper-2/60 border-rule"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">
                  Hito 1 · 5 Gimnasios
                </span>
                <h3 className="text-xl font-bold text-ink mt-0.5">
                  +${BONOS_HITO[5].toLocaleString("es-AR")} ARS
                </h3>
              </div>
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  hitosAlcanzados.includes(5)
                    ? "bg-emerald-500 text-black font-bold"
                    : "bg-paper border border-rule text-ink-soft"
                }`}
              >
                {hitosAlcanzados.includes(5) ? (
                  <Check className="size-4" />
                ) : (
                  <Award className="size-4" />
                )}
              </div>
            </div>

            <p className="text-xs text-ink-soft">
              Se acredita en tu saldo al alcanzar 5 gimnasios referidos con Plan Pro o Elite activo.
            </p>

            <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-rule/60">
              <span className="text-ink-soft">Progreso</span>
              <span className="font-mono text-ink">
                {Math.min(5, gimnasiosPagoActivos)} / 5 sedes
              </span>
            </div>
          </div>

          {/* Hito 2: 10 Gimnasios */}
          <div
            className={`rounded-[18px] border p-5 flex flex-col justify-between gap-4 transition-all ${
              hitosAlcanzados.includes(10)
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                : "bg-paper-2/60 border-rule"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">
                  Hito 2 · 10 Gimnasios
                </span>
                <h3 className="text-xl font-bold text-ink mt-0.5">
                  +${BONOS_HITO[10].toLocaleString("es-AR")} ARS
                </h3>
              </div>
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  hitosAlcanzados.includes(10)
                    ? "bg-emerald-500 text-black font-bold"
                    : "bg-paper border border-rule text-ink-soft"
                }`}
              >
                {hitosAlcanzados.includes(10) ? (
                  <Check className="size-4" />
                ) : (
                  <Award className="size-4" />
                )}
              </div>
            </div>

            <p className="text-xs text-ink-soft">
              Bono en efectivo adicional que se suma al Hito 1 ($80.000 ARS acumulados).
            </p>

            <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-rule/60">
              <span className="text-ink-soft">Progreso</span>
              <span className="font-mono text-ink">
                {Math.min(10, gimnasiosPagoActivos)} / 10 sedes
              </span>
            </div>
          </div>

          {/* Hito 3: 15 Gimnasios */}
          <div
            className={`rounded-[18px] border p-5 flex flex-col justify-between gap-4 transition-all ${
              hitosAlcanzados.includes(15)
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                : "bg-paper-2/60 border-rule"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-ink-soft">
                  Hito 3 · 15 Gimnasios
                </span>
                <h3 className="text-xl font-bold text-ink mt-0.5">
                  +${BONOS_HITO[15].toLocaleString("es-AR")} ARS
                </h3>
              </div>
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  hitosAlcanzados.includes(15)
                    ? "bg-emerald-500 text-black font-bold"
                    : "bg-paper border border-rule text-ink-soft"
                }`}
              >
                {hitosAlcanzados.includes(15) ? (
                  <Check className="size-4" />
                ) : (
                  <Award className="size-4" />
                )}
              </div>
            </div>

            <p className="text-xs text-ink-soft">
              Premio mayor en efectivo al consolidar 15 sedes ($180.000 ARS en bonos totales acumulados).
            </p>

            <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-rule/60">
              <span className="text-ink-soft">Progreso</span>
              <span className="font-mono text-ink">
                {Math.min(15, gimnasiosPagoActivos)} / 15 sedes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Historial de Comisiones & Liquidaciones ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comisiones Recientes */}
        <div className="rounded-[22px] border border-rule bg-paper p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Comisiones Recientes</h3>
            <span className="text-xs text-ink-soft">
              {comisiones.length} {comisiones.length === 1 ? "pago" : "pagos"}
            </span>
          </div>

          {comisiones.length === 0 ? (
            <div className="p-8 text-center rounded-[16px] bg-paper-2/60 border border-rule space-y-2">
              <p className="text-xs text-ink-soft">
                Aún no tenés comisiones registradas.
              </p>
              <p className="text-[11px] text-ink-soft">
                Compartí tu enlace con colegas para recibir tu comisión en su primer pago.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {comisiones.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-[12px] bg-paper-2/60 border border-rule text-xs"
                >
                  <div>
                    <span className="font-semibold text-ink">
                      Período {c.periodo}
                    </span>
                    <p className="text-[11px] text-ink-soft">
                      Base: ${Number(c.monto_base_ars).toLocaleString("es-AR")} ARS ({c.porcentaje}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +${Number(c.monto_comision_ars).toLocaleString("es-AR")} ARS
                    </span>
                    <p className="text-[10px] text-ink-soft">
                      {new Date(c.creado_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solicitudes de Retiro */}
        <div className="rounded-[22px] border border-rule bg-paper p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Historial de Retiros</h3>
            <span className="text-xs text-ink-soft">
              {payouts.length} {payouts.length === 1 ? "solicitud" : "solicitudes"}
            </span>
          </div>

          {payouts.length === 0 ? (
            <div className="p-8 text-center rounded-[16px] bg-paper-2/60 border border-rule space-y-2">
              <p className="text-xs text-ink-soft">
                No hay solicitudes de retiro todavía.
              </p>
              <p className="text-[11px] text-ink-soft">
                Podés retirar tus fondos cuando alcances los ${RETIRO_MINIMO_ARS.toLocaleString("es-AR")} ARS.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-[12px] bg-paper-2/60 border border-rule text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-ink">
                        ${Number(p.monto_ars).toLocaleString("es-AR")} ARS
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          p.estado === "pagado"
                            ? "bg-ok/15 text-ok"
                            : p.estado === "pendiente"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-danger/15 text-danger"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-soft mt-0.5">
                      Destino: {p.destino_snapshot.alias_mp || p.destino_snapshot.cbu_cvu}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-ink-soft">
                    {new Date(p.solicitado_at).toLocaleDateString("es-AR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Arsenal de Difusión del Partner (Plantillas Listas) ─────── */}
      <div className="rounded-[24px] border border-rule bg-paper p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-5 text-accent" />
              <h2 className="text-lg font-bold text-ink">
                Arsenal del Partner: Mensajes Listos para Compartir
              </h2>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Copiá y pegá estos mensajes probados para conseguir que los gimnasios se registren con tu código en 1 clic.
            </p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-accent/15 text-accent self-start sm:self-auto">
            3 Plantillas de Alta Conversión
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Script 1: Para Dueño de Gimnasio / Box */}
          <div className="rounded-[18px] border border-rule bg-paper-2/60 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Para Dueños de Gym
                </span>
                <span className="text-xs">🏋️‍♂️</span>
              </div>
              <h3 className="text-sm font-bold text-ink">
                Propuesta de Valor Directa
              </h3>
              <p className="text-xs text-ink-soft italic bg-paper p-3 rounded-[12px] border border-rule/70 leading-relaxed font-sans select-all">
                &ldquo;¡Buenas! Te paso el sistema que están usando varios boxes y gimnasios: SysGym automatiza cobros con Mercado Pago, accesos QR en puerta y rutinas personalizadas para los alumnos. Es 100% gratis hasta 40 alumnos. Creá tu cuenta con mi enlace: {urlReferido}&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copiarScript(
                  "script-dueno",
                  `¡Buenas! Te paso el sistema que están usando varios boxes y gimnasios: SysGym automatiza cobros con Mercado Pago, accesos QR en puerta y rutinas personalizadas para los alumnos. Es 100% gratis hasta 40 alumnos. Creá tu cuenta con mi enlace: ${urlReferido}`
                )
              }
              className="w-full h-9 rounded-[10px] font-semibold text-xs inline-flex items-center justify-center gap-2 bg-paper text-ink border border-rule hover:border-accent hover:text-accent active:scale-95 transition-all shadow-xs"
            >
              {copiadoScriptId === "script-dueno" ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-ink-soft" />
                  <span>Copiar mensaje</span>
                </>
              )}
            </button>
          </div>

          {/* Script 2: Para Historia de Instagram / Estados de WhatsApp */}
          <div className="rounded-[18px] border border-rule bg-paper-2/60 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Instagram / Estados
                </span>
                <span className="text-xs">📲</span>
              </div>
              <h3 className="text-sm font-bold text-ink">
                Story / Sticker de Enlace
              </h3>
              <p className="text-xs text-ink-soft italic bg-paper p-3 rounded-[12px] border border-rule/70 leading-relaxed font-sans select-all">
                &ldquo;¿Tenés gimnasio o entrenás alumnos? Dejá de renegar con planillas de Excel. Con SysGym tenés cobros automáticos, QR y rutinas con IA. Entrá gratis con mi link hasta 40 alumnos 👉 {urlReferido}&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copiarScript(
                  "script-story",
                  `¿Tenés gimnasio o entrenás alumnos? Dejá de renegar con planillas de Excel. Con SysGym tenés cobros automáticos, QR y rutinas con IA. Entrá gratis con mi link hasta 40 alumnos 👉 ${urlReferido}`
                )
              }
              className="w-full h-9 rounded-[10px] font-semibold text-xs inline-flex items-center justify-center gap-2 bg-paper text-ink border border-rule hover:border-accent hover:text-accent active:scale-95 transition-all shadow-xs"
            >
              {copiadoScriptId === "script-story" ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-ink-soft" />
                  <span>Copiar mensaje</span>
                </>
              )}
            </button>
          </div>

          {/* Script 3: Para Colega Entrenador o Profe */}
          <div className="rounded-[18px] border border-rule bg-paper-2/60 p-4 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Para Profes / Coaches
                </span>
                <span className="text-xs">🤝</span>
              </div>
              <h3 className="text-sm font-bold text-ink">
                Recomendación entre Colegas
              </h3>
              <p className="text-xs text-ink-soft italic bg-paper p-3 rounded-[12px] border border-rule/70 leading-relaxed font-sans select-all">
                &ldquo;Che, si en tu gym todavía cobran por transferencia manual o controlan a mano los accesos, mostrales SysGym. Les ahorra horas por semana y el plan inicial es sin costo hasta 40 socios: {urlReferido}&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                copiarScript(
                  "script-colega",
                  `Che, si en tu gym todavía cobran por transferencia manual o controlan a mano los accesos, mostrales SysGym. Les ahorra horas por semana y el plan inicial es sin costo hasta 40 socios: ${urlReferido}`
                )
              }
              className="w-full h-9 rounded-[10px] font-semibold text-xs inline-flex items-center justify-center gap-2 bg-paper text-ink border border-rule hover:border-accent hover:text-accent active:scale-95 transition-all shadow-xs"
            >
              {copiadoScriptId === "script-colega" ? (
                <>
                  <Check className="size-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-ink-soft" />
                  <span>Copiar mensaje</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. Comunidad de Partners & Canal VIP con el Fundador ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Comunidad Oficial de Partners en WhatsApp */}
        <div className="rounded-[24px] border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-paper to-paper p-6 flex flex-col justify-between gap-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-[16px] bg-emerald-500/15 text-[#10e7a0] shrink-0 border border-emerald-500/30">
              <Users className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#10e7a0] text-[10px] font-extrabold uppercase tracking-wide">
                <span>Comunidad Oficial</span>
              </div>
              <h3 className="text-base font-bold text-ink">
                Grupo de WhatsApp de Partners
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Conocé a otros colaboradores, compartí estrategias de difusión, enterate antes que nadie de nuevas funciones y festejá cada hito alcanzado.
              </p>
            </div>
          </div>

          <a
            href="https://chat.whatsapp.com/BahGi6pehnB6Iq7M1fW5Y4"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => hapticos.exito()}
            className="w-full h-11 px-5 rounded-[12px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            <MessageCircle className="size-4" />
            <span>Unirme a la Comunidad de Partners</span>
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>

        {/* Canal VIP Directo con el Fundador */}
        <div className="rounded-[24px] border border-rule bg-paper p-6 flex flex-col justify-between gap-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-[16px] bg-paper-2 text-ink shrink-0 border border-rule">
              <Headphones className="size-6 text-accent" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-paper-2 text-ink-soft text-[10px] font-extrabold uppercase tracking-wide border border-rule">
                <span>Soporte 1 a 1</span>
              </div>
              <h3 className="text-base font-bold text-ink">
                Canal VIP con el Fundador
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                ¿Tenés un gimnasio grande de +100 alumnos o necesitás ayuda personalizada para cerrar la propuesta? Escribile directo a Santi.
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/5492920605208?text=${encodeURIComponent(
              `¡Hola Santi! Soy partner oficial de SysGym (Código: ${partner.referral_code}, ${partner.nombre}). Te escribo desde el panel de partners porque tengo una consulta comercial.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => hapticos.medio()}
            className="w-full h-11 px-5 rounded-[12px] bg-paper-2 hover:bg-paper border border-rule hover:border-accent text-ink font-bold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <MessageCircle className="size-4 text-emerald-500" />
            <span>Hablar con Santi por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* ── Modal: Datos de Cobro (CBU/CVU o Alias) ─────────────────────── */}
      {modalCobroAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalCobroAbierto(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] border border-rule bg-paper shadow-2xl p-6 flex flex-col gap-4 animate-scale-in"
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Datos de Cobro</h3>
                <p className="text-xs text-ink-soft">
                  Donde transferiremos tus comisiones y bonos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalCobroAbierto(false)}
                className="size-8 inline-flex items-center justify-center rounded-[10px] bg-paper-2 text-ink-soft hover:text-ink border border-rule active:scale-90 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarCobro} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1">
                  Alias de Mercado Pago (recomendado)
                </label>
                <input
                  type="text"
                  name="alias_mp"
                  defaultValue={partner.alias_mp ?? ""}
                  placeholder="ej. mi.alias.mp"
                  className="w-full h-10 px-3 rounded-[12px] bg-paper-2 border border-rule text-ink text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1">
                  O CBU / CVU Bancario (22 dígitos)
                </label>
                <input
                  type="text"
                  name="cbu_cvu"
                  defaultValue={partner.cbu_cvu ?? ""}
                  placeholder="22 números continuos"
                  maxLength={22}
                  className="w-full h-10 px-3 rounded-[12px] bg-paper-2 border border-rule text-ink text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>

              {cobroResult?.error && (
                <p className="text-xs text-danger font-medium">
                  {cobroResult.error}
                </p>
              )}
              {cobroResult?.msg && (
                <p className="text-xs text-ok font-medium">
                  {cobroResult.msg}
                </p>
              )}

              <div className="pt-2 border-t border-rule flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCobroAbierto(false)}
                  className="h-10 px-4 rounded-[12px] border border-rule bg-paper-2 text-ink-soft text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cobroPending}
                  className="h-10 px-5 rounded-[12px] bg-accent text-accent-contrast text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {cobroPending ? "Guardando…" : "Guardar datos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Solicitar Retiro ─────────────────────────────────────── */}
      {modalRetiroAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalRetiroAbierto(false)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] border border-rule bg-paper shadow-2xl p-6 flex flex-col gap-4 animate-scale-in"
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Solicitar Retiro</h3>
                <p className="text-xs text-ink-soft">
                  Saldo disponible: ${balanceDisponible.toLocaleString("es-AR")} ARS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRetiroAbierto(false)}
                className="size-8 inline-flex items-center justify-center rounded-[10px] bg-paper-2 text-ink-soft hover:text-ink border border-rule active:scale-90 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSolicitarRetiro} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1">
                  Monto a retirar (ARS)
                </label>
                <input
                  type="number"
                  name="monto_ars"
                  defaultValue={balanceDisponible}
                  min={RETIRO_MINIMO_ARS}
                  max={balanceDisponible}
                  className="w-full h-11 px-3 rounded-[12px] bg-paper-2 border border-rule text-ink text-base font-mono font-bold focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  Mínimo: ${RETIRO_MINIMO_ARS.toLocaleString("es-AR")} ARS. Destino: {partner.alias_mp || partner.cbu_cvu || "Sin configurar"}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1">
                  Nota o aclaración (opcional)
                </label>
                <input
                  type="text"
                  name="nota"
                  placeholder="ej. Retiro comisiones mes actual"
                  className="w-full h-10 px-3 rounded-[12px] bg-paper-2 border border-rule text-ink text-xs focus:outline-none focus:border-accent"
                />
              </div>

              {retiroResult?.error && (
                <p className="text-xs text-danger font-medium">
                  {retiroResult.error}
                </p>
              )}
              {retiroResult?.msg && (
                <p className="text-xs text-ok font-medium">
                  {retiroResult.msg}
                </p>
              )}

              <div className="pt-2 border-t border-rule flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalRetiroAbierto(false)}
                  className="h-10 px-4 rounded-[12px] border border-rule bg-paper-2 text-ink-soft text-xs font-semibold active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={retiroPending || balanceDisponible < RETIRO_MINIMO_ARS}
                  className="h-10 px-5 rounded-[12px] bg-accent text-accent-contrast text-xs font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {retiroPending ? "Procesando…" : "Confirmar retiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
