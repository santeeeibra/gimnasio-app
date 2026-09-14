"use server";

import { headers } from "next/headers";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/mail/enviar";
import { pasarela } from "@/lib/pagos";
import {
  type TipoPago,
  TIPO_PAGO_LABEL,
  aplicarDescuento,
  enVentanaEarlyBird,
  enVentanaPromoSetupGratis,
  EARLY_BIRD_PCT,
  montoBaseCargoUnico,
  tipoAdmiteEarlyBird,
} from "@/lib/plataforma/precios";

export type SolicitudState = { ok?: boolean; msg?: string };

export type PagoState = {
  ok?: boolean;
  msg?: string;
  redirect?: string;
  montoARS?: number;
  /** monto sin descuento, presente solo si hubo early-bird. */
  montoOriginalARS?: number;
  descuentoPct?: number;
  dias?: number;
  planNombre?: string;
  tipo?: TipoPago;
};

const TIPOS_VALIDOS: TipoPago[] = ["plan_mensual", "setup", "premium"];

// El dueño genera un pago de su plan de plataforma. Crea la fila en
// pagos_plataforma y delega en la pasarela configurada (env PASARELA_PAGO).
// Con el adapter `manual` no hay checkout: se muestran los datos de
// transferencia y soporte confirma. Con un adapter automático, `redirect`
// lleva al checkout hosteado y el webhook aprueba el pago.
export async function generarPagoPlan(
  _prev: PagoState | null,
  formData: FormData,
): Promise<PagoState> {
  const dueno = await requireDueno();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;
  const tipoRaw = String(formData.get("tipo") ?? "plan_mensual") as TipoPago;
  const tipo: TipoPago = TIPOS_VALIDOS.includes(tipoRaw) ? tipoRaw : "plan_mensual";

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select(
      "nombre, slug, creado_at, plan:planes_plataforma(id, nombre, precio_mensual)",
    )
    .eq("id", dueno.gimnasio_id)
    .single();

  const planIdRaw = String(formData.get("plan_id") ?? "").trim();
  let plan: {
    id: string;
    nombre: string;
    precio_mensual: number | string;
    max_socios?: number | null;
  } | null = null;

  if (tipo === "plan_mensual") {
    if (planIdRaw) {
      const { data: planElegido } = await db
        .from("planes_plataforma")
        .select("id, nombre, max_socios, precio_mensual, activo")
        .eq("id", planIdRaw)
        .eq("activo", true)
        .maybeSingle();

      if (!planElegido) {
        return {
          ok: false,
          msg: "El plan seleccionado no es válido o ya no está disponible.",
        };
      }

      // Validar que la cantidad de socios actual no supere el cupo del plan
      if (planElegido.max_socios != null) {
        const { count } = await db
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("gimnasio_id", dueno.gimnasio_id);
        const sociosActuales = count ?? 0;
        if (sociosActuales > planElegido.max_socios) {
          return {
            ok: false,
            msg: `Tenés ${sociosActuales} socios activos. El plan ${planElegido.nombre} permite hasta ${planElegido.max_socios} socios.`,
          };
        }
      }

      plan = planElegido;
    } else {
      plan = (gym?.plan ?? null) as {
        id: string;
        nombre: string;
        precio_mensual: number | string;
      } | null;
    }
  }

  // Monto base y período según el tipo de cargo.
  //  · plan_mensual: precio del plan asignado o seleccionado, 30 días.
  //  · setup / premium: cargo único, no extiende el período (dias = 0).
  const montoBase =
    tipo === "plan_mensual"
      ? Number(plan?.precio_mensual ?? 0) // Supabase devuelve numeric como string
      : montoBaseCargoUnico(tipo);
  const dias = tipo === "plan_mensual" ? 30 : 0;
  const via = pasarela();

  if (tipo === "plan_mensual" && via.automatica && !(montoBase > 0)) {
    return {
      ok: false,
      msg: "Tu plan no tiene un precio configurado. Avisale a soporte para que lo cargue.",
    };
  }

  // Bloqueo de pagos duplicados (fix de UX). Un pago pendiente del mismo tipo
  // bloquea; además los cargos únicos (setup/premium) no se pueden volver a
  // pagar si ya hay uno aprobado.
  const estadosQueBloquean =
    tipo === "plan_mensual" ? ["pendiente"] : ["pendiente", "aprobado"];
  const { data: previos } = await db
    .from("pagos_plataforma")
    .select("id, estado")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("tipo", tipo)
    .in("estado", estadosQueBloquean)
    .limit(1);
  if (previos && previos.length > 0) {
    const yaAprobado = previos[0].estado === "aprobado";
    return {
      ok: false,
      msg: yaAprobado
        ? `Ya abonaste "${TIPO_PAGO_LABEL[tipo]}". Es un cargo único.`
        : "Ya tenés un pago de este tipo pendiente de confirmación.",
    };
  }

  // Descuento early-bird: 15% si compra dentro de los primeros 3 días de la
  // prueba (contados desde gimnasios.creado_at). Aplica a plan mensual y setup.
  const earlyBird =
    !!gym?.creado_at &&
    tipoAdmiteEarlyBird(tipo) &&
    enVentanaEarlyBird(gym.creado_at) &&
    montoBase > 0;

  // Promo "setup gratis": 100% off por tiempo limitado (ver precios.ts).
  const promoSetupGratis = tipo === "setup" && enVentanaPromoSetupGratis();

  const descuentoPct = promoSetupGratis ? 100 : earlyBird ? EARLY_BIRD_PCT : 0;
  const montoARS = aplicarDescuento(montoBase, descuentoPct);

  const { data: pago, error } = await db
    .from("pagos_plataforma")
    .insert({
      gimnasio_id: dueno.gimnasio_id,
      plan_plataforma_id: tipo === "plan_mensual" ? plan?.id ?? null : null,
      tipo,
      monto_ars: montoARS,
      monto_original_ars: descuentoPct > 0 ? montoBase : null,
      descuento_pct: descuentoPct,
      dias,
      proveedor: via.nombre,
      nota,
    })
    .select("id")
    .single();
  if (error || !pago) {
    return { ok: false, msg: "No se pudo registrar el pago. Probá de nuevo." };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${h.get("host") ?? ""}`;

  const concepto =
    tipo === "plan_mensual"
      ? `Plan ${plan?.nombre ?? "plataforma"} · ${gym?.nombre ?? ""} · ${dias} días`
      : `${TIPO_PAGO_LABEL[tipo]} · ${gym?.nombre ?? ""} (cargo único)`;

  let emailPagador: string | null = null;
  try {
    const { data: userAuth } = await db.auth.admin.getUserById(dueno.id);
    emailPagador = userAuth?.user?.email ?? null;
  } catch {
    /* best effort */
  }

  let link;
  try {
    link = await via.crearLink({
      referencia: pago.id as string,
      concepto,
      montoARS,
      emailPagador,
      urlRetorno: `${origin}/panel/plan`,
    });
  } catch (err) {
    console.error("[pagos] crearLink:", err);
    await db
      .from("pagos_plataforma")
      .update({ estado: "rechazado" })
      .eq("id", pago.id)
      .eq("estado", "pendiente");
    return {
      ok: false,
      msg: "No se pudo generar el pago ahora. Probá en un rato o avisá a soporte.",
    };
  }

  if (via.automatica) {
    return { ok: true, redirect: link.url };
  }

  // Flujo manual: avisar a soporte por email (best-effort).
  const to = process.env.PAGOS_EMAIL ?? process.env.ADMIN_EMAIL;
  if (to) {
    await enviarEmail({
      to,
      subject: `[Pago] ${gym?.nombre ?? dueno.gimnasio_id} generó un pago pendiente`,
      text: [
        `Pago pendiente de confirmar.`,
        ``,
        `Gimnasio: ${gym?.nombre ?? "—"} (${gym?.slug ?? "—"})`,
        `Dueño: ${dueno.nombre ?? "—"} · profile ${dueno.id}`,
        `Concepto: ${TIPO_PAGO_LABEL[tipo]}${
          tipo === "plan_mensual" ? ` (${plan?.nombre ?? "sin plan"})` : " (cargo único)"
        }`,
        descuentoPct > 0
          ? `Monto: $${montoARS} (early-bird -${descuentoPct}% · sin descuento $${montoBase})`
          : `Monto: $${montoARS}`,
        `Período: ${dias} días`,
        `Pago id: ${pago.id}`,
        `Nota: ${nota ?? "(sin nota)"}`,
        ``,
        `Confirmar en /admin/gimnasios/${dueno.gimnasio_id}`,
      ].join("\n"),
    });
  }

  return {
    ok: true,
    msg:
      tipo === "plan_mensual"
        ? "Pago registrado. Hacé la transferencia y soporte lo confirma; tu plan se renueva al confirmarlo."
        : "Pago registrado. Hacé la transferencia y soporte lo confirma.",
    montoARS,
    montoOriginalARS: descuentoPct > 0 ? montoBase : undefined,
    descuentoPct,
    dias,
    tipo,
    planNombre: plan?.nombre ?? "plataforma",
  };
}

// El dueño pide activar o ampliar su plan. Manda un email al contacto de
// pagos (PAGOS_EMAIL, o ADMIN_EMAIL como fallback).
export async function solicitarActivacionPlan(
  _prev: SolicitudState | null,
  formData: FormData,
): Promise<SolicitudState> {
  const dueno = await requireDueno();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 1000);

  const to = process.env.PAGOS_EMAIL ?? process.env.ADMIN_EMAIL;
  if (!to) {
    return {
      ok: false,
      msg: "El contacto de soporte no está configurado. Escribinos por otro medio.",
    };
  }

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select(
      "nombre, slug, estado, plan_plataforma_vence_el, plan:planes_plataforma(nombre, max_socios)",
    )
    .eq("id", dueno.gimnasio_id)
    .single();
  const { count } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", dueno.gimnasio_id);

  const plan = (gym?.plan ?? null) as {
    nombre: string;
    max_socios: number | null;
  } | null;

  const text = [
    `Solicitud de activación / ampliación de plan.`,
    ``,
    `Gimnasio: ${gym?.nombre ?? "—"} (${gym?.slug ?? "—"})`,
    `Dueño: ${dueno.nombre ?? "—"} · profile ${dueno.id}`,
    `Estado actual: ${gym?.estado ?? "—"}`,
    `Plan actual: ${plan?.nombre ?? "sin plan"}${
      plan?.max_socios != null ? ` (tope ${plan.max_socios})` : ""
    }`,
    `Socios actuales: ${count ?? 0}`,
    `Vence: ${gym?.plan_plataforma_vence_el ?? "—"}`,
    ``,
    `Nota del dueño: ${nota || "(sin nota)"}`,
  ].join("\n");

  const enviado = await enviarEmail({
    to,
    subject: `[Planes] ${gym?.nombre ?? dueno.gimnasio_id} pide activar/ampliar`,
    text,
  });

  return enviado
    ? { ok: true, msg: "Listo, le avisamos a soporte. Te contactan a la brevedad." }
    : { ok: false, msg: "No se pudo enviar la solicitud. Probá de nuevo en un rato." };
}

/**
 * Registra que el dueño del gimnasio ya completó o cerró el tour guiado
 * del flujo de pagos de planes.
 */
export async function marcarTourPagoVisto(): Promise<{ ok: boolean }> {
  try {
    const dueno = await requireDueno();
    const db = createAdminClient();
    const { error } = await db
      .from("gimnasios")
      .update({ tour_pago_visto: true })
      .eq("id", dueno.gimnasio_id);

    if (error) {
      console.error("[marcarTourPagoVisto]", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[marcarTourPagoVisto]", err);
    return { ok: false };
  }
}

