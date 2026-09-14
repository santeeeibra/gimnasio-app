// ─────────────────────────────────────────────────────────────────────────────
// Voz guiada (Web Speech API — SpeechSynthesis nativo, sin archivos ni costo).
// Apagada por default: el cliente la activa desde /mi/ajustes. Persiste en
// localStorage porque es una preferencia de dispositivo, no de cuenta.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = "gym.voz-guiada.v1";

export function vozHabilitada(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setVozHabilitada(activa: boolean) {
  try {
    localStorage.setItem(LS_KEY, activa ? "1" : "0");
  } catch {
    /* storage bloqueado: la preferencia no persiste pero no rompe nada */
  }
  if (!activa) {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ok */
    }
  }
}

/**
 * Habla un texto corto si la voz guiada está activa. Cancela cualquier
 * locución previa para que los avisos no se acumulen/superpongan (p. ej. si
 * el cliente reinicia el timer justo cuando termina un aviso anterior).
 */
export function hablar(texto: string) {
  if (typeof window === "undefined") return;
  if (!vozHabilitada()) return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  try {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = "es-AR";
    utter.rate = 1.05;
    utter.volume = 1;
    synth.speak(utter);
  } catch {
    /* sin soporte de TTS en el navegador: fallback silencioso */
  }
}
