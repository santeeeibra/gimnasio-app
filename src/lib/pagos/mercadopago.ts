import "server-only";

import { createHmac } from "node:crypto";
import type { EventoPago, PasarelaPago } from "./tipos";

// Adapter Mercado Pago — Checkout Pro (link de pago por período).
//   crearLink(): crea una "preference" y devuelve init_point (URL hosteada).
//   leerWebhook(): recibe la notificación (type=payment), trae el pago por su
//     id desde la API y lo mapea a EventoPago. La autenticidad la garantiza
//     ese fetch autenticado; la firma x-signature es control extra.
// Env: MP_ACCESS_TOKEN (obligatorio), MP_WEBHOOK_SECRET (opcional, firma).

const API = "https://api.mercadopago.com";

function accessToken(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MP_ACCESS_TOKEN.");
  return t;
}

export function pasarelaMercadoPago(): PasarelaPago {
  return {
    nombre: "mercadopago",
    automatica: true,

    async crearLink(s) {
      const monto = Number(s.montoARS);
      if (!(monto > 0)) {
        throw new Error("El monto del pago debe ser mayor a 0.");
      }
      const webhookUrl = new URL("/api/pagos/webhook", s.urlRetorno).toString();

      const res = await fetch(`${API}/checkout/preferences`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              title: s.concepto.slice(0, 250),
              quantity: 1,
              unit_price: Number(monto.toFixed(2)),
              currency_id: "ARS",
            },
          ],
          external_reference: s.referencia,
          ...(s.emailPagador ? { payer: { email: s.emailPagador } } : {}),
          back_urls: {
            success: s.urlRetorno,
            pending: s.urlRetorno,
            failure: s.urlRetorno,
          },
          auto_return: "approved",
          notification_url: webhookUrl,
        }),
      });
      if (!res.ok) {
        throw new Error(`MP preferences ${res.status}: ${await res.text()}`);
      }
      const data = (await res.json()) as { id: string; init_point: string };
      return { url: data.init_point, proveedorRef: data.id ?? null };
    },

    async leerWebhook(req) {
      const url = new URL(req.url);
      let tipo = url.searchParams.get("type") ?? url.searchParams.get("topic");
      let dataId =
        url.searchParams.get("data.id") ?? url.searchParams.get("id");

      if (!tipo || !dataId) {
        const body = (await req.json().catch(() => null)) as
          | { type?: string; topic?: string; data?: { id?: string } }
          | null;
        tipo = tipo ?? body?.type ?? body?.topic ?? null;
        dataId = dataId ?? body?.data?.id ?? null;
      }
      if (tipo !== "payment" || !dataId) return null;

      if (!firmaValida(req, dataId)) {
        console.warn("[mp/webhook] x-signature inválida o ausente; sigo por API");
      }

      const res = await fetch(`${API}/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${accessToken()}` },
      });
      if (!res.ok) {
        throw new Error(`MP payment ${dataId} ${res.status}`);
      }
      const p = (await res.json()) as {
        status: string;
        external_reference: string | null;
        transaction_amount: number | null;
      };
      if (!p.external_reference) return null;

      const estado: EventoPago["estado"] =
        p.status === "approved"
          ? "aprobado"
          : p.status === "rejected" || p.status === "cancelled"
            ? "rechazado"
            : "pendiente";

      return {
        referencia: p.external_reference,
        estado,
        proveedorRef: String(dataId),
        montoARS: p.transaction_amount,
      };
    },
  };
}

// Firma de Mercado Pago: header x-signature = "ts=...,v1=<hmac>".
// manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
function firmaValida(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false; // no configurada => no se puede validar
  const sig = req.headers.get("x-signature");
  const reqId = req.headers.get("x-request-id");
  if (!sig || !reqId) return false;

  const parts: Record<string, string> = {};
  for (const kv of sig.split(",")) {
    const [k, v] = kv.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${parts.ts};`;
  const hmac = createHmac("sha256", secret).update(manifest).digest("hex");
  return hmac === parts.v1;
}
