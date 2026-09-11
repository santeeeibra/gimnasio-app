"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  X,
  CreditCard,
  QrCode,
  BellRing,
} from "lucide-react";
import { PulpoCard } from "@/components/mascota/pulpo";
import { useHapticos } from "@/lib/ui/hapticos";
import { LIMITE_ALUMNOS_GRATIS } from "@/types/partner";

export type GatingPlanInicialProps = {
  usados: number;
  max?: number;
  esGratuito?: boolean;
};

/**
 * Banner superior en el listado de clientes que muestra el estado del Plan Inicial (40 alumnos).
 * Alerta preventivamente cuando se llega a 35+ y bloquea con CTA al llegar a 40.
 */
export function GatingPlanInicialBanner({
  usados,
  max = LIMITE_ALUMNOS_GRATIS,
  esGratuito = true,
}: GatingPlanInicialProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const hapticos = useHapticos();

  if (!esGratuito) return null;

  const restantes = Math.max(0, max - usados);
  const porcentaje = Math.min(100, Math.round((usados / max) * 100));
  const esTopeAlcanzado = usados >= max;
  const esAlertaCercana = usados >= 35 && !esTopeAlcanzado;

  const handleOpenModal = () => {
    if (esTopeAlcanzado) {
      hapticos.error();
    } else {
      hapticos.medio();
    }
    setModalAbierto(true);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-[16px] border p-4 sm:p-5 transition-all shadow-sm ${
          esTopeAlcanzado
            ? "bg-danger/10 border-danger/40 text-danger-contrast"
            : esAlertaCercana
            ? "bg-amber-500/10 border-amber-500/35"
            : "bg-paper border-rule"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-[12px] shrink-0 ${
                esTopeAlcanzado
                  ? "bg-danger/20 text-danger"
                  : esAlertaCercana
                  ? "bg-amber-500/20 text-amber-500"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {esTopeAlcanzado ? (
                <Lock className="size-5 animate-pulse" />
              ) : esAlertaCercana ? (
                <ShieldAlert className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-paper-2 border border-rule text-ink-soft">
                  Plan Inicial Gratuito
                </span>
                {esTopeAlcanzado ? (
                  <span className="text-xs font-semibold text-danger bg-danger/15 px-2 py-0.5 rounded-full">
                    Límite alcanzado (40/40)
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft">
                    {restantes === 1
                      ? "Queda 1 cupo disponible"
                      : `Quedan ${restantes} cupos disponibles`}
                  </span>
                )}
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-ink">
                {esTopeAlcanzado
                  ? `Llegaste al límite de ${max} alumnos gratuitos`
                  : `Capacidad del Plan Inicial: ${usados} de ${max} alumnos`}
              </h3>

              <p className="text-xs text-ink-soft max-w-xl">
                {esTopeAlcanzado
                  ? "Para seguir registrando nuevos alumnos y activar cobro automático por Mercado Pago o Check-in QR, pasate a un plan Pro o Elite."
                  : "El Plan Inicial incluye hasta 40 alumnos activos sin costo. Pasá a Pro/Elite cuando tu gimnasio necesite crecer sin límites."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 sm:self-center">
            {/* Medidor visual rápido */}
            <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
              <span className="text-xs font-mono font-bold text-ink">
                {usados}/{max} ({porcentaje}%)
              </span>
              <div className="w-full h-2 rounded-full bg-paper-2 overflow-hidden border border-rule">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    esTopeAlcanzado
                      ? "bg-danger"
                      : esAlertaCercana
                      ? "bg-amber-500"
                      : "bg-accent"
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenModal}
              className={`inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] font-semibold text-xs sm:text-sm active:scale-95 transition-all shadow-sm ${
                esTopeAlcanzado
                  ? "bg-danger text-white hover:bg-danger/90"
                  : "bg-accent text-accent-contrast hover:opacity-90"
              }`}
            >
              <span>{esTopeAlcanzado ? "Desbloquear límite" : "Ver planes"}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <GatingPlanInicialModal
          usados={usados}
          max={max}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}

/**
 * Modal interactivo de Gating de Plan Inicial.
 * Muestra el progreso de 40 alumnos, Pulpo Volt festivo y comparativa de beneficios.
 */
export function GatingPlanInicialModal({
  usados,
  max = LIMITE_ALUMNOS_GRATIS,
  onClose,
}: {
  usados: number;
  max?: number;
  onClose: () => void;
}) {
  const hapticos = useHapticos();
  const porcentaje = Math.min(100, Math.round((usados / max) * 100));
  const esTopeAlcanzado = usados >= max;

  const handleClose = () => {
    hapticos.suave();
    onClose();
  };

  const handleCta = () => {
    hapticos.exito();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gating-title"
      onClick={handleClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[24px] border border-rule bg-paper shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header con botón cerrar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PulpoCard
              size={64}
              pose={esTopeAlcanzado ? "festejo" : "kettlebell"}
              cardClassName="!p-2 !rounded-[16px]"
            />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                {esTopeAlcanzado ? "¡Tu gym está creciendo!" : "Plan Inicial SysGym"}
              </span>
              <h2 id="gating-title" className="text-xl font-bold text-ink leading-tight">
                {esTopeAlcanzado
                  ? `Límite de ${max} alumnos alcanzado`
                  : `Cupo: ${usados} de ${max} alumnos`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="size-8 inline-flex items-center justify-center rounded-[10px] bg-paper-2 text-ink-soft hover:text-ink border border-rule active:scale-90 transition-all"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Medidor visual de cupo */}
        <div className="rounded-[16px] bg-paper-2 border border-rule p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-ink-soft">Alumnos activos registrados</span>
            <span
              className={`font-mono font-bold ${
                esTopeAlcanzado ? "text-danger" : "text-ink"
              }`}
            >
              {usados} / {max} ({porcentaje}%)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-paper overflow-hidden border border-rule/60">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                esTopeAlcanzado
                  ? "bg-gradient-to-r from-amber-500 to-danger"
                  : "bg-accent"
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            {esTopeAlcanzado
              ? "Has aprovechado al máximo el Plan Inicial Gratuito. Es momento de dar el salto para no frenar nuevas inscripciones."
              : `Te quedan ${Math.max(0, max - usados)} lugares antes de alcanzar el tope gratuito.`}
          </p>
        </div>

        {/* Beneficios al pasar a Plan Pro o Elite */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Lo que desbloqueás con un Plan Pago
          </h4>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-paper-2/60 border border-rule">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 shrink-0">
                <Zap className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Alumnos Ilimitados</p>
                <p className="text-ink-soft text-[11px]">
                  Sin topes de 40 socios. Sumá todos los clientes que tu sede reciba.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-paper-2/60 border border-rule">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-500 shrink-0">
                <CreditCard className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Cobro Automático Mercado Pago</p>
                <p className="text-ink-soft text-[11px]">
                  Cobrá cuotas recurrentes y olvidate de verificar transferencias a mano.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-paper-2/60 border border-rule">
              <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-500 shrink-0">
                <QrCode className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Módulo de Check-in QR & Reposo</p>
                <p className="text-ink-soft text-[11px]">
                  Totem de acceso en puerta con bloqueo automático por cuota vencida.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-[12px] bg-paper-2/60 border border-rule">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 shrink-0">
                <BellRing className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Avisos de Morosidad Automáticos</p>
                <p className="text-ink-soft text-[11px]">
                  Recordatorios automáticos por WhatsApp y notificaciones antes del vencimiento.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="pt-2 border-t border-rule flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/panel/plan"
            onClick={handleCta}
            className="w-full sm:flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-[12px] bg-accent text-accent-contrast font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <span>Ver Planes y Activar</span>
            <ArrowRight className="size-4" />
          </Link>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto h-11 px-5 rounded-[12px] border border-rule bg-paper-2 text-ink-soft hover:text-ink font-medium text-xs active:scale-95 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
