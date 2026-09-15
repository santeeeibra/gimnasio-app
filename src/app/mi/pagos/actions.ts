"use server";

import { headers } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { intentarMutacion } from "@/lib/db/mutaciones";
import { registrarError } from "@/lib/admin/errores";
import {
  calcularCubreHasta,
  estadoCobroAutomatico,
} from "@/lib/pagos/cobro-socio";
import {
  crearLinkConToken,
  crearSuscripcionPreapproval,
  cuentaMP,
} from "@/lib/pagos/mercadopago-connect";
import { enviarPush } from "@/lib/push/enviar";

// El socio paga su cuota con Mercado Pago. La plata va a la cuenta del DUEÑO
// (token de MP Connect del gimnasio), no a la de la plataforma.
//
// Se crea la fila en `pagos` con estado 'pendiente' ANTES de mandarlo al
// checkout: su id es el external_reference con el que después el webhook
// resuelve el pago. `cubre_hasta` se calcula acá de forma provisional (la
// columna es not null) y se recalcula al confirmar.

export type PagarState = { error?: string; url?: string };

export async function iniciarPagoMercadoPago(): Promise<PagarState> {
  const profile = await requireProfile();
  const db = createAdminClient();

  const estado = await estadoCobroAutomatico(db, profile.gimnasio_id);
  if (!estado.activo) {
    return { error: "El pago online no está disponible en tu gimnasio." };
  }

  const { data: cli } = await db
    .from("clientes")
    .select("id, nombre, email, plan_id, plan:planes(id, nombre, precio, duracion_dias)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const plan = (cli as { plan?: {
    id: string;
    nombre: string;
    precio: number | string;
    duracion_dias: number;
  } | null } | null)?.plan;

  if (!cli) return { error: "No encontramos tu ficha de socio." };
  if (!plan) {
    return { error: "Todavía no tenés un plan asignado. Hablá con tu gimnasio." };
  }

  const monto = Number(plan.precio);
  if (!(monto > 0)) {
    return { error: "Tu plan no tiene un precio cargado. Hablá con tu gimnasio." };
  }

  const cuenta = await cuentaMP(db, profile.gimnasio_id);
  if (!cuenta) {
    return { error: "El pago online no está disponible en tu gimnasio." };
  }

  const cubreHastaProvisorio = await calcularCubreHasta(
    db,
    cli.id,
    Number(plan.duracion_dias) || 30,
  );

  const { data: pago, error: pagoErr } = await db
    .from("pagos")
    .insert({
      gimnasio_id: profile.gimnasio_id,
      cliente_id: cli.id,
      plan_id: plan.id,
      monto,
      cubre_hasta: cubreHastaProvisorio,
      estado: "pendiente",
      proveedor: "mercadopago",
    })
    .select("id")
    .single();
  if (pagoErr || !pago) {
    await registrarError(profile.gimnasio_id, "pago", pagoErr);
    return { error: "No pudimos iniciar el pago. Probá de nuevo." };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${h.get("host") ?? ""}`;

  try {
    const link = await crearLinkConToken(db, profile.gimnasio_id, cuenta, {
      referencia: pago.id,
      concepto: `Cuota ${plan.nombre}`,
      montoARS: monto,
      emailPagador: (cli as { email?: string | null }).email ?? null,
      urlRetorno: `${origin}/mi/pagos`,
      // ?ref permite al webhook resolver el gimnasio antes de poder consultar
      // la API de MP (que necesita el token de ese gimnasio).
      urlWebhook: `${origin}/api/pagos-socio/webhook?ref=${pago.id}`,
    });

    if (link.proveedorRef) {
      // El link ya es válido: si no pudimos anotar la referencia no le
      // cerramos el checkout al socio, pero queda registrado para soporte.
      const ref = await intentarMutacion(
        db
          .from("pagos")
          .update({ comprobante_ref: `MP pref ${link.proveedorRef}` })
          .eq("id", pago.id)
          .select("id"),
        "guardar la referencia de Mercado Pago en el pago",
      );
      if (!ref.ok) {
        console.error("[mi/pagos]", ref.msg);
        await registrarError(profile.gimnasio_id, "pago", new Error(ref.msg));
      }
    }

    return { url: link.url };
  } catch (err) {
    // Token revocado / vencido: se cae al flujo manual (transferencia).
    console.error("[mi/pagos] crear link MP:", err);
    await registrarError(profile.gimnasio_id, "pago", err);
    // Si esto no toca ninguna fila el pago queda "pendiente" para siempre y
    // el socio no puede volver a intentar: hay que enterarse.
    const rech = await intentarMutacion(
      db
        .from("pagos")
        .update({ estado: "rechazado" })
        .eq("id", pago.id)
        .select("id"),
      "marcar el pago como rechazado",
    );
    if (!rech.ok) {
      console.error("[mi/pagos]", rech.msg);
      await registrarError(profile.gimnasio_id, "pago", new Error(rech.msg));
    }
    return {
      error:
        "No pudimos abrir el checkout de Mercado Pago. Podés pagar por transferencia con los datos de abajo.",
    };
  }
}

export type SuscripcionState = {
  error?: string;
  url?: string;
  necesitaEmail?: boolean;
};

/** Crea el débito automático / suscripción con Mercado Pago (Preapproval). */
export async function crearSuscripcionMP(
  clienteId?: string,
  emailIngresado?: string,
): Promise<SuscripcionState> {
  const profile = await requireProfile();
  const db = createAdminClient();

  const estado = await estadoCobroAutomatico(db, profile.gimnasio_id);
  if (!estado.activo) {
    return { error: "El cobro automático no está disponible en tu gimnasio." };
  }

  // Buscar ficha del socio
  let query = db
    .from("clientes")
    .select(
      "id, nombre, email, plan_id, mp_preapproval_id, plan:planes(id, nombre, precio, duracion_dias)",
    )
    .eq("gimnasio_id", profile.gimnasio_id)
    // SIEMPRE scopeado al profile autenticado. clienteId llega como prop desde
    // el navegador y este handler corre con el admin client (sin RLS): si se
    // acepta clienteId SIN cotejar profile_id, un socio puede crear/pisar la
    // suscripcion de MP de otro socio del mismo gimnasio.
    .eq("profile_id", profile.id);

  // clienteId queda solo como filtro adicional, nunca como reemplazo del dueno
  // de la ficha.
  if (clienteId) {
    query = query.eq("id", clienteId);
  }

  const { data: cli } = await query.maybeSingle();
  if (!cli) return { error: "No encontramos tu ficha de socio." };

  const plan = (cli as any)?.plan;
  if (!plan) {
    return {
      error: "Todavía no tenés un plan asignado. Hablá con tu gimnasio.",
    };
  }

  const monto = Number(plan.precio);
  if (!(monto > 0)) {
    return {
      error: "Tu plan no tiene un precio cargado. Hablá con tu gimnasio.",
    };
  }

  // Verificar email del pagador (requerido por Preapproval de Mercado Pago)
  const email = (emailIngresado ?? cli.email)?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      error: "Ingresá tu email para continuar con el débito automático.",
      necesitaEmail: true,
    };
  }

  // Si mandó email y no lo tenía en la DB, guardarlo
  if (email && (!cli.email || cli.email !== email)) {
    const mail = await intentarMutacion(
      db.from("clientes").update({ email }).eq("id", cli.id).select("id"),
      "guardar tu email",
    );
    if (!mail.ok) return { error: mail.msg };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${h.get("host") ?? ""}`;

  try {
    const res = await crearSuscripcionPreapproval(db, profile.gimnasio_id, {
      clienteId: cli.id,
      reason: `Cuota ${plan.nombre}`,
      payerEmail: email,
      montoARS: monto,
      backUrl: `${origin}/mi/pagos?mp=ok`,
      applicationFeePct: estado.applicationFeePct,
    });

    // Guardar clientes.mp_preapproval_id. Si esto se pierde, la suscripción
    // queda viva en Mercado Pago sin que la app la conozca: el socio puede
    // terminar con dos débitos automáticos. No se sigue adelante en silencio.
    const pre = await intentarMutacion(
      db
        .from("clientes")
        .update({ mp_preapproval_id: res.id })
        .eq("id", cli.id)
        .select("id"),
      "vincular la suscripción de Mercado Pago a tu ficha",
    );
    if (!pre.ok) {
      console.error("[mi/pagos]", pre.msg);
      await registrarError(profile.gimnasio_id, "pago", new Error(pre.msg));
      return {
        error:
          "Creamos la suscripción pero no pudimos vincularla a tu ficha. Avisale a tu gimnasio antes de reintentar.",
      };
    }

    return { url: res.initPoint };
  } catch (err: any) {
    console.error("[mi/pagos] crear suscripcion MP:", err);
    await registrarError(profile.gimnasio_id, "pago", err);
    return {
      error:
        "No pudimos iniciar el cobro automático de Mercado Pago. Podés pagar por transferencia con los datos de abajo.",
    };
  }
}

// El socio avisa que ya transfirió, para gyms sin cobro automático de MP:
// manda un push a dueño(s) y staff. No confirma el pago solo (eso lo sigue
// haciendo el dueño desde la ficha), es solo el aviso para que no dependa
// de un mensaje aparte por WhatsApp.
export async function avisarTransferenciaAction(): Promise<{
  ok: boolean;
  msg: string;
}> {
  const profile = await requireProfile();
  const admin = createAdminClient();

  const { data: receptores } = await admin
    .from("profiles")
    .select("id")
    .eq("gimnasio_id", profile.gimnasio_id)
    .in("rol", ["dueno", "staff"]);

  const ids = (receptores ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return { ok: false, msg: "No encontramos a quién avisar." };
  }

  await enviarPush(ids, {
    title: "Aviso de pago",
    body: `${profile.nombre} dice que ya transfirió la cuota.`,
    url: "/panel/clientes",
    tag: `transferencia-${profile.id}-${new Date().toISOString().slice(0, 10)}`,
  });

  return { ok: true, msg: "Le avisamos a tu gimnasio." };
}
