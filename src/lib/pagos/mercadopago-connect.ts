import "server-only";

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
const AUTH = "https://auth.mercadopago.com.ar/authorization";

export function connectConfigurado(): boolean {
  return Boolean(
    process.env.MP_CONNECT_CLIENT_ID && process.env.MP_CONNECT_CLIENT_SECRET,
  );
}

function clientId(): string {
  const v = process.env.MP_CONNECT_CLIENT_ID;
  if (!v) throw new Error("Falta MP_CONNECT_CLIENT_ID.");
  return v;
}

function clientSecret(): string {
  const v = process.env.MP_CONNECT_CLIENT_SECRET;
  if (!v) throw new Error("Falta MP_CONNECT_CLIENT_SECRET.");
  return v;
}

export function redirectUri(origin: string): string {
  return (
    process.env.MP_CONNECT_REDIRECT_URI ??
    new URL("/api/mp-connect/callback", origin).toString()
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
  };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? null,
    collectorId: d.user_id != null ? String(d.user_id) : null,
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
};

/** Lee las credenciales de MP de un gimnasio. Requiere client service_role. */
export async function cuentaMP(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<CuentaMP | null> {
  const { data } = await db
    .from("gimnasios")
    .select("mp_access_token, mp_refresh_token, mp_collector_id")
    .eq("id", gimnasioId)
    .maybeSingle();
  if (!data?.mp_access_token) return null;
  return {
    accessToken: data.mp_access_token as string,
    refreshToken: (data.mp_refresh_token as string | null) ?? null,
    collectorId: (data.mp_collector_id as string | null) ?? null,
  };
}

export async function guardarTokens(
  db: SupabaseClient,
  gimnasioId: string,
  t: TokensMP,
): Promise<void> {
  await db
    .from("gimnasios")
    .update({
      mp_access_token: t.accessToken,
      mp_refresh_token: t.refreshToken,
      mp_collector_id: t.collectorId,
      mp_vinculado_at: new Date().toISOString(),
    })
    .eq("id", gimnasioId);
}

export async function desvincular(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<void> {
  await db
    .from("gimnasios")
    .update({
      mp_access_token: null,
      mp_refresh_token: null,
      mp_collector_id: null,
      mp_vinculado_at: null,
    })
    .eq("id", gimnasioId);
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
