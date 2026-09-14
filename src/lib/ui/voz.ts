// ─────────────────────────────────────────────────────────────────────────────
// Voz guiada — Edge TTS (voz neural, vía /api/voz) con caché predictiva en el
// navegador (Cache API). Apagada por default: el cliente la activa desde
// /mi/ajustes. Persiste en localStorage porque es preferencia de dispositivo.
//
// No se sube nada a Supabase: el audio se genera on-demand la primera vez que
// se pide una frase y queda cacheado en el dispositivo (indefinido, el mismo
// texto siempre da el mismo audio). `precargar()` deja el audio listo en caché
// *antes* de que haga falta reproducirlo (ej: al elegir un preset de descanso,
// o al mostrar el ejercicio siguiente en Modo Foco), para que `hablar()` no
// tenga que esperar la red en el momento justo.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "gym.voz-guiada.v1";
const CACHE_NAME = "gym-voz-tts-v1";

export function vozHabilitada(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

let audioActual: HTMLAudioElement | null = null;

export function setVozHabilitada(activa: boolean) {
  try {
    localStorage.setItem(LS_KEY, activa ? "1" : "0");
  } catch {
    /* storage bloqueado: la preferencia no persiste pero no rompe nada */
  }
  if (!activa) {
    audioActual?.pause();
  }
}

function urlParaTexto(texto: string): string {
  return `/api/voz?texto=${encodeURIComponent(texto)}`;
}

async function abrirCache(): Promise<Cache | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Deja una frase lista en caché sin reproducirla. Fire-and-forget: nunca
 * bloquea ni rompe nada si falla (sin red, endpoint caído, etc).
 */
export async function precargar(texto: string) {
  if (typeof window === "undefined") return;
  if (!vozHabilitada()) return;
  try {
    const cache = await abrirCache();
    const url = urlParaTexto(texto);
    if (cache && (await cache.match(url))) return; // ya está
    const res = await fetch(url);
    if (res.ok && cache) await cache.put(url, res.clone());
  } catch {
    /* sin red: hablar() reintenta con fetch directo cuando haga falta */
  }
}

/**
 * Habla un texto corto si la voz guiada está activa. Usa el audio cacheado si
 * ya fue precargado (instantáneo); si no, lo pide y lo cachea para la próxima.
 * Corta cualquier locución previa para que los avisos no se superpongan.
 */
/**
 * Resuelve cuando termina de sonar (o al fallar/cortarse), para poder
 * encadenar locuciones (ej: nombre del ejercicio -> técnica) sin que se
 * superpongan ni se corten a mitad.
 */
export async function hablar(texto: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!vozHabilitada()) return;

  try {
    audioActual?.pause();

    const url = urlParaTexto(texto);
    const cache = await abrirCache();
    let respuesta = cache ? await cache.match(url) : undefined;

    if (!respuesta) {
      respuesta = await fetch(url);
      if (respuesta.ok && cache) {
        cache.put(url, respuesta.clone()).catch(() => {});
      }
    }
    if (!respuesta.ok) return;

    const blob = await respuesta.blob();
    const blobUrl = URL.createObjectURL(blob);
    const audio = new Audio(blobUrl);
    audioActual = audio;

    await new Promise<void>((resolve) => {
      const terminar = () => {
        URL.revokeObjectURL(blobUrl);
        resolve();
      };
      audio.addEventListener("ended", terminar, { once: true });
      audio.addEventListener("pause", terminar, { once: true }); // cortada por otra hablar()
      audio.addEventListener("error", terminar, { once: true });
      audio.play().catch(terminar);
    });
  } catch {
    /* sin red, autoplay bloqueado, o TTS caído: fallback silencioso */
  }
}
