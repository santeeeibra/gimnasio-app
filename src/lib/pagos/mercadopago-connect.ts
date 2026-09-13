import "server-only";

import { aplicarMutacion } from "@/lib/db/mutaciones";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mercado Pago Connect (OAuth): a diferencia de `mercadopago.ts` — que usa el
// MP_ACCESS_TOKEN global de la plataforma para cobrarle al DUEÑO — acá el
// access_token es el de la cuenta de MP de CADA gimnasio, y sirve para que el
// SOCIO le pague al dueño. La plata entra a la cuenta del dueño.
//
// Env: MP_CONNECT_CLIENT_ID, MP_CONNECT_CLIENT_SECRET,
//      MP_CONNECT_REDIRECT_URI (opcional: si falta se arma con el host).

const API = "https://api.mercadopago.com";
const AUTH = "https://auth.mercadopago.com/authorization";

export function connectConfigurado(): boolean {
  return Boolean(
    (process.env.MERCADOPAGO_CLIENT_ID || process.env.MP_CONNECT_CLIENT_ID) &&
      (process.env.MERCADOPAGO_CLIENT_SECRET || process.env.MP_CONNECT_CLIENT_SECRET),
  );
}

function clientId(): string {
  const v =
    process.env.MERCADOPAGO_CLIENT_ID ?? process.env.MP_CONNECT_CLIENT_ID;
  if (!v) throw new Error("Falta MERCADOPAGO_CLIENT_ID (o MP_CONNECT_CLIENT_ID).");
  return v;
}

export function clientSecret(): string {
  const v =
    process.env.MERCADOPAGO_CLIENT_SECRET ??
    process.env.MP_CONNECT_CLIENT_SECRET;
  if (!v)
    throw new Error(
      "Falta MERCADOPAGO_CLIENT_SECRET (o MP_CONNECT_CLIENT_SECRET).",
    );
  return v;
}

export function redirectUri(origin: string): string {
  return (
    process.env.MERCADOPAGO_REDIRECT_URI ??
    process.env.MP_CONNECT_REDIRECT_URI ??
    new URL("/api/mercadopago/callback", origin).toString()
  );
}

// ---------------------------------------------------------------- state ----
// El `state` del OAuth viaja por el navegador del dueño: se firma con HMAC
// para que nadie pueda vincular su cuenta de MP a otro gimnasio.

export function firmarState(gimnasioId: string): string {
  const ts = Date.now().toString(36);
  const payload = `${gimnasioId}.${ts}`;
  const mac = createHmac("sha256", clientSecret()).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

/** Devuelve el gimnasio_id si la firma es válida y no venció (15 min). */
export function verificarState(state: string): string | null {
  const partes = state.split(".");
  if (partes.length !== 3) return null;
  const [gimnasioId, ts, mac] = partes;
  const esperado = createHmac("sha256", clientSecret())
    .update(`${gimnasioId}.${ts}`)
    .digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const emitido = parseInt(ts, 36);
  if (!Number.isFinite(emitido) || Date.now() - emitido > 15 * 60_000) {
    return null;
  }
  return gimnasioId;
}

export function urlAutorizacion(origin: string, gimnasioId: string): string {
  const u = new URL(AUTH);
  u.searchParams.set("client_id", clientId());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("platform_id", "mp");
  u.searchParams.set("redirect_uri", redirectUri(origin));
  u.searchParams.set("state", firmarState(gimnasioId));
  return u.toString();
}

// ---------------------------------------------------------------- tokens ---

export type TokensMP = {
  accessToken: string;
  refreshToken: string | null;
  collectorId: string | null;
  userId: string | null;
  expiresIn?: number;
};

async function oauthToken(body: Record<string, string>): Promise<TokensMP> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`MP oauth/token ${res.status}: ${await res.text()}`);
  }
  const d = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    user_id?: number | string;
    expires_in?: number;
  };
  const uid = d.user_id != null ? String(d.user_id) : null;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? null,
    collectorId: uid,
    userId: uid,
    expiresIn: d.expires_in,
  };
}

