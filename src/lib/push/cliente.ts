"use client";

// Helpers de suscripción a Web Push, lado navegador.

export type EstadoPush =
  | "no-soportado"
  | "denegado"
  | "sin-suscribir"
  | "suscrito";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSoportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registrarSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function estadoActual(): Promise<EstadoPush> {
  if (!pushSoportado()) return "no-soportado";
  if (Notification.permission === "denied") return "denegado";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub ? "suscrito" : "sin-suscribir";
  } catch {
    return "sin-suscribir";
  }
}

type SubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// Suscribe y devuelve el payload para persistir en el server.
// Lanza si el usuario deniega el permiso o algo falla.
export async function suscribir(): Promise<SubJSON> {
  if (!pushSoportado()) throw new Error("Este navegador no soporta notificaciones.");
  if (!VAPID_PUBLIC) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY.");

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("Permiso de notificaciones denegado.");

  const reg = await registrarSW();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  return JSON.parse(JSON.stringify(sub)) as SubJSON;
}

// Devuelve el endpoint borrado (o null si no había).
export async function desuscribir(): Promise<string | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
