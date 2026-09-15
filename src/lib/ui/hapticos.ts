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

/**
 * Impacto suave estilo iOS UIImpactFeedbackGenerator(style: .light)
 * Para botones secundarios, badges, cards clickeables y micro-taps.
 */
export function hapticoImpactoSuave() {
  vibrar(6);
  triggerIosSwitchHaptic();
  reproducirPulsoAcustico(0.4);
}

/**
 * Impacto medio estilo iOS UIImpactFeedbackGenerator(style: .medium)
 * Para botones primarios CTA, confirmaciones y modales.
 */
export function hapticoImpactoMedio() {
  vibrar(12);
  triggerIosSwitchHaptic();
  reproducirPulsoAcustico(0.8);
}

/**
 * Impacto fuerte estilo iOS UIImpactFeedbackGenerator(style: .heavy)
 * Para acciones irreversibles, eliminar o finalizaciones.
 */
export function hapticoImpactoFuerte() {
  vibrar(20);
  triggerIosSwitchHaptic();
  reproducirPulsoAcustico(1.2);
}

/**
 * Selección de pestaña o segmented control estilo UISelectionFeedbackGenerator
 */
export function hapticoSeleccion() {
  vibrar(8);
  triggerIosSwitchHaptic();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.exponentialRampToValueAtTime(500, now + 0.02);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.025);
}

/**
 * Celebración de serie completada en sala de pesas:
 * Golpe físico en chasis + chime deportivo estimulante.
 */