/** Canjea el `code` del callback por los tokens del dueño. */
export function canjearCode(code: string, origin: string): Promise<TokensMP> {
  return oauthToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(origin),
  });
}

export function refrescarToken(
  refreshToken: string,
): Promise<TokensMP> {
  return oauthToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export type CuentaMP = {
  accessToken: string;
  refreshToken: string | null;
  collectorId: string | null;
  userId: string | null;
  tokenExpiraEn: string | null;
};

/** Lee las credenciales de MP de un gimnasio. Requiere client service_role. */
export async function cuentaMP(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<CuentaMP | null> {
  const { data } = await db
    .from("gimnasios")
    .select("mp_access_token, mp_refresh_token, mp_collector_id, mp_user_id, mp_token_expira_en")
    .eq("id", gimnasioId)
    .maybeSingle();
  if (!data?.mp_access_token) return null;
  const uid =
    (data.mp_user_id as string | null) ??
    (data.mp_collector_id as string | null) ??
    null;
  return {
    accessToken: data.mp_access_token as string,
    refreshToken: (data.mp_refresh_token as string | null) ?? null,
    collectorId: uid,
    userId: uid,
    tokenExpiraEn: (data.mp_token_expira_en as string | null) ?? null,
  };
}

export async function guardarTokens(
  db: SupabaseClient,
  gimnasioId: string,
  t: TokensMP,
): Promise<void> {
  const expiraEn = t.expiresIn
    ? new Date(Date.now() + t.expiresIn * 1000).toISOString()
    : new Date(Date.now() + 180 * 86400 * 1000).toISOString();

  // Si el UPDATE no toca ninguna fila, el gimnasio queda sin token: el
  // callback de OAuth reportaría "vinculado" y todos los cobros fallarían.
  await aplicarMutacion(
    db
      .from("gimnasios")
      .update({
        mp_access_token: t.accessToken,
        mp_refresh_token: t.refreshToken,
        mp_collector_id: t.userId ?? t.collectorId,
        mp_user_id: t.userId ?? t.collectorId,
        mp_token_expira_en: expiraEn,
        mp_vinculado_at: new Date().toISOString(),
      })
      .eq("id", gimnasioId)
      .select("id"),
    "guardar los tokens de Mercado Pago del gimnasio",
  );
}

export async function desvincular(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<void> {
  // Desvincular en falso dejaría tokens vivos en la base después de que el
  // dueño pidió desconectar su cuenta.
  await aplicarMutacion(
    db
      .from("gimnasios")
      .update({
        mp_access_token: null,
        mp_refresh_token: null,
        mp_collector_id: null,
        mp_user_id: null,
        mp_token_expira_en: null,
        mp_vinculado_at: null,
      })
      .eq("id", gimnasioId)
      .select("id"),
    "desvincular la cuenta de Mercado Pago del gimnasio",
  );
}

/** Asegura que el gimnasio tenga un access_token válido, refrescándolo si expiró o vence pronto. */
export async function asegurarTokenValido(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<string> {
  const { data } = await db
    .from("gimnasios")
    .select("mp_access_token, mp_refresh_token, mp_user_id, mp_collector_id, mp_token_expira_en")
    .eq("id", gimnasioId)
    .maybeSingle();

  if (!data?.mp_access_token) {
    throw new Error("Gimnasio no tiene cuenta de Mercado Pago vinculada.");
  }

  const expira = data.mp_token_expira_en ? new Date(data.mp_token_expira_en).getTime() : 0;
  // Margen de seguridad: refrescar si vence en menos de 60 minutos o ya venció
  const margen = 60 * 60 * 1000;
  if (data.mp_refresh_token && (expira === 0 || Date.now() + margen >= expira)) {
    try {
      const nuevos = await refrescarToken(data.mp_refresh_token);
      const merge: TokensMP = {
        accessToken: nuevos.accessToken,
        refreshToken: nuevos.refreshToken ?? data.mp_refresh_token,
        collectorId: nuevos.userId ?? data.mp_user_id ?? data.mp_collector_id,
        userId: nuevos.userId ?? data.mp_user_id ?? data.mp_collector_id,
        expiresIn: nuevos.expiresIn,
      };
      await guardarTokens(db, gimnasioId, merge);
      return merge.accessToken;
    } catch (err) {
      console.error("[mp-connect] Error refrescando token:", err);
      return data.mp_access_token;
    }
  }

  return data.mp_access_token;
}

// Los access_token de MP vencen (~180 días). Toda llamada a la API pasa por
// acá: si devuelve 401 se refresca con el refresh_token, se guarda el token
// nuevo y se reintenta una sola vez. Sin esto el cobro automático se caería
// en silencio a los 6 meses.
export async function fetchMP(
  db: SupabaseClient,
  gimnasioId: string,
  cuenta: CuentaMP,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const pedir = (token: string) =>
    fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  const res = await pedir(cuenta.accessToken);
  if (res.status !== 401 || !cuenta.refreshToken) return res;

  const nuevos = await refrescarToken(cuenta.refreshToken);
  // MP no siempre devuelve refresh_token/user_id al refrescar.
  const merge: TokensMP = {
    accessToken: nuevos.accessToken,
    refreshToken: nuevos.refreshToken ?? cuenta.refreshToken,
    collectorId: nuevos.collectorId ?? cuenta.collectorId,
    userId: nuevos.userId ?? cuenta.userId ?? cuenta.collectorId,
    expiresIn: nuevos.expiresIn,
  };
  await guardarTokens(db, gimnasioId, merge);
  cuenta.accessToken = merge.accessToken;
  cuenta.refreshToken = merge.refreshToken;
  return pedir(merge.accessToken);
}

// ------------------------------------------------------------- checkout ----

export type DatosLinkSocio = {
  /** id del pago interno (pagos.id) -> external_reference. */
  referencia: string;
  concepto: string;
  montoARS: number;
  emailPagador: string | null;
  /** a dónde vuelve el socio (ej: <origin>/mi/pagos). */
  urlRetorno: string;
  /** URL absoluta del webhook multi-tenant. */
  urlWebhook: string;
};

/** Crea la preferencia de Checkout Pro con el token del DUEÑO. */
export async function crearLinkConToken(
  db: SupabaseClient,
  gimnasioId: string,
  cuenta: CuentaMP,
  d: DatosLinkSocio,
): Promise<{ url: string; proveedorRef: string | null }> {
  const monto = Number(d.montoARS);
  if (!(monto > 0)) throw new Error("El monto del pago debe ser mayor a 0.");

  const res = await fetchMP(db, gimnasioId, cuenta, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          title: d.concepto.slice(0, 250),
          quantity: 1,
          unit_price: Number(monto.toFixed(2)),
          currency_id: "ARS",
        },
      ],
      external_reference: d.referencia,
      ...(d.emailPagador ? { payer: { email: d.emailPagador } } : {}),
      back_urls: {
        success: d.urlRetorno,
        pending: d.urlRetorno,
        failure: d.urlRetorno,
      },
      auto_return: "approved",
      notification_url: d.urlWebhook,
    }),
  });
  if (!res.ok) {
    throw new Error(`MP preferences ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; init_point: string };
  return { url: data.init_point, proveedorRef: data.id ?? null };
}

export type PagoMP = {
  estado: "aprobado" | "pendiente" | "rechazado";
  referencia: string | null;
  montoARS: number | null;
};

/** GET /v1/payments/{id} con el token del dueño. */
export async function leerPagoConToken(
  db: SupabaseClient,
  gimnasioId: string,
  cuenta: CuentaMP,
  pagoMpId: string,
): Promise<PagoMP> {
  const res = await fetchMP(db, gimnasioId, cuenta, `/v1/payments/${pagoMpId}`);
  if (!res.ok) throw new Error(`MP payment ${pagoMpId} ${res.status}`);
  const p = (await res.json()) as {
    status: string;
    external_reference: string | null;
    transaction_amount: number | null;
  };
  return {
    estado:
      p.status === "approved"
        ? "aprobado"
        : p.status === "rejected" || p.status === "cancelled"
          ? "rechazado"
          : "pendiente",
    referencia: p.external_reference,
    montoARS: p.transaction_amount,
  };
}

/** Extrae type/data.id de la notificación (query string o body). */
export async function leerNotificacion(
  req: Request,
): Promise<{ dataId: string } | null> {
  const url = new URL(req.url);
  let tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");
  let dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!tipo || !dataId) {
    const body = (await req.json().catch(() => null)) as
      | { type?: string; topic?: string; data?: { id?: string } }
      | null;
    tipo = tipo ?? body?.type ?? body?.topic ?? null;
    dataId = dataId ?? body?.data?.id ?? null;
  }
  if (tipo !== "payment" || !dataId) return null;
  return { dataId: String(dataId) };
}

// -------------------------------------------------------- preapproval / suscripciones ----

export type DatosSuscripcionSocio = {
  clienteId: string;
  reason: string;
  payerEmail: string;
  montoARS: number;
  backUrl: string;
  applicationFeePct?: number | null;
};

/** Crea la suscripción de débito automático (Preapproval) en Mercado Pago. */
export async function crearSuscripcionPreapproval(
  db: SupabaseClient,
  gimnasioId: string,
  d: DatosSuscripcionSocio,
): Promise<{ id: string; initPoint: string }> {
  const token = await asegurarTokenValido(db, gimnasioId);
  const monto = Number(d.montoARS);
  if (!(monto > 0)) throw new Error("El monto de la cuota debe ser mayor a 0.");

  const body: Record<string, any> = {
    reason: d.reason.slice(0, 250),
    payer_email: d.payerEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: Number(monto.toFixed(2)),
      currency_id: "ARS",
    },
    back_url: d.backUrl,
    external_reference: d.clienteId,
  };

  if (d.applicationFeePct && d.applicationFeePct > 0) {
    body.application_fee = Number(((monto * d.applicationFeePct) / 100).toFixed(2));
  }

  let res = await fetch(`${API}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Si MP no permite application_fee en la cuenta del dueño para Preapproval, reintentar sin el fee
  if (!res.ok && body.application_fee) {
    delete body.application_fee;
    res = await fetch(`${API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`MP preapproval ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, initPoint: data.init_point };
}

/** Consulta el detalle de un Preapproval en Mercado Pago. */
export async function leerPreapprovalConToken(
  db: SupabaseClient,
  gimnasioId: string,
  preapprovalId: string,
): Promise<{
  id: string;
  status: string;
  reason?: string;
  external_reference?: string;
  payer_email?: string;
}> {
  const token = await asegurarTokenValido(db, gimnasioId);
  const res = await fetch(`${API}/preapproval/${preapprovalId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`MP preapproval ${preapprovalId} ${res.status}`);
  return (await res.json()) as any;
}

// ------------------------------------------------------------- firma webhook ----

/** Valida la firma x-signature del webhook de Mercado Pago. */
export function validarFirmaWebhookMP(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secretOverride?: string,
): boolean {
  let clave: string;
  try {
    clave = secretOverride ?? clientSecret();
  } catch {
    return false;
  }
  if (!xSignature || !dataId || !clave) return false;

  const partes = xSignature.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.trim().split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  // Manifest: id:{data.id};request-id:{x-request-id};ts:{ts};
  // Si xRequestId no viene en el header, puede omitirse según doc de MP
  const manifest = xRequestId
    ? `id:${dataId};request-id:${xRequestId};ts:${ts};`
    : `id:${dataId};ts:${ts};`;

  const esperado = createHmac("sha256", clave).update(manifest).digest("hex");
  const a = Buffer.from(v1, "hex");
  const b = Buffer.from(esperado, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  return true;
}

