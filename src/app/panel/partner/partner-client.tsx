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
  Bell,
  CheckCheck,
  FileText,
  HelpCircle,
  QrCode,
  Receipt,
  Zap,
  CheckCircle2,
  Calculator,
  ChevronDown,
  Download,
  Play,
  ExternalLink,
} from "lucide-react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { useHapticos } from "@/lib/ui/hapticos";
import { ActivarNotificacionesPartner } from "./activar-notificaciones-partner";
import { MensajesPartner } from "./mensajes-partner";
import {
  type ResumenPartner,
  type PartnerCommission,
  type PartnerPayout,
  type PartnerNotification,
  RETIRO_MINIMO_ARS,
  BONOS_HITO,
  calcularRangoPartner,
  COMISION_ARRANQUE_PCT,
  COMISION_ESTANDAR_PCT,
} from "@/types/partner";
import {
  actualizarDatosCobroAction,
  solicitarRetiroAction,
  marcarNotificacionPartnerLeidaAction,
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
    ? `${window.location.origin}/registro-gimnasio?ref=${partner.referral_code}`
    : `https://gimnasio-app-rose.vercel.app/registro-gimnasio?ref=${partner.referral_code}`;

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

  // Estados para las herramientas del Kit de Ventas
  const [simGyms, setSimGyms] = useState<number>(5);
  const [objecionAbierta, setObjecionAbierta] = useState<number | null>(0);
  const [copiadoDemo, setCopiadoDemo] = useState(false);

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

  // Notificaciones internas
  const [notificaciones, setNotificaciones] = useState<PartnerNotification[]>(
    resumen.notificaciones ?? []
  );
  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leido).length;

  const marcarComoLeida = async (id: string) => {
    // Update optimista: marcamos leido en el acto y revertimos si el server falla,
    // asi la notificacion no queda "leida" en pantalla pero sin leer en la base.
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leido: true } : n))
    );
    hapticos.suave();
    try {
      await marcarNotificacionPartnerLeidaAction(id);
    } catch {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leido: false } : n))
      );
      hapticos.error();
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

      {/* ── 1.1. Push + Mensajería directa con Santi ─────────────────────── */}
      <ActivarNotificacionesPartner />
      <MensajesPartner />

      {/* ── 1.2. Centro de Notificaciones en Tiempo Real ─────────────────── */}
      {notificaciones.length > 0 && (
        <div className="rounded-[22px] border border-rule bg-paper p-5 space-y-3 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-2">
              <div className="relative p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
                <Bell className="size-4" />
                {notificacionesNoLeidas > 0 && (
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-500 ring-2 ring-paper animate-pulse" />
                )}
              </div>
              <h3 className="text-sm font-bold text-ink">
                Novedades y Actividad de tus Referidos
              </h3>
              {notificacionesNoLeidas > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {notificacionesNoLeidas} nueva{notificacionesNoLeidas === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <span className="text-xs text-ink-soft">
              {notificaciones.length} notificación{notificaciones.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-[14px] border text-xs flex items-start justify-between gap-3 transition-all ${
                  notif.leido
                    ? "bg-paper-2/40 border-rule text-ink-soft opacity-75"
                    : "bg-emerald-500/10 border-emerald-500/30 text-ink shadow-xs"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink text-xs">
                      {notif.titulo}
                    </span>
                    {!notif.leido && (
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                    )}
                  </div>
                  <p className="text-ink-soft text-[11px] leading-relaxed">
                    {notif.mensaje}
                  </p>
                  <span className="text-[10px] text-ink-soft opacity-70 block">
                    {new Date(notif.creado_at).toLocaleString("es-AR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {!notif.leido && (
                  <button
                    type="button"
                    onClick={() => marcarComoLeida(notif.id)}
                    title="Marcar como leída"
                    className="p-1.5 rounded-lg bg-paper border border-rule hover:border-emerald-500 text-ink-soft hover:text-emerald-500 shrink-0 active:scale-90 transition-all"
                  >
                    <CheckCheck className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                    {c.estado === "pendiente" && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        En espera hasta el {new Date(c.disponible_desde).toLocaleDateString("es-AR")}
                      </p>
                    )}
                    {c.estado === "revertida" && (
                      <p className="text-[10px] text-danger font-medium">Revertida</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        c.estado === "revertida"
                          ? "text-ink-soft line-through"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
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

      {/* ── 5. Kit Comercial: Guía de Ventas, Planes y Onboarding ────────── */}
      <div className="rounded-[24px] border border-rule bg-paper p-6 sm:p-7 space-y-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[#10e7a0] text-[10px] font-extrabold uppercase tracking-wide">
              <Sparkles className="size-3" />
              <span>Kit de Ventas Oficial</span>
            </div>
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <FileText className="size-5 text-accent" />
              <span>Guía para Presentar la App a Dueños de Gyms</span>
            </h2>
            <p className="text-xs text-ink-soft max-w-2xl">
              Todo lo que necesitás para explicar el valor de SysGym con seguridad, responder dudas y cerrar gimnasios en tu primer contacto.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <a
              href={`https://wa.me/5492920605208?text=${encodeURIComponent(
                `¡Hola Santi! Soy partner (${partner.nombre}, cód: ${partner.referral_code}). Tengo dudas comerciales para presentar la app a un dueño.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticos.medio()}
              className="h-9 px-3.5 rounded-[12px] bg-paper-2 hover:bg-paper border border-rule hover:border-accent text-ink font-semibold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <HelpCircle className="size-3.5 text-accent" />
              <span>Consultar a Santi</span>
            </a>
          </div>
        </div>

        {/* Bloque 1: ¿Por qué elegirnos? (Pitch rápido) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
            <span>🎯</span>
            <span>¿Por qué elegir SysGym? (Tus 4 argumentos clave)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-[16px] bg-paper-2/60 border border-rule space-y-1.5">
              <div className="size-7 rounded-lg bg-emerald-500/15 text-[#10e7a0] flex items-center justify-center font-bold text-sm">
                🛡️
              </div>
              <h4 className="text-sm font-bold text-ink">Cero fugas de dinero</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                El control de acceso por QR o DNI corta automáticamente a los socios morosos. El gym recupera entre 15% y 25% de cuotas perdidas.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper-2/60 border border-rule space-y-1.5">
              <div className="size-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-sm">
                📲
              </div>
              <h4 className="text-sm font-bold text-ink">App de alumnos 120fps</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Rutinas interactivas, historial de cargas, feedback háptico sensorial y cronómetros de descanso. La mejor retención del mercado.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper-2/60 border border-rule space-y-1.5">
              <div className="size-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-sm">
                🧾
              </div>
              <h4 className="text-sm font-bold text-ink">Facturación AFIP Lista</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Emisión automática de Factura B / C con AFIP integrada en 1 clic. El dueño no necesita abrir la web de AFIP para cada cobro.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper-2/60 border border-rule space-y-1.5">
              <div className="size-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-sm">
                ⚡
              </div>
              <h4 className="text-sm font-bold text-ink">Todo en una sola app</h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Reemplaza 3 costos distintos: software de caja/acceso, app de rutinas y facturador externo. Todo centralizado y en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {/* Bloque 2: Features separados por Plan */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <span>📦</span>
              <span>Features de la app separados por Plan</span>
            </h3>
            <span className="text-[11px] text-ink-soft">
              El plan inicial es 100% gratis hasta 40 socios para probar sin riesgo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plan Inicial */}
            <div className="rounded-[20px] border border-rule bg-paper-2/40 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Plan Inicial
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-paper-2 border border-rule text-ink font-semibold">
                    Gratis
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-ink">Starter / Box Chico</h4>
                  <p className="text-xs text-ink-soft mt-0.5">Hasta 40 socios activos</p>
                </div>
                <ul className="space-y-2 text-xs text-ink-soft pt-2 border-t border-rule/60">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-ink shrink-0 mt-0.5" />
                    <span>Control de alumnos y vencimientos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-ink shrink-0 mt-0.5" />
                    <span>Caja diaria y registro manual de pagos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-ink shrink-0 mt-0.5" />
                    <span>Carga y asignación de rutinas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-ink shrink-0 mt-0.5" />
                    <span>Acceso PWA para profesores</span>
                  </li>
                </ul>
              </div>

              <div className="p-2.5 rounded-[12px] bg-paper border border-rule/80 text-[11px] text-ink-soft">
                💡 <strong>Tip comercial:</strong> Ideal para que el dueño cree su cuenta y pruebe el sistema en el momento sin pagar un peso.
              </div>
            </div>

            {/* Plan Pro */}
            <div className="rounded-[20px] border-2 border-accent/40 bg-gradient-to-b from-accent/5 to-transparent p-5 flex flex-col justify-between gap-4 relative shadow-sm">
              <div className="absolute -top-2.5 right-4 bg-accent text-accent-contrast text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Recomendado
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Plan Pro
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                    Genera Comisión
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-ink">Gimnasio Estándar</h4>
                  <p className="text-xs text-ink-soft mt-0.5">Hasta 150 socios activos</p>
                </div>
                <ul className="space-y-2 text-xs text-ink pt-2 border-t border-rule/60">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span><strong>App del socio PWA 120fps</strong> completa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span>Cobros online con <strong>Mercado Pago Connect</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span>Control de accesos con <strong>código QR dinámico</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span>Gestor de morosidad y avisos automáticos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                    <span>Branding: Logo y colores del gym</span>
                  </li>
                </ul>
              </div>

              <div className="p-2.5 rounded-[12px] bg-paper border border-accent/30 text-[11px] text-ink-soft space-y-1.5">
                <p>
                  🔥 <strong>Tu ganancia:</strong> Al contratar Pro, cobrás tu comisión inmediata ({esArranqueActivo ? "20%" : "15%"}) y suma 1 gym para tus bonos de $180k.
                </p>
                <p>
                  🎁 <strong>Argumento de cierre:</strong> &ldquo;Empezá gratis hoy mismo. Cuando superes los 40 alumnos y pases a un plan de pago, por haber usado mi código tenés el costo de setup 100% bonificado.&rdquo;
                </p>
              </div>
            </div>

            {/* Plan Elite */}
            <div className="rounded-[20px] border border-rule bg-paper-2/40 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-500">
                    Plan Elite / Cadena
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-bold">
                    Máxima Potencia
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-black text-ink">Gimnasios Grandes</h4>
                  <p className="text-xs text-ink-soft mt-0.5">+150 socios o múltiples sedes</p>
                </div>
                <ul className="space-y-2 text-xs text-ink-soft pt-2 border-t border-rule/60">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <span><strong>Facturación AFIP Automática</strong> (Facturas B y C)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Integración con <strong>molinetes y cerraduras</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Soporte prioritario 1 a 1 para migración</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-purple-500 shrink-0 mt-0.5" />
                    <span>Capacidad escalable sin límite de alumnos</span>
                  </li>
                </ul>
              </div>

              <div className="p-2.5 rounded-[12px] bg-paper border border-rule/80 text-[11px] text-ink-soft">
                💎 <strong>Ticket alto:</strong> Ideal para convencer a gimnasios que sufren con la AFIP o tienen torniquetes mecánicos.
              </div>
            </div>
          </div>
        </div>

        {/* Bloque 3: Paso a Paso: Cómo dar de alta al Dueño */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
            <span>🚀</span>
            <span>Paso a Paso: Cómo dar de alta al Dueño</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-[16px] bg-paper border border-rule relative">
              <span className="font-mono text-xs font-black text-accent bg-accent/15 px-2 py-0.5 rounded-md">
                PASO 1
              </span>
              <h4 className="text-sm font-bold text-ink mt-2.5">Envío de tu link</h4>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                Le compartís tu enlace de referido (o le pedís que use tu código <strong className="text-ink font-mono">{partner.referral_code}</strong>) al registrarse.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper border border-rule relative">
              <span className="font-mono text-xs font-black text-accent bg-accent/15 px-2 py-0.5 rounded-md">
                PASO 2
              </span>
              <h4 className="text-sm font-bold text-ink mt-2.5">Configuración Inicial</h4>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                El dueño ingresa el nombre de su gimnasio, carga sus planes de cuota (ej: Pase Libre) y vincula su Mercado Pago en 2 minutos.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper border border-rule relative">
              <span className="font-mono text-xs font-black text-accent bg-accent/15 px-2 py-0.5 rounded-md">
                PASO 3
              </span>
              <h4 className="text-sm font-bold text-ink mt-2.5">Carga de Alumnos</h4>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                Empieza a dar de alta sus alumnos. Si tiene una planilla de Excel previa, le ofrecemos importación rápida asistida.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-paper border border-rule relative">
              <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                PASO 4
              </span>
              <h4 className="text-sm font-bold text-ink mt-2.5">Activación y Comisión</h4>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                Cuando el gym pasa al plan Pro o Elite, tu panel registra automáticamente el cobro y se acredita tu comisión de inmediato.
              </p>
            </div>
          </div>
        </div>

        {/* Bloque 4: Matriz Mata-Objeciones (Respuestas Rápidas) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <span>🥊</span>
              <span>Matriz Mata-Objeciones (Qué responder ante cada duda)</span>
            </h3>
            <span className="text-[11px] text-ink-soft">
              Tus respuestas listas frente al dueño del gimnasio
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                objecion: "“Ya uso Excel y un cuaderno, me alcanza y es gratis”",
                respuesta:
                  "El Excel no le corta el paso al alumno que no pagó ni le manda el recordatorio automático por WhatsApp. Con SysGym recuperás entre 3 y 8 cuotas olvidadas por mes y te ahorrás 15 horas de cargar cobros manuales.",
                gancho: "Ahorro de tiempo + Recupero de cuotas",
              },
              {
                objecion: "“Mis alumnos son grandes y no van a querer usar una app”",
                respuesta:
                  "El sistema no los obliga a instalar nada. En la recepción podés darles ingreso en 1 segundo con su DNI o con un llavero/tarjeta. La app del alumno es un beneficio extra para los que quieran ver su rutina y progresos.",
                gancho: "Cero fricción para alumnos mayores",
              },
              {
                objecion: "“Tengo miedo de que AFIP me complique con la facturación”",
                respuesta:
                  "Todo lo contrario. SysGym emite facturas B o C electrónicas oficiales de AFIP en 1 clic con cada cobro. Te evita tener que entrar a la web lenta de AFIP o pagarle extra a un gestor.",
                gancho: "Tranquilidad fiscal automática",
              },
              {
                objecion: "“Es un lío pasar todos los alumnos que ya tengo anotados”",
                respuesta:
                  "Nosotros te damos soporte prioritario y migramos tu planilla de Excel actual directamente al sistema para que en menos de 24 horas estés funcionando sin perder ningún dato.",
                gancho: "Migración asistida sin esfuerzo",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-[16px] border border-rule bg-paper p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-accent/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-accent bg-accent/15 px-2 py-0.5 rounded-full">
                      {item.gancho}
                    </span>
                    <span className="text-xs text-ink-soft">Objeción #{idx + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-ink leading-snug">
                    {item.objecion}
                  </h4>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed bg-paper-2/60 p-3 rounded-[12px] border border-rule/60">
                    💡 <strong>Cómo responder:</strong> &ldquo;{item.respuesta}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque 5: Calculadora Interactiva de Ganancias para el Partner */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <span>🧮</span>
              <span>Calculadora de Ganancias: ¿Cuánto podés ganar?</span>
            </h3>
            <span className="text-[11px] text-accent font-semibold">
              Comisión inicial en efectivo + Bonos acumulativos
            </span>
          </div>

          <div className="rounded-[20px] border border-rule bg-paper-2/50 p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">
                  ¿Cuántos gimnasios proyectás sumar a SysGym?
                </label>
                <span className="text-base font-black font-mono text-accent bg-accent/15 px-3 py-0.5 rounded-lg border border-accent/30">
                  {simGyms} {simGyms === 1 ? "Gimnasio" : "Gimnasios"}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={simGyms}
                onChange={(e) => {
                  setSimGyms(Number(e.target.value));
                  hapticos.suave();
                }}
                className="w-full accent-[#10e7a0] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink-soft font-mono">
                <span>1 gym</span>
                <span>5 gyms (Bono $20k)</span>
                <span>10 gyms (Bono $60k)</span>
                <span>15+ gyms (Bono $100k)</span>
              </div>
            </div>

            {/* Resultado del cálculo */}
            {(() => {
              // Estimamos ticket promedio plan Pro ~$45.000 ARS
              const ticketPromedio = 45000;
              const gymsArranque = Math.min(5, simGyms);
              const gymsEstandar = Math.max(0, simGyms - 5);
              const comisionTotal =
                gymsArranque * ticketPromedio * (COMISION_ARRANQUE_PCT / 100) +
                gymsEstandar * ticketPromedio * (COMISION_ESTANDAR_PCT / 100);

              let bonosTotal = 0;
              if (simGyms >= 5) bonosTotal += BONOS_HITO[5];
              if (simGyms >= 10) bonosTotal += BONOS_HITO[10];
              if (simGyms >= 15) bonosTotal += BONOS_HITO[15];

              const totalEstimado = comisionTotal + bonosTotal;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-rule/80">
                  <div className="p-3.5 rounded-[14px] bg-paper border border-rule">
                    <span className="text-[11px] text-ink-soft uppercase font-bold tracking-wide">
                      Comisiones Primer Pago
                    </span>
                    <p className="text-lg font-black font-mono text-ink mt-1">
                      ${Math.round(comisionTotal).toLocaleString("es-AR")} ARS
                    </p>
                    <span className="text-[10px] text-ink-soft">
                      {gymsArranque} gyms al 20% + {gymsEstandar} gyms al 15%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[14px] bg-paper border border-rule">
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wide">
                      Bonos Extra por Hito
                    </span>
                    <p className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                      +${bonosTotal.toLocaleString("es-AR")} ARS
                    </p>
                    <span className="text-[10px] text-ink-soft">
                      {simGyms < 5
                        ? "Te faltan " + (5 - simGyms) + " gyms para el bono de $20k"
                        : "¡Premios en efectivo acreditados!"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-[14px] bg-emerald-500/15 border border-emerald-500/40">
                    <span className="text-[11px] text-[#10e7a0] uppercase font-black tracking-wide">
                      Total Estimado a Cobrar
                    </span>
                    <p className="text-xl font-black font-mono text-emerald-600 dark:text-[#10e7a0] mt-1">
                      ${Math.round(totalEstimado).toLocaleString("es-AR")} ARS
                    </p>
                    <span className="text-[10px] text-ink-soft">
                      Retiro directo a tu Mercado Pago o CBU
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Bloque 6: Enlace de Demostración en Vivo & Folleto Comercial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Tarjeta Demo en Vivo */}
          <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
                  <Play className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">
                    Demostración en Vivo para Mostrarle al Dueño
                  </h4>
                  <p className="text-xs text-ink-soft">
                    Mostrale la app funcionando desde tu propio teléfono o compartile el link.
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink-soft bg-paper-2 p-3 rounded-[12px] border border-rule leading-relaxed">
                Mostrale cómo el alumno registra una serie, cómo vibra el cronómetro háptico de descanso y cómo se genera el código QR para entrar al gimnasio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule/60">
              <Link
                href="/mi"
                target="_blank"
                onClick={() => hapticos.medio()}
                className="h-9 px-4 rounded-[10px] bg-accent text-accent-contrast font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                <span>Abrir Demo de Alumno</span>
                <ExternalLink className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const demoUrl = `${window.location.origin}/mi`;
                    await navigator.clipboard.writeText(demoUrl);
                    setCopiadoDemo(true);
                    hapticos.exito();
                    setTimeout(() => setCopiadoDemo(false), 2000);
                  } catch {
                    hapticos.suave();
                  }
                }}
                className="h-9 px-3.5 rounded-[10px] bg-paper-2 hover:bg-paper border border-rule text-ink font-semibold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all"
              >
                {copiadoDemo ? (
                  <>
                    <Check className="size-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-ink-soft" />
                    <span>Copiar link de Demo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tarjeta Folleto Comercial / Ficha Rápida */}
          <div className="rounded-[20px] border border-rule bg-paper p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                  <Download className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">
                    Ficha Comercial y Presentación Digital
                  </h4>
                  <p className="text-xs text-ink-soft">
                    Ficha en 1 carilla lista para imprimir o reenviar en formato imagen por WhatsApp.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-[12px] bg-paper-2 border border-rule text-xs text-ink-soft space-y-1">
                <div className="flex items-center justify-between text-ink font-semibold">
                  <span>Tu Código Oficial:</span>
                  <span className="font-mono text-accent bg-paper px-2 py-0.5 rounded border border-rule">
                    {partner.referral_code}
                  </span>
                </div>
                <p className="text-[11px]">
                  El flyer incluye: Control de accesos QR, Cobros con Mercado Pago, Facturación AFIP y App de Alumnos.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-rule/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  hapticos.exito();
                  window.print();
                }}
                className="w-full h-9 rounded-[10px] bg-paper-2 hover:bg-paper border border-rule hover:border-accent text-ink font-bold text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
              >
                <Download className="size-3.5 text-accent" />
                <span>Descargar / Imprimir Ficha Comercial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bloque 7: Canales de Soporte Directo para el Partner */}
        <div className="p-4 sm:p-5 rounded-[18px] bg-gradient-to-r from-emerald-950/25 via-paper-2 to-paper-2 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-sm font-bold text-ink">¿Tenés una reunión con un gym y querés respaldo?</h4>
            </div>
            <p className="text-xs text-ink-soft">
              Escribile a Santi antes de la reunión o sumate a la Comunidad de Partners para consultar dudas de cierre comercial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <a
              href="https://chat.whatsapp.com/BahGi6pehnB6Iq7M1fW5Y4"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticos.suave()}
              className="h-9 px-3.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
            >
              <Users className="size-3.5" />
              <span>Grupo de WhatsApp</span>
            </a>

            <a
              href={`https://wa.me/5492920605208?text=${encodeURIComponent(
                `¡Hola Santi! Soy partner oficial (${partner.nombre}, código: ${partner.referral_code}). Tengo una consulta para cerrar un gimnasio.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => hapticos.medio()}
              className="h-9 px-3.5 rounded-[10px] bg-paper hover:bg-paper-2 border border-rule hover:border-accent text-ink font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
            >
              <MessageCircle className="size-3.5 text-emerald-500" />
              <span>Chatear con Santi</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 6. Arsenal de Difusión del Partner (Plantillas Listas) ─────── */}
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

              <div>
                <label className="text-xs font-semibold text-ink-soft block mb-1">
                  Tu contraseña (confirmá que sos vos)
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Contraseña de tu cuenta"
                  className="w-full h-10 px-3 rounded-[12px] bg-paper-2 border border-rule text-ink text-sm focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-ink-soft mt-1">
                  Por seguridad, después de cambiar el destino de cobro hay 48hs de espera antes de poder retirar.
                </p>
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