export function hapticoSerieCompletada() {
  vibrar([15, 30, 25]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  // 1. Thump subsónico físico (90Hz -> 50Hz)
  const oscBass = ctx.createOscillator();
  const gainBass = ctx.createGain();
  oscBass.type = "triangle";
  oscBass.frequency.setValueAtTime(95, now);
  oscBass.frequency.exponentialRampToValueAtTime(48, now + 0.05);
  gainBass.gain.setValueAtTime(0.35, now);
  gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  oscBass.connect(gainBass);
  gainBass.connect(ctx.destination);
  oscBass.start(now);
  oscBass.stop(now + 0.06);

  // 2. Chime brillante de éxito deportivo (C6 -> G6: 1046Hz -> 1567Hz)
  const playChime = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.07, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playChime(1046, now + 0.02, 0.09);
  playChime(1567, now + 0.09, 0.14);
}

/**
 * Alerta de finalización de timer de descanso entre series:
 * Doble campana cristalina clara sin saturar los oídos del atleta.
 */
export function hapticoTimerFin() {
  vibrar([40, 60, 40, 60, 80]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const ding = (freq: number, start: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  };

  ding(1200, now);
  ding(1600, now + 0.15);
}

/**
 * Récord personal alcanzado (PR):
 * Fanfarria sintética ascendente de 3 notas triunfales.
 */
export function hapticoRecordPersonal() {
  vibrar([15, 40, 20, 40, 40]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playNote = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.09, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playNote(784, now, 0.09);         // G5
  playNote(987, now + 0.08, 0.09);    // B5
  playNote(1318, now + 0.16, 0.22);   // E6
}

/**
 * Sonido óptico/acústico y háptico al expandir/colapsar el calentamiento general:
 * Sweep armónico ascendente (apertura) o descendente (cierre) con respuesta táctil.
 */
export function hapticoWarmupExpand(expandiendo = true) {
  vibrar(expandiendo ? 10 : 6);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";

  if (expandiendo) {
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  } else {
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + (expandiendo ? 0.095 : 0.075));
}

/**
 * Sonido óptico/acústico y háptico al tildar un ejercicio de movilidad:
 * Click elástico con doble tono ascendente (880Hz -> 1320Hz) y thump de chasis.
 */
export function hapticoWarmupTick() {
  vibrar([8, 20, 12]);
  triggerIosSwitchHaptic();
  reproducirPulsoAcustico(0.6);

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.07, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(880, now + 0.01, 0.04);
  playTone(1320, now + 0.05, 0.07);
}

/**
 * Transición de pantalla / navegación entre pestañas:
 * Sonido orgánico y fluido con ligero barrido de frecuencia y háptico suave.
 */
export function hapticoNavegacionPantalla() {
  vibrar(8);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);

  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Notificación amigable / burbuja de diálogo de Mascota Pulpo Volt:
 * Pop de marimba super cálido y moderno (C5 -> G5 -> C6).
 */
export function hapticoNotificacionAmigable() {
  vibrar([6, 20, 10]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playPop = (freq: number, start: number, dur: number, vol = 0.06) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playPop(523, now, 0.04, 0.06);       // C5
  playPop(784, now + 0.035, 0.05, 0.07); // G5
  playPop(1046, now + 0.07, 0.08, 0.08); // C6
}

/**
 * Celebración de Racha / Fuego (Streak):
 * Acorde ascendente estimulante de 4 notas con vibración continua.
 */
export function hapticoLogroStreak() {
  vibrar([12, 35, 18, 45, 25]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playNote = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playNote(659, now, 0.06);        // E5
  playNote(830, now + 0.05, 0.07);   // G#5
  playNote(987, now + 0.10, 0.08);   // B5
  playNote(1318, now + 0.16, 0.18);  // E6
}

/**
 * Deslizar tarjeta / Swipe de carrusel:
 * Click elástico y fluido con micro-caída de frecuencia.
 */
export function hapticoCardSwipe() {
  vibrar(7);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(750, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.03);

  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Apertura de Modal / Sheet desplegable:
 * Tono elástico de elevación moderna (380Hz -> 650Hz).
 */
export function hapticoModalAbrir() {
  vibrar(9);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(650, now + 0.065);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.075);
}

/**
 * Cierre de Modal / Sheet:
 * Tono elástico de descenso suave (580Hz -> 320Hz).
 */
export function hapticoModalCerrar() {
  vibrar(6);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * Pull to Refresh (Recargar pantalla):
 * Sensación de muelle elástico que se tensa y suelta.
 */
export function hapticoRefresh() {
  vibrar([10, 25, 10]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(750, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(550, now + 0.09);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Escaneo exitoso de QR / Check-in en gimnasio (Scanner OK):
 * Beep futurista de 2 tonos hiper-nítidos (1250Hz -> 1850Hz) con confirmación háptica.
 */
export function hapticoScanOK() {
  vibrar([12, 30, 20]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  const playBeep = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.09, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playBeep(1250, now, 0.045);
  playBeep(1850, now + 0.05, 0.08);
}

/**
 * Pago Aprobado / Renovación de Cuota de Alumno:
 * Chime de billetera digital (A5 -> E6 -> A6) con thump de graves de confirmación.
 */
export function hapticoPagoAprobado() {
  vibrar([15, 45, 20, 55, 30]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  // 1. Thump de confirmación bancaria / pago seguro (100Hz -> 50Hz)
  const oscBass = ctx.createOscillator();
  const gainBass = ctx.createGain();
  oscBass.type = "triangle";
  oscBass.frequency.setValueAtTime(100, now);
  oscBass.frequency.exponentialRampToValueAtTime(50, now + 0.06);
  gainBass.gain.setValueAtTime(0.3, now);
  gainBass.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
  oscBass.connect(gainBass);
  gainBass.connect(ctx.destination);
  oscBass.start(now);
  oscBass.stop(now + 0.07);

  // 2. Chime cristalino estilo Apple Pay / MercadoPago
  const playTone = (freq: number, start: number, dur: number, vol = 0.08) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(880, now + 0.02, 0.06, 0.08);    // A5
  playTone(1320, now + 0.07, 0.08, 0.09);   // E6
  playTone(1760, now + 0.14, 0.22, 0.10);   // A6
}

/**
 * Recepción de nuevo mensaje / chat:
 * Chime orgánico de 3 tonos amigables (F5 -> A5 -> C6).
 */
export function hapticoMensajeRecibido() {
  vibrar([10, 20, 15]);
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
    gain.gain.setValueAtTime(0.07, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(698, now, 0.045);        // F5
  playTone(880, now + 0.04, 0.055);  // A5
  playTone(1046, now + 0.08, 0.09);  // C6
}

/**
 * Alerta / Notificación de aviso importante:
 * Doble pulso de tono amortiguado (580Hz -> 440Hz).
 */
export function hapticoAlerta() {
  vibrar([20, 40, 20]);
  triggerIosSwitchHaptic();

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const playTone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  };

  playTone(580, now, 0.06);
  playTone(440, now + 0.07, 0.08);
}

/**
 * Hook utilitario para componentes de React
 */
export function useHapticos() {
  return {
    iniciar: iniciarAudioHaptico,
    dial: hapticoDial,
    suave: hapticoImpactoSuave,
    medio: hapticoImpactoMedio,
    fuerte: hapticoImpactoFuerte,
    seleccion: hapticoSeleccion,
    serie: hapticoSerieCompletada,
    timer: hapticoTimerFin,
    exito: hapticoExito,
    record: hapticoRecordPersonal,
    error: hapticoError,
    warmupExpand: hapticoWarmupExpand,
    warmupTick: hapticoWarmupTick,
    navegacion: hapticoNavegacionPantalla,
    notificacion: hapticoNotificacionAmigable,
    streak: hapticoLogroStreak,
    swipe: hapticoCardSwipe,
    modalAbrir: hapticoModalAbrir,
    modalCerrar: hapticoModalCerrar,
    refresh: hapticoRefresh,
    scanOK: hapticoScanOK,
    pagoAprobado: hapticoPagoAprobado,
    mensaje: hapticoMensajeRecibido,
    alerta: hapticoAlerta,
  };
}

