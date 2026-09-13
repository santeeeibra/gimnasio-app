"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ArrowUpRight,
  ExternalLink,
  Trash2,
  Play,
  PlusCircle,
  Building2,
  Wallet,
  AlertTriangle,
  BadgeAlert,
  Coins,
  ShieldAlert,
  RefreshCw,
  AlertOctagon,
  Flame,
  Send,
  MessageCircle,
} from "lucide-react";
import {
  crearGimnasioSimuladoAction,
  simularPagoAprobadoAction,
  borrarDatosSimulacionAction,
  marcarPayoutAction,
  enviarMensajeAdminAPartnerAction,
} from "./actions";
import type { AlertaFraude } from "@/lib/partners/anti-fraude";

export type PartnerAdminItem = {
  id: string;
  nombre: string;
  email: string | null;
  referral_code: string;
  estado: string;
  cbu_cvu: string | null;
  alias_mp: string | null;
  creado_at: string;
  gimnasiosReferidosCount: number;
  balance: number;
  ultimoPayout: {
    monto_ars: number;
    estado: string;
    solicitado_at: string;
  } | null;
};

export type PayoutPendienteItem = {
  id: string;
  partnerId: string;
  partnerNombre: string;
  partnerCodigo: string;
  monto_ars: number;
  destino_snapshot: { cbu_cvu: string | null; alias_mp: string | null } | null;
  nota: string | null;
  solicitado_at: string;
};

export type GymSimuladoItem = {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  creado_at: string;
  referred_by_partner_id: string | null;
  partnerNombre?: string | null;
  partnerCodigo?: string | null;
  pagosCount: number;
  clientesCount: number;
};

