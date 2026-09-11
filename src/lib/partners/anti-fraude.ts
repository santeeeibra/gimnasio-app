// ─────────────────────────────────────────────────────────────────────────────
// SysGym Partner Engine — Módulo de Detección Anti-Fraude
// Reglas:
// 1. Auto-referido: DNI o Email del dueño del gimnasio coincide con el partner.
// 2. Ráfaga de referidos: >3 altas del mismo partner en una ventana de <48hs.
// ─────────────────────────────────────────────────────────────────────────────

export type AlertaFraude = {
  id: string;
  tipo: "auto_referido" | "rafaga_referidos";
  severidad: "alta" | "media";
  partnerId: string;
  partnerNombre: string;
  partnerCodigo: string;
  gimnasioId?: string;
  gimnasioNombre?: string;
  mensaje: string;
  detalle: string;
  coincidencia?: "dni" | "email" | "user_id";
  altasCount?: number;
  fechaDeteccion: string;
};

export type GymReferidoParaAuditoria = {
  id: string;
  nombre: string;
  creado_at: string;
  referred_by_partner_id: string;
  duenoDni?: string | null;
  duenoEmail?: string | null;
  duenoUserId?: string | null;
};

export type PartnerParaAuditoria = {
  id: string;
  userId: string;
  nombre: string;
  email?: string | null;
  referralCode: string;
  dni?: string | null;
};

const limpiarDni = (dni?: string | null) =>
  dni ? dni.replace(/\D/g, "") : "";

const limpiarEmail = (email?: string | null) =>
  email ? email.trim().toLowerCase() : "";

/**
 * Analiza partners y gimnasios referidos para detectar posibles patrones de fraude.
 */
export function detectarFraudePartners({
  partners,
  gimnasiosReferidos,
}: {
  partners: PartnerParaAuditoria[];
  gimnasiosReferidos: GymReferidoParaAuditoria[];
}): AlertaFraude[] {
  const alertas: AlertaFraude[] = [];
  const partnersMap = new Map<string, PartnerParaAuditoria>(
    partners.map((p) => [p.id, p]),
  );

  // 1. Regla: Detección de Auto-Referido
  for (const gym of gimnasiosReferidos) {
    const partner = partnersMap.get(gym.referred_by_partner_id);
    if (!partner) continue;

    const gymDni = limpiarDni(gym.duenoDni);
    const partnerDni = limpiarDni(partner.dni);
    const gymEmail = limpiarEmail(gym.duenoEmail);
    const partnerEmail = limpiarEmail(partner.email);

    let coincideDni = false;
    let coincideEmail = false;
    let coincideUser = false;

    if (gymDni && partnerDni && gymDni.length >= 5 && gymDni === partnerDni) {
      coincideDni = true;
    }

    if (gymEmail && partnerEmail && gymEmail === partnerEmail) {
      coincideEmail = true;
    }

    if (gym.duenoUserId && partner.userId && gym.duenoUserId === partner.userId) {
      coincideUser = true;
    }

    if (coincideDni || coincideEmail || coincideUser) {
      const motivo =
        coincideDni && coincideEmail
          ? "DNI y Email coinciden"
          : coincideDni
            ? `DNI coincide (${gymDni})`
            : coincideEmail
              ? `Email coincide (${gymEmail})`
              : "Misma cuenta de usuario (user_id)";

      alertas.push({
        id: `auto-ref-${gym.id}-${partner.id}`,
        tipo: "auto_referido",
        severidad: "alta",
        partnerId: partner.id,
        partnerNombre: partner.nombre,
        partnerCodigo: partner.referralCode,
        gimnasioId: gym.id,
        gimnasioNombre: gym.nombre,
        coincidencia: coincideDni ? "dni" : coincideEmail ? "email" : "user_id",
        mensaje: `Auto-referido detectado en "${gym.nombre}"`,
        detalle: `El dueño del gimnasio coincide con el Partner "${partner.nombre}" (${motivo}). Posible auto-bonificación fraudulenta.`,
        fechaDeteccion: new Date().toISOString(),
      });
    }
  }

  // 2. Regla: Detección de Ráfaga de Referidos (>3 altas en ventana de <48hs)
  const gymsPorPartner = new Map<string, GymReferidoParaAuditoria[]>();
  for (const gym of gimnasiosReferidos) {
    const list = gymsPorPartner.get(gym.referred_by_partner_id) ?? [];
    list.push(gym);
    gymsPorPartner.set(gym.referred_by_partner_id, list);
  }

  const VENTANA_48HS_MS = 48 * 60 * 60 * 1000;

  for (const [partnerId, gyms] of gymsPorPartner.entries()) {
    const partner = partnersMap.get(partnerId);
    if (!partner || gyms.length <= 3) continue;

    // Ordenar cronológicamente
    const ordenados = [...gyms].sort(
      (a, b) => new Date(a.creado_at).getTime() - new Date(b.creado_at).getTime(),
    );

    let rafagaDetectada: GymReferidoParaAuditoria[] | null = null;

    for (let i = 0; i < ordenados.length; i++) {
      const tStart = new Date(ordenados[i].creado_at).getTime();
      const tEnd = tStart + VENTANA_48HS_MS;
      const ventana = ordenados.slice(i).filter(
        (g) => new Date(g.creado_at).getTime() <= tEnd,
      );

      if (ventana.length > 3) {
        if (!rafagaDetectada || ventana.length > rafagaDetectada.length) {
          rafagaDetectada = ventana;
        }
      }
    }

    if (rafagaDetectada && rafagaDetectada.length > 3) {
      alertas.push({
        id: `rafaga-${partnerId}-${rafagaDetectada.length}`,
        tipo: "rafaga_referidos",
        severidad: "media",
        partnerId: partner.id,
        partnerNombre: partner.nombre,
        partnerCodigo: partner.referralCode,
        altasCount: rafagaDetectada.length,
        mensaje: `Ráfaga de referidos: ${rafagaDetectada.length} altas en menos de 48hs`,
        detalle: `El partner "${partner.nombre}" (${partner.referralCode}) registró ${rafagaDetectada.length} gimnasios en menos de 48 horas. Requiere revisión manual previa a liquidar comisiones o retiros.`,
        fechaDeteccion: new Date().toISOString(),
      });
    }
  }

  return alertas;
}
