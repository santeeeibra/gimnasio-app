// ─────────────────────────────────────────────────────────────────────────────
// SysGym Haptics & Vibration Utility
// Soporte unificado para:
// 1. Android / Chrome: Vibration API (navigator.vibrate)
// 2. iOS 17.4+ Safari: Taptic Engine mediante switch checkbox nativo
// 3. iPhone / iPad / Desktop: Acoustic Haptics mediante Web Audio API
//    (Pulso de baja frecuencia 80-120 Hz que resuena en el chasis + click seco 900 Hz)
// ─────────────────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let iosSwitchEl: HTMLInputElement | null = null;
let lastTickTime = 0;

/**
 * Obtiene o inicializa el AudioContext de forma perezosa
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtxClass) {
      try {
        audioCtx = new AudioCtxClass();
      } catch {
        return null;
      }
    }
  }
  return audioCtx;
}

/**
 * Crea o recupera el switch invisible para activar el Taptic Engine en iOS 17.4+
 */
function ensureIosSwitch(): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  if (!iosSwitchEl) {
    try {
      const container = document.createElement("div");
      container.setAttribute("aria-hidden", "true");
      container.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;width:1px;height:1px;overflow:hidden;";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      input.tabIndex = -1;

      container.appendChild(input);
      document.body.appendChild(container);
      iosSwitchEl = input;
    } catch {
      return null;
    }
  }
  return iosSwitchEl;
}

/**
 * Desbloquea síncronamente el AudioContext en la política de autoplay de iOS Safari.
 * DEBE ser invocado en el evento pointerdown / touchstart inicial del usuario.
 */
export function iniciarAudioHaptico(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  // Reproducir un buffer mudo instantáneo para despertar el hardware de audio en iOS
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    /* ok */
  }

  // Asegurar la inicialización del switch de iOS
  ensureIosSwitch();

  return ctx;
}

/**
 * Dispara el Taptic Engine de iOS 17.4+ toggleando el switch invisible
 */
export function triggerIosSwitchHaptic() {
  try {
    const sw = ensureIosSwitch();
    if (sw) {
      sw.click();
    }
  } catch {
    /* ok */
  }
}

/**
 * Vibración física para dispositivos compatibles (Android, etc.)
 */
export function vibrar(ms: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ok */
    }
  }
}

/**
 * Reproduce el pulso acústico táctil:
 * - Frecuencia transitoria baja resonante (80 Hz a 120 Hz) que crea vibración física
 *   en los altavoces estéreo del iPhone.
 * - Click de alta frecuencia (900 Hz a 650 Hz) para sensación de nitidez táctil instantánea.
 */
export function reproducirPulsoAcustico(volumen = 1) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  // 1. Golpe de baja frecuencia resonante (chassis thump - 115Hz -> 65Hz)
  const oscBass = ctx.createOscillator();
  const gainBass = ctx.createGain();
  oscBass.type = "triangle";
  oscBass.frequency.setValueAtTime(115, now);
  oscBass.frequency.exponentialRampToValueAtTime(65, now + 0.03);

  gainBass.gain.setValueAtTime(0.28 * volumen, now);
  gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  oscBass.connect(gainBass);
  gainBass.connect(ctx.destination);

  // 2. Click seco de aguja / calibrador (click crisp - 950Hz -> 600Hz)
  const oscClick = ctx.createOscillator();
  const gainClick = ctx.createGain();
  oscClick.type = "sine";
  oscClick.frequency.setValueAtTime(950, now);
  oscClick.frequency.exponentialRampToValueAtTime(600, now + 0.018);

  gainClick.gain.setValueAtTime(0.06 * volumen, now);
  gainClick.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

  oscClick.connect(gainClick);
  gainClick.connect(ctx.destination);

  // Arrancar y parar con auto-limpieza
  oscBass.start(now);
  oscBass.stop(now + 0.038);
  oscClick.start(now);
  oscClick.stop(now + 0.028);

  oscBass.onended = () => {
    try {
      oscBass.disconnect();
      gainBass.disconnect();
      oscClick.disconnect();
      gainClick.disconnect();
    } catch {
      /* ok */
    }
  };
}

/**
 * Disparo combinado de háptico para ticks de dial / calibrador:
 * - Throttle de 18ms para evitar saturación en arrastres rápidos.
 * - Vibración física con navigator.vibrate (10ms).
 * - Taptic Engine de iOS 17.4+ con switch click.
 * - Acoustic Haptics con resonancia en altavoces estéreo y click seco.
 */
export function hapticoDial(minIntervalMs = 18) {
  const now = Date.now();
  if (now - lastTickTime < minIntervalMs) return;
  lastTickTime = now;

  // 1. Android / navegadores con Vibration API
  vibrar(10);

  // 2. iOS 17.4+ Taptic Engine
  triggerIosSwitchHaptic();

  // 3. Acoustic Haptics (vibración física por altavoces en iPhone + sonido de tick)
  reproducirPulsoAcustico(1);
}

/**
 * Feedback háptico y sonoro para confirmación exitosa (p. ej. guardar peso)
 */
export function hapticoExito() {
  vibrar([10, 40, 15]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(680, now, 0.06);
  playTone(1020, now + 0.07, 0.09);
}

/**
 * Feedback háptico y sonoro para error
 */
export function hapticoError() {
  vibrar(25);
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(280, now);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}