export function PartnerAdminClient({
  partners,
  gimnasiosSimulados,
  payoutsPendientes = [],
  alertasFraude = [],
  defaultOrigin = "",
}: {
  partners: PartnerAdminItem[];
  gimnasiosSimulados: GymSimuladoItem[];
  payoutsPendientes?: PayoutPendienteItem[];
  alertasFraude?: AlertaFraude[];
  defaultOrigin?: string;
}) {
  const [copiadoCode, setCopiadoCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [payoutPendingId, setPayoutPendingId] = useState<string | null>(null);
  const [mensajeFeedback, setMensajeFeedback] = useState<{
    tipo: "ok" | "err" | "info";
    texto: string;
  } | null>(null);

  // Advertencias automáticas en la consola dev del navegador
  useEffect(() => {
    if (alertasFraude.length > 0) {
      console.warn(
        `%c⚠️ [ANTI-FRAUDE PARTNERS DEV CONSOLE] Se detectaron ${alertasFraude.length} anomalías de auditoría:`,
        "font-weight: bold; color: #f59e0b;",
      );
      for (const a of alertasFraude) {
        console.warn(
          `%c[${a.tipo.toUpperCase()}] (${a.severidad}) Partner: "${a.partnerNombre}" (${a.partnerCodigo})\n%c-> ${a.mensaje}\nDetalle: ${a.detalle}`,
          "color: #ef4444; font-weight: bold;",
          "color: inherit;",
        );
      }
    }
  }, [alertasFraude]);

  const [copiadoCobroId, setCopiadoCobroId] = useState<string | null>(null);

  // Mensaje directo a un partner puntual (push + bandeja)
  const [mensajeAbiertoId, setMensajeAbiertoId] = useState<string | null>(null);
  const [textoMensaje, setTextoMensaje] = useState("");
  const [enviandoMensajeId, setEnviandoMensajeId] = useState<string | null>(null);

  const handleEnviarMensaje = (partnerId: string) => {
    const cuerpo = textoMensaje.trim();
    if (!cuerpo) return;
    setEnviandoMensajeId(partnerId);
    startTransition(async () => {
      setMensajeFeedback(null);
      const res = await enviarMensajeAdminAPartnerAction(partnerId, cuerpo);
      setMensajeFeedback({ tipo: res.ok ? "ok" : "err", texto: res.msg });
      if (res.ok) {
        setTextoMensaje("");
        setMensajeAbiertoId(null);
      }
      setEnviandoMensajeId(null);
    });
  };

  const copiarDatoCobro = (id: string, texto: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(texto);
      setCopiadoCobroId(id);
      setTimeout(() => setCopiadoCobroId(null), 2000);
    }
  };

  const handleMarcarPayout = (
    payoutId: string,
    nuevoEstado: "pagado" | "rechazado",
    monto: number,
    partnerNombre: string
  ) => {
    let comprobante: string | undefined = undefined;

    if (nuevoEstado === "pagado") {
      const resp = prompt(
        `¿Confirmás marcar como PAGADO el retiro de $${monto.toLocaleString("es-AR")} a "${partnerNombre}"?\n\n(Opcional) Ingresá el código/número de comprobante de la transferencia:`,
        ""
      );
      if (resp === null) return; // canceló el prompt
      comprobante = resp.trim() || undefined;
    } else {
      const confirmacion = confirm(
        `¿Confirmás RECHAZAR el retiro de $${monto.toLocaleString("es-AR")} de "${partnerNombre}"?\n\nEl importe volverá a quedar como saldo disponible en su billetera.`
      );
      if (!confirmacion) return;
    }

    setPayoutPendingId(payoutId);
    startTransition(async () => {
      setMensajeFeedback(null);
      const res = await marcarPayoutAction(payoutId, nuevoEstado, comprobante);
      setMensajeFeedback({ tipo: res.ok ? "ok" : "err", texto: res.msg });
      setPayoutPendingId(null);
    });
  };

  // Estados de formularios
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    partners[0]?.id ?? ""
  );
  const [prefijoGym, setPrefijoGym] = useState<"SIM_" | "DEMO_">("SIM_");
  const [nombreGym, setNombreGym] = useState("");

  const [gymPagoId, setGymPagoId] = useState<string>(
    gimnasiosSimulados[0]?.id ?? ""
  );
  const [montoPago, setMontoPago] = useState<number>(25000);

  // Copiar link al portapapeles
  const copiarLink = (code: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : defaultOrigin;
    const url = `${origin}/registro-gimnasio?ref=${code.toUpperCase()}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiadoCode(code);
      setTimeout(() => setCopiadoCode(null), 2500);
    }
  };

  // 1. Crear Gimnasio de prueba
  const handleCrearGym = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreGym.trim()) {
      alert("Por favor ingresá un nombre para el gimnasio de prueba.");
      return;
    }

    const partnerSeleccionado = partners.find((p) => p.id === selectedPartnerId);
    const partnerTxt = partnerSeleccionado
      ? `al partner "${partnerSeleccionado.nombre}" (${partnerSeleccionado.referral_code})`
      : "sin partner vinculado";

    const confirmacion = confirm(
      `¿Crear gimnasio de prueba "${prefijoGym}${nombreGym.trim()}" en Supabase PRODUCCIÓN?\n\nQuedará vinculado ${partnerTxt}.\nPodrás borrarlo en cualquier momento desde el botón de limpieza.`
    );
    if (!confirmacion) return;

    startTransition(async () => {
      setMensajeFeedback(null);
      const fd = new FormData();
      fd.append("partner_id", selectedPartnerId);
      fd.append("prefijo", prefijoGym);
      fd.append("nombre", nombreGym.trim());

      const res = await crearGimnasioSimuladoAction(fd);
      if (res.ok) {
        setMensajeFeedback({ tipo: "ok", texto: res.msg });
        setNombreGym("");
        if (res.gym) {
          setGymPagoId(res.gym.id);
        }
      } else {
        setMensajeFeedback({ tipo: "err", texto: res.msg });
      }
    });
  };

  // 2. Simular Pago Aprobado
  const handleSimularPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymPagoId) {
      alert("Por favor seleccioná un gimnasio de simulación para recibir el pago.");
      return;
    }

    const gymSeleccionado = gimnasiosSimulados.find((g) => g.id === gymPagoId);
    const confirmacion = confirm(
      `¿Simular PAGO APROBADO de $${montoPago.toLocaleString("es-AR")} sobre "${
        gymSeleccionado?.nombre ?? "el gym seleccionado"
      }"?\n\nSe insertará en pagos_plataforma y pasará a aprobado, disparando triggers de comisiones reales en la base de datos.`
    );
    if (!confirmacion) return;

    startTransition(async () => {
      setMensajeFeedback(null);
      const fd = new FormData();
      fd.append("gimnasio_id", gymPagoId);
      fd.append("monto_ars", String(montoPago));

      const res = await simularPagoAprobadoAction(fd);
      if (res.ok) {
        setMensajeFeedback({ tipo: "ok", texto: res.msg });
      } else {
        setMensajeFeedback({ tipo: "err", texto: res.msg });
      }
    });
  };

  // 3. Borrar Datos de Simulación
  const handleBorrarSimulacion = () => {
    if (gimnasiosSimulados.length === 0) {
      alert("No hay gimnasios de simulación con prefijo SIM_ o DEMO_ actualmente.");
      return;
    }

    const resumenTxt = gimnasiosSimulados
      .map((g) => `• ${g.nombre} (${g.pagosCount} pagos, ${g.clientesCount} alumnos)`)
      .join("\n");

    const confirmacion = confirm(
      `⚠️ ATENCIÓN: LIMPIEZA TOTAL DE SIMULACIÓN ⚠️\n\nSe eliminarán de forma irreversible los siguientes ${gimnasiosSimulados.length} gimnasio(s) de prueba:\n${resumenTxt}\n\nJunto con todos sus pagos, alumnos, perfiles, comisiones y notificaciones asociadas.\n\n¿Deseás proceder con la limpieza?`
    );
    if (!confirmacion) return;

    startTransition(async () => {
      setMensajeFeedback(null);
      const res = await borrarDatosSimulacionAction();
      if (res.ok) {
        setMensajeFeedback({ tipo: "ok", texto: res.msg });
      } else {
        setMensajeFeedback({ tipo: "err", texto: res.msg });
      }
    });
  };

  return (
    <div className="space-y-8 stagger">
      {/* ALERTA DE PRODUCCIÓN / DATO DE SIMULACIÓN */}
      <div className="flex items-start gap-3 rounded-[14px] border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-500">
        <ShieldAlert className="size-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider">
              Entorno Supabase Directo (Producción)
            </span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-amber-400">
              Precaución
            </span>
          </div>
          <p className="text-ink-soft leading-relaxed">
            Las acciones de esta consola escriben directamente en la base de datos viva. Toda fila de prueba se crea con prefijo obligatorio <code className="font-mono text-ink bg-paper px-1 py-0.5 rounded border border-rule">SIM_</code> o <code className="font-mono text-ink bg-paper px-1 py-0.5 rounded border border-rule">DEMO_</code> para aislarla y permitir su borrado seguro con el botón de limpieza.
          </p>
        </div>
      </div>

      {/* BANNER DE NOTIFICACIÓN TEMPORAL */}
      {mensajeFeedback && (
        <div
          className={`flex items-center justify-between rounded-[12px] p-3.5 text-xs font-medium border animate-in fade-in slide-in-from-top-2 duration-200 ${
            mensajeFeedback.tipo === "ok"
              ? "bg-ok/10 border-ok/30 text-ok"
              : mensajeFeedback.tipo === "err"
                ? "bg-danger/10 border-danger/30 text-danger"
                : "bg-paper-2 border-rule text-ink"
          }`}
        >
          <span>{mensajeFeedback.texto}</span>
          <button
            onClick={() => setMensajeFeedback(null)}
            className="text-ink-soft hover:text-ink text-xs underline ml-2"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* CENTRO DE AUDITORÍA & DETECCIÓN ANTI-FRAUDE */}
      <div
        className={`card-cut rounded-[18px] border p-4.5 text-xs transition-all ${
          alertasFraude.length > 0
            ? "border-danger/40 bg-danger/5 text-ink shadow-xs"
            : "border-ok/30 bg-ok/5 text-ink"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {alertasFraude.length > 0 ? (
              <AlertOctagon className="size-5 shrink-0 text-danger mt-0.5" />
            ) : (
              <Check className="size-5 shrink-0 text-ok mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-ink">
                  Auditoría Anti-Fraude & Integridad de Partners
                </span>
                {alertasFraude.length > 0 ? (
                  <span className="rounded-full bg-danger/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-danger border border-danger/30">
                    {alertasFraude.length} alerta{alertasFraude.length > 1 ? "s" : ""} activa{alertasFraude.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="rounded-full bg-ok/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ok border border-ok/30">
                    Auditoría limpia · Sin anomalías detectadas
                  </span>
                )}
              </div>
              <p className="text-ink-soft leading-relaxed">
                Supervisión automática de <strong>Auto-referidos</strong> (DNI o email del dueño idéntico al partner) y <strong>Ráfagas de altas</strong> (&gt;3 gimnasios en &lt;48hs) para revisión manual previa a liquidación de comisiones.
              </p>
            </div>
          </div>
        </div>

        {alertasFraude.length > 0 && (
          <div className="mt-4 space-y-2 pt-3 border-t border-danger/20">
            {alertasFraude.map((alerta) => (
              <div
                key={alerta.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-danger/25 bg-paper p-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        alerta.tipo === "auto_referido"
                          ? "bg-danger/20 text-danger border border-danger/30"
                          : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                      }`}
                    >
                      {alerta.tipo === "auto_referido" ? "🚨 Auto-Referido" : "⚡ Ráfaga <48hs"}
                    </span>
                    <span className="font-bold text-ink">
                      Partner: {alerta.partnerNombre}
                    </span>
                    <code className="font-mono text-[11px] bg-paper-2 px-1.5 py-0.5 rounded border border-rule text-ink-soft">
                      {alerta.partnerCodigo}
                    </code>
                    {alerta.gimnasioNombre && (
                      <span className="text-[11px] text-ink-soft">
                        Gym: <strong className="text-ink">{alerta.gimnasioNombre}</strong>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    {alerta.detalle}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="rounded bg-paper-2 px-2 py-1 text-[10.5px] font-semibold text-danger border border-danger/20">
                    Revisión manual previa a liquidar
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. SECCIÓN: PROGRAMA PARTNER & REFERIDOS ACTIVOS              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-volt/20 text-volt-ink font-bold text-xs">
                1
              </span>
              <h2 className="font-display text-lg font-bold text-ink">
                Programa Partner Oficial
              </h2>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Gestión de embajadores, links de invitación para referidos y balances de comisión.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/panel/partner"
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-ink px-3 text-xs font-semibold text-paper shadow-sm hover:brightness-125 transition-all"
            >
              <Wallet className="size-3.5" />
              <span>Mi Billetera (/panel/partner)</span>
              <ExternalLink className="size-3 opacity-70" />
            </Link>
          </div>
        </div>

        {/* TABLA DE PARTNERS ACTIVOS */}
        <div className="card-cut rounded-[18px] border border-rule bg-paper-2 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-rule/70 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Partners Registrados ({partners.length})
            </h3>
            <span className="text-[11px] text-ink-soft">
              Balance liquidable mediante SQL <code className="font-mono">partner_balance()</code>
            </span>
          </div>

          {partners.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm text-ink-soft">
                No hay partners registrados todavía en la tabla <code className="font-mono">partners</code>.
              </p>
              <Link
                href="/registro-partner"
                className="inline-flex text-xs font-semibold text-volt-ink hover:underline"
              >
                Inscribirse como Partner →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-rule bg-paper text-ink-soft">
                    <th className="py-2.5 px-4 font-semibold">Partner / Código</th>
                    <th className="py-2.5 px-4 font-semibold">Link de Invitación</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Gyms Referidos</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Balance Disponible</th>
                    <th className="py-2.5 px-4 font-semibold">Último Retiro</th>
                    <th className="py-2.5 px-4 font-semibold">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/60">
                  {partners.map((p) => {
                    const esCopiado = copiadoCode === p.referral_code;
                    const mensajeAbierto = mensajeAbiertoId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-paper/60 transition-colors align-top">
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink">{p.nombre}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold bg-paper px-1.5 py-0.5 rounded border border-rule text-ink">
                              {p.referral_code}
                            </span>
                            {p.email && (
                              <span className="text-[11px] text-ink-soft truncate max-w-[140px]">
                                {p.email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => copiarLink(p.referral_code)}
                            className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                              esCopiado
                                ? "border-ok bg-ok/10 text-ok"
                                : "border-rule bg-paper text-ink hover:border-ink"
                            }`}
                          >
                            {esCopiado ? (
                              <>
                                <Check className="size-3.5" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5 text-ink-soft" />
                                <span>Copiar link</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 font-mono text-xs font-bold border border-rule">
                            <Building2 className="size-3 text-ink-soft" />
                            {p.gimnasiosReferidosCount}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-display font-bold text-ink text-sm">
                            ${Number(p.balance).toLocaleString("es-AR")}
                          </span>
                          <span className="block text-[10px] text-ink-soft font-mono">
                            ARS disponible
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {p.ultimoPayout ? (
                            <div>
                              <span className="font-medium text-ink">
                                ${Number(p.ultimoPayout.monto_ars).toLocaleString("es-AR")}
                              </span>
                              <span
                                className={`ml-1.5 inline-block rounded px-1.5 py-0.2 text-[10px] uppercase font-bold ${
                                  p.ultimoPayout.estado === "pagado"
                                    ? "bg-ok/15 text-ok"
                                    : p.ultimoPayout.estado === "rechazado"
                                      ? "bg-danger/15 text-danger"
                                      : "bg-warn/15 text-warn"
                                }`}
                              >
                                {p.ultimoPayout.estado}
                              </span>
                              <span className="block text-[10px] text-ink-soft">
                                {new Date(p.ultimoPayout.solicitado_at).toLocaleDateString("es-AR")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ink-soft italic text-[11px]">Sin retiros</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {mensajeAbierto ? (
                            <div className="flex items-center gap-1.5 min-w-[220px]">
                              <input
                                type="text"
                                autoFocus
                                value={textoMensaje}
                                onChange={(e) => setTextoMensaje(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEnviarMensaje(p.id);
                                  if (e.key === "Escape") setMensajeAbiertoId(null);
                                }}
                                placeholder="Escribir mensaje..."
                                className="w-full rounded-[8px] border border-rule bg-paper px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                              />
                              <button
                                type="button"
                                disabled={enviandoMensajeId === p.id || !textoMensaje.trim()}
                                onClick={() => handleEnviarMensaje(p.id)}
                                className="shrink-0 size-7 inline-flex items-center justify-center rounded-[8px] bg-ink text-paper disabled:opacity-40"
                              >
                                <Send className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMensajeAbiertoId(p.id);
                                setTextoMensaje("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-[8px] border border-rule bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-ink hover:text-ink transition-colors"
                            >
                              <MessageCircle className="size-3.5" />
                              <span>Escribir</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COLA DE RETIROS PENDIENTES */}
        {payoutsPendientes.length === 0 ? (
          <div className="card-cut rounded-[18px] border border-rule bg-paper-2 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-ink-soft">
              <div className="flex size-7 items-center justify-center rounded-full bg-ok/10 text-ok border border-ok/20 shrink-0">
                <Check className="size-4" />
              </div>
              <span>
                <strong className="text-ink font-semibold">Cola de Retiros al día:</strong> No hay solicitudes de liquidación pendientes en este momento.
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-ink-soft bg-paper px-2 py-0.5 rounded border border-rule">
              0 pendientes
            </span>
          </div>
        ) : (
          <div className="card-cut rounded-[18px] border border-warn/40 bg-warn/5 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-warn/30 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BadgeAlert className="size-4 text-warn" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Retiros Pendientes de Liquidación ({payoutsPendientes.length})
                </h3>
              </div>
              <span className="text-[11px] text-ink-soft">
                Transferí el dinero por tu banco/MP y marcá acá como pagado.
              </span>
            </div>
            <ul className="divide-y divide-warn/20">
              {payoutsPendientes.map((payout) => {
                const procesando = isPending && payoutPendingId === payout.id;
                const datoCobro =
                  payout.destino_snapshot?.cbu_cvu ||
                  payout.destino_snapshot?.alias_mp ||
                  null;
                const esCopiado = copiadoCobroId === payout.id;

                return (
                  <li
                    key={payout.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{payout.partnerNombre}</span>
                        <span className="font-mono text-[11px] bg-paper px-1.5 py-0.5 rounded border border-rule text-ink-soft">
                          {payout.partnerCodigo}
                        </span>
                        <span className="text-[11px] text-ink-soft">
                          · {new Date(payout.solicitado_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-ink-soft">Destino:</span>
                        {datoCobro ? (
                          <button
                            type="button"
                            onClick={() => copiarDatoCobro(payout.id, datoCobro)}
                            title="Copiar CBU/Alias"
                            className={`inline-flex items-center gap-1 rounded bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold border transition-colors ${
                              esCopiado
                                ? "border-ok text-ok"
                                : "border-rule text-ink hover:border-ink"
                            }`}
                          >
                            {esCopiado ? <Check className="size-3" /> : <Copy className="size-3 text-ink-soft" />}
                            <span>{datoCobro}</span>
                          </button>
                        ) : (
                          <span className="text-danger italic">Sin datos de cobro registrados</span>
                        )}
                      </div>

                      {payout.nota && (
                        <div className="mt-1 text-[11px] text-ink-soft italic">
                          Nota: {payout.nota}
                        </div>
                      )}

                      {alertasFraude.some((a) => a.partnerId === payout.partnerId) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-[6px] border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                          <AlertOctagon className="size-3.5 shrink-0" />
                          <span>Alerta de auditoría activa en este partner · Revisar antes de transferir</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-display font-bold text-ink text-lg block leading-none">
                          ${payout.monto_ars.toLocaleString("es-AR")}
                        </span>
                        <span className="text-[10px] text-ink-soft font-mono">ARS</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() =>
                            handleMarcarPayout(
                              payout.id,
                              "rechazado",
                              payout.monto_ars,
                              payout.partnerNombre
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-rule bg-paper px-3 text-xs font-semibold text-ink-soft hover:border-danger hover:text-danger disabled:opacity-50 transition-colors"
                        >
                          Rechazar
                        </button>
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() =>
                            handleMarcarPayout(
                              payout.id,
                              "pagado",
                              payout.monto_ars,
                              payout.partnerNombre
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-ok px-3.5 text-xs font-bold text-paper shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          <Check className="size-3.5" />
                          <span>{procesando ? "Procesando..." : "Marcar Pagado"}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SECCIÓN: SIMULAR DATOS DE PRUEBA (TESTING E2E)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-volt/20 text-volt-ink font-bold text-xs">
                2
              </span>
              <h2 className="font-display text-lg font-bold text-ink">
                Simular Datos de Prueba (Testing E2E)
              </h2>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Crea gimnasios de prueba con prefijo forzado, simula cobros para probar triggers y limpia la base con un clic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-500">
              <BadgeAlert className="size-3.5" />
              <span>Simulaciones Activas: {gimnasiosSimulados.length}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* 2.A: CREAR GIMNASIO DE PRUEBA */}
          <div className="card-cut rounded-[18px] border border-rule bg-paper-2 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="size-4 text-ink-soft" />
                <h3 className="text-sm font-bold text-ink">
                  a. Crear Gimnasio de Prueba Referido
                </h3>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">
                Inserta un gimnasio en estado <code className="font-mono">prueba</code> con prefijo obligatorio y lo asigna al partner elegido para probar la vinculación.
              </p>

              <form onSubmit={handleCrearGym} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft uppercase mb-1">
                    Partner Referidor
                  </label>
                  <select
                    value={selectedPartnerId}
                    onChange={(e) => setSelectedPartnerId(e.target.value)}
                    disabled={isPending}
                    className="w-full rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    {partners.length === 0 ? (
                      <option value="">Sin partners disponibles</option>
                    ) : (
                      partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.referral_code})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft uppercase mb-1">
                      Prefijo
                    </label>
                    <select
                      value={prefijoGym}
                      onChange={(e) => setPrefijoGym(e.target.value as "SIM_" | "DEMO_")}
                      disabled={isPending}
                      className="w-full rounded-[10px] border border-rule bg-paper px-2.5 py-2 text-xs font-mono text-ink font-bold focus:border-ink focus:outline-none"
                    >
                      <option value="SIM_">SIM_</option>
                      <option value="DEMO_">DEMO_</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-ink-soft uppercase mb-1">
                      Nombre del Gimnasio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Power Fit Belgrano"
                      value={nombreGym}
                      onChange={(e) => setNombreGym(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || !nombreGym.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] bg-ink px-4 py-2 text-xs font-semibold text-paper shadow-sm hover:brightness-125 disabled:opacity-50 transition-all mt-2"
                >
                  <PlusCircle className="size-3.5" />
                  <span>Crear Gimnasio Simulado</span>
                </button>
              </form>
            </div>
          </div>

          {/* 2.B: SIMULAR PAGO APROBADO */}
          <div className="card-cut rounded-[18px] border border-rule bg-paper-2 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-ink-soft" />
                <h3 className="text-sm font-bold text-ink">
                  b. Simular Pago Aprobado
                </h3>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">
                Inserta un registro en <code className="font-mono">pagos_plataforma</code> (pendiente → aprobado) para disparar los triggers reales de comisión (20% Fast-Start) y balance.
              </p>

              <form onSubmit={handleSimularPago} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft uppercase mb-1">
                    Gimnasio Simulado Destino
                  </label>
                  {gimnasiosSimulados.length === 0 ? (
                    <div className="rounded-[10px] border border-rule bg-paper/60 p-2.5 text-xs text-ink-soft">
                      No hay gimnasios de prueba creados. Creá uno en el paso anterior.
                    </div>
                  ) : (
                    <select
                      value={gymPagoId}
                      onChange={(e) => setGymPagoId(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
                    >
                      {gimnasiosSimulados.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nombre} (Referido: {g.partnerNombre ?? "Sin partner"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft uppercase mb-1">
                    Monto Cobrado (ARS)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={montoPago}
                    onChange={(e) => setMontoPago(Number(e.target.value))}
                    disabled={isPending}
                    className="w-full rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs text-ink font-mono focus:border-ink focus:outline-none"
                  />
                  <span className="text-[10px] text-ink-soft mt-1 block">
                    Comisión estimada al partner: ~${Math.round(montoPago * 0.2).toLocaleString("es-AR")} (20% Fast-Start)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isPending || gimnasiosSimulados.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] bg-ink px-4 py-2 text-xs font-semibold text-paper shadow-sm hover:brightness-125 disabled:opacity-50 transition-all mt-2"
                >
                  <Play className="size-3.5" />
                  <span>Simular Pago Aprobado</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 2.C: LIMPIEZA EXPLÍCITA DE SIMULACIÓN */}
        <div className="card-cut rounded-[18px] border border-danger/30 bg-danger/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trash2 className="size-4 text-danger" />
                <h3 className="text-sm font-bold text-danger">
                  c. Limpieza de Datos de Simulación
                </h3>
              </div>
              <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
                Borra en cascada todos los gimnasios con prefijo <code className="font-mono text-ink">SIM_</code> o <code className="font-mono text-ink">DEMO_</code> junto a sus pagos, alumnos de prueba, perfiles y comisiones generadas. Deja la base de datos limpia como antes de probar.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBorrarSimulacion}
              disabled={isPending || gimnasiosSimulados.length === 0}
              className="inline-flex items-center gap-2 rounded-[10px] bg-danger px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all"
            >
              <Trash2 className="size-3.5" />
              <span>
                {isPending
                  ? "Borrando..."
                  : `Borrar Todos los Datos de Simulación (${gimnasiosSimulados.length})`}
              </span>
            </button>
          </div>

          {/* LISTA DE GIMNASIOS SIMULADOS DETECTADOS */}
          {gimnasiosSimulados.length > 0 && (
            <div className="mt-4 pt-4 border-t border-danger/20">
              <div className="text-[11px] font-bold uppercase tracking-wider text-danger mb-2">
                Gimnasios marcados con badge "DATO DE SIMULACIÓN" a eliminar:
              </div>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {gimnasiosSimulados.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 rounded-[10px] border border-amber-500/30 bg-paper p-2.5 text-xs shadow-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[9px] font-black uppercase text-amber-500">
                          SIMULACIÓN
                        </span>
                        <span className="font-bold text-ink truncate">{g.nombre}</span>
                      </div>
                      <div className="text-[10px] text-ink-soft mt-0.5">
                        {g.pagosCount} pago(s) · {g.clientesCount} alumno(s)
                      </div>
                    </div>
                    <Link
                      href={`/admin/gimnasios/${g.id}`}
                      target="_blank"
                      title="Ver ficha en admin"
                      className="size-7 flex items-center justify-center rounded-[6px] border border-rule text-ink-soft hover:text-ink hover:border-ink transition-colors shrink-0"
                    >
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SECCIÓN: PROBAR FLUJOS REALES                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="border-b border-rule pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-volt/20 text-volt-ink font-bold text-xs">
              3
            </span>
            <h2 className="font-display text-lg font-bold text-ink">
              Probar Flujos del Circuito Partner
            </h2>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Accesos directos a las pantallas clave del ecosistema para probar el ciclo completo de punta a punta.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Link
            href="/registro-partner"
            target="_blank"
            className="group rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink border border-rule">
                1. Alta Partner
              </span>
              <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-ink">/registro-partner</h4>
            <p className="mt-1 text-[11px] text-ink-soft">
              Formulario para que un nuevo embajador se registre y obtenga su código.
            </p>
          </Link>

          <Link
            href="/registro-gimnasio"
            target="_blank"
            className="group rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink border border-rule">
                2. Alta Gym
              </span>
              <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-ink">/registro-gimnasio</h4>
            <p className="mt-1 text-[11px] text-ink-soft">
              Registro del gimnasio. Si lleva <code className="font-mono">?ref=CODIGO</code> se auto-vincula.
            </p>
          </Link>

          <Link
            href="/panel/partner"
            target="_blank"
            className="group rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink border border-rule">
                3. Billetera
              </span>
              <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
            </div>
            <h4 className="text-xs font-bold text-ink">/panel/partner</h4>
            <p className="mt-1 text-[11px] text-ink-soft">
              Vista real del partner: balance en vivo, retiros, ranking e hitos cobrados.
            </p>
          </Link>

          {gimnasiosSimulados[0] ? (
            <Link
              href={`/admin/gimnasios/${gimnasiosSimulados[0].id}`}
              target="_blank"
              className="group rounded-[14px] border border-rule bg-paper-2 p-4 transition-all hover:border-ink hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-500 border border-amber-500/30">
                  4. Ficha Gym Sim
                </span>
                <ArrowUpRight className="size-4 text-ink-soft group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </div>
              <h4 className="text-xs font-bold text-ink truncate">
                {gimnasiosSimulados[0].nombre}
              </h4>
              <p className="mt-1 text-[11px] text-ink-soft">
                Ficha administrativa del gimnasio de prueba en el panel de soporte.
              </p>
            </Link>
          ) : (
            <div className="rounded-[14px] border border-rule/50 bg-paper-2/40 p-4 opacity-60">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink-soft border border-rule">
                  4. Ficha Gym Sim
                </span>
              </div>
              <h4 className="text-xs font-bold text-ink-soft">Sin gym activo</h4>
              <p className="mt-1 text-[11px] text-ink-soft">
                Creá un gimnasio simulado para abrir su ficha directamente.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
