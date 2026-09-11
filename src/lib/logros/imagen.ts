/**
 * Compartir logros y entrenamientos — generación de imágenes para Instagram Stories (9:16 - 1080×1920).
 * 100% client-side con <canvas> sin librerías externas.
 * Estilo visual: HUD atlético Obsidian / Cyberpunk Volt con telemetría de alto impacto visual
 * diseñado para generar viralidad e intriga orgánica ("¿Qué app será?").
 */

export type ColoresImagen = {
  paper: string;
  ink: string;
  volt: string;
  voltInk: string;
};

export type OpcionesImagenLogro = {
  /** Texto principal: "Nuevo récord: X kg en …" o "X días seguidos entrenando". */
  titulo: string;
  subtitulo?: string;
  gimnasioNombre: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
  ancho?: number;
  alto?: number;
  /**
   * Marca de agua sutil de SysGym ("Hecho con SysGym • Gestioná tu progreso así").
   * Se incluye sólo cuando el socio comparte/exporta fuera de la app (default: true).
   * En el panel del dueño se desactiva (false).
   */
  incluirMarcaSysGym?: boolean;
};

export type OpcionesImagenDiaCompletado = {
  diaTitulo: string;
  totalSeries: number;
  volumenKilos: number;
  tiempoMin: number;
  gimnasioNombre?: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
  /**
   * Marca de agua sutil de SysGym ("Hecho con SysGym • Gestioná tu progreso así").
   * Se incluye sólo cuando el socio comparte/exporta fuera de la app (default: true).
   */
  incluirMarcaSysGym?: boolean;
};

function cargarImagen(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function envolverTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  maxAncho: number,
  lineHeight: number,
): number {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let linea = "";
  for (const p of palabras) {
    const test = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(test).width > maxAncho && linea) {
      lineas.push(linea);
      linea = p;
    } else {
      linea = test;
    }
  }
  if (linea) lineas.push(linea);

  const offset = ((lineas.length - 1) * lineHeight) / 2;
  lineas.forEach((l, i) => ctx.fillText(l, x, y - offset + i * lineHeight));
  return lineas.length;
}

/** Dibuja una grilla técnica de micropuntos futuristas */
function dibujarMatrizDePuntos(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  espaciado = 48
) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let x = espaciado; x < ancho; x += espaciado) {
    for (let y = espaciado; y < alto; y += espaciado) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Dibuja esquinas tipo cruceta técnica (+) para dar estética de laboratorio */
function dibujarCruceta(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tam = 8,
  color = "rgba(16, 231, 160, 0.5)"
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - tam, y);
  ctx.lineTo(x + tam, y);
  ctx.moveTo(x, y - tam);
  ctx.lineTo(x, y + tam);
  ctx.stroke();
}

/**
 * Genera la historia de Instagram para un Día Completado.
 * Diseño ultra-profesional estilo telemetry / Whoop / Cyberpunk Obsidian.
 */
export async function generarImagenDiaCompletado(
  opts: OpcionesImagenDiaCompletado,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("generarImagenDiaCompletado solo corre en el navegador.");
  }

  const W = 1080;
  const H = 1920;
  const volt = opts.colores?.volt || "#10e7a0";
  const cyan = "#00f2fe";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas.");

  // 1. Fondo Obsidian profundo
  const gradFondo = ctx.createLinearGradient(0, 0, 0, H);
  gradFondo.addColorStop(0, "#08090d");
  gradFondo.addColorStop(0.3, "#0d0f15");
  gradFondo.addColorStop(0.7, "#0a0b10");
  gradFondo.addColorStop(1, "#050608");
  ctx.fillStyle = gradFondo;
  ctx.fillRect(0, 0, W, H);

  // 2. Grilla de telemetría de micropuntos
  dibujarMatrizDePuntos(ctx, W, H, 54);

  // 3. Resplandores cinemáticos de neón (Dual Glow Aurora)
  // Glow superior en volt
  const glowTop = ctx.createRadialGradient(W / 2, 540, 40, W / 2, 540, 520);
  glowTop.addColorStop(0, `${volt}33`);
  glowTop.addColorStop(0.5, `${volt}0f`);
  glowTop.addColorStop(1, "transparent");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 100, W, 900);

  // Glow inferior sutil en cyan
  const glowBottom = ctx.createRadialGradient(W - 200, H - 350, 20, W - 200, H - 350, 450);
  glowBottom.addColorStop(0, `${cyan}20`);
  glowBottom.addColorStop(1, "transparent");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, H - 700, W, 700);

  // 4. Header Técnico Superior (HUD)
  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  // Status dot pulsante
  ctx.fillStyle = volt;
  ctx.beginPath();
  ctx.arc(90, 130, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `${volt}40`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(90, 130, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Texto header izquierdo
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("SYSGYM // ATHLETIC ENGINE", 120, 130);

  // Fecha técnica derecha
  ctx.textAlign = "right";
  ctx.fillStyle = "#71717a";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, monospace";
  ctx.fillText(`${fechaHoy} • VERIFIED`, W - 90, 130);

  // Línea sutil divisoria
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 175);
  ctx.lineTo(W - 90, 175);
  ctx.stroke();

  // 5. Dial / Anillo de Rendimiento (Activity Ring 100%)
  const centroX = W / 2;
  const centroY = 470;
  const radio = 175;
  const grosor = 26;

  // Pista de fondo del anillo
  ctx.beginPath();
  ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
  ctx.lineWidth = grosor;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineCap = "round";
  ctx.stroke();

  // Arco activo de progreso (gradiente Volt a Cyan)
  const gradArco = ctx.createLinearGradient(
    centroX - radio,
    centroY - radio,
    centroX + radio,
    centroY + radio
  );
  gradArco.addColorStop(0, volt);
  gradArco.addColorStop(1, cyan);

  ctx.beginPath();
  ctx.arc(centroX, centroY, radio, -Math.PI / 2, Math.PI * 1.5);
  ctx.lineWidth = grosor;
  ctx.strokeStyle = gradArco;
  ctx.shadowColor = volt;
  ctx.shadowBlur = 30;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow

  // Contenido dentro del anillo
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Emoji o símbolo de energía
  ctx.fillStyle = volt;
  ctx.font = "40px system-ui";
  ctx.fillText("⚡", centroX, centroY - 55);

  // Porcentaje grande
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 84px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("100%", centroX, centroY + 12);

  // Subtítulo del anillo
  ctx.fillStyle = volt;
  ctx.font = "800 19px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("OBJETIVO CUMPLIDO", centroX, centroY + 70);

  // 6. Título y Badge del Entrenamiento
  const badgeY = 715;
  const badgeW = 340;
  const badgeH = 50;
  ctx.fillStyle = `${volt}15`;
  ctx.beginPath();
  ctx.roundRect((W - badgeW) / 2, badgeY, badgeW, badgeH, 25);
  ctx.fill();

  ctx.strokeStyle = `${volt}50`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = volt;
  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("SESIÓN DE ENTRENAMIENTO", centroX, badgeY + badgeH / 2 + 1);

  // Nombre del Día / Rutina
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 64px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  envolverTexto(ctx, opts.diaTitulo.toUpperCase(), centroX, 830, W - 180, 72);

  // 7. Bloques de Telemetría (Glassmorphism + Bordes Neon)
  const cardW = W - 180;
  const startCardsY = 940;

  // Card 1 (Destacada): Volumen Total
  const card1H = 190;
  const y1 = startCardsY;

  // Fondo cristal
  ctx.fillStyle = "rgba(18, 21, 30, 0.85)";
  ctx.beginPath();
  ctx.roundRect((W - cardW) / 2, y1, cardW, card1H, 24);
  ctx.fill();

  // Borde fino
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Acento vertical izquierdo
  ctx.fillStyle = volt;
  ctx.beginPath();
  ctx.roundRect((W - cardW) / 2, y1 + 24, 6, card1H - 48, 3);
  ctx.fill();

  // Crucetas decorativas en las esquinas
  dibujarCruceta(ctx, (W - cardW) / 2 + 20, y1 + 20, 6, `${volt}80`);
  dibujarCruceta(ctx, (W + cardW) / 2 - 20, y1 + card1H - 20, 6, `${volt}80`);

  // Contenido Card 1
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Label superior
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("TONELAJE TOTAL LEVANTADO", (W - cardW) / 2 + 42, y1 + 52);

  // Cifra masiva
  const strVolumen = opts.volumenKilos.toLocaleString("es-AR");
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 80px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(strVolumen, (W - cardW) / 2 + 40, y1 + 138);

  const anchoNumero = ctx.measureText(strVolumen).width;
  ctx.fillStyle = volt;
  ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("KG", (W - cardW) / 2 + 46 + anchoNumero, y1 + 138);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("Volumen acumulado bajo tensión mecánica", (W - cardW) / 2 + 42, y1 + 168);

  // Cards 2 y 3 (Lado a Lado): Series y Tiempo
  const fila2Y = y1 + card1H + 24;
  const mitadW = (cardW - 20) / 2;
  const card2H = 175;

  // --- Sub-Card 2 (Series) ---
  const xCard2 = (W - cardW) / 2;
  ctx.fillStyle = "rgba(18, 21, 30, 0.85)";
  ctx.beginPath();
  ctx.roundRect(xCard2, fila2Y, mitadW, card2H, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = cyan;
  ctx.beginPath();
  ctx.roundRect(xCard2, fila2Y + 24, 5, card2H - 48, 3);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("SERIES TOTALES", xCard2 + 30, fila2Y + 48);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(`${opts.totalSeries}`, xCard2 + 30, fila2Y + 120);

  const anchoSeries = ctx.measureText(`${opts.totalSeries}`).width;
  ctx.fillStyle = cyan;
  ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("SETS", xCard2 + 36 + anchoSeries, fila2Y + 120);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("100% completadas", xCard2 + 30, fila2Y + 152);

  // --- Sub-Card 3 (Tiempo) ---
  const xCard3 = xCard2 + mitadW + 20;
  ctx.fillStyle = "rgba(18, 21, 30, 0.85)";
  ctx.beginPath();
  ctx.roundRect(xCard3, fila2Y, mitadW, card2H, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = volt;
  ctx.beginPath();
  ctx.roundRect(xCard3, fila2Y + 24, 5, card2H - 48, 3);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("DURACIÓN", xCard3 + 30, fila2Y + 48);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(`${opts.tiempoMin}`, xCard3 + 30, fila2Y + 120);

  const anchoTiempo = ctx.measureText(`${opts.tiempoMin}`).width;
  ctx.fillStyle = volt;
  ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("MIN", xCard3 + 36 + anchoTiempo, fila2Y + 120);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("Tiempo de sesión", xCard3 + 30, fila2Y + 152);

  // 8. Card de Viralidad e Intriga al Pie (El gancho que despierta curiosidad)
  const footerY = fila2Y + card2H + 40;
  const footerH = 290;

  // Contenedor principal del pie con resplandor
  ctx.fillStyle = "rgba(12, 14, 20, 0.95)";
  ctx.beginPath();
  ctx.roundRect((W - cardW) / 2, footerY, cardW, footerH, 28);
  ctx.fill();

  ctx.strokeStyle = `${volt}40`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Gráfico de onda de frecuencias / telemetría en el footer
  const waveX = (W - cardW) / 2 + 40;
  const waveY = footerY + 60;
  const waveW = cardW - 80;
  const alturas = [14, 28, 42, 18, 55, 34, 48, 22, 60, 38, 44, 26, 52, 30, 46, 20, 58, 36, 40, 24, 50, 32];
  const barW = 6;
  const barGap = (waveW - alturas.length * barW) / (alturas.length - 1);

  alturas.forEach((alt, idx) => {
    const bx = waveX + idx * (barW + barGap);
    const gradBar = ctx.createLinearGradient(0, waveY, 0, waveY + alt);
    gradBar.addColorStop(0, volt);
    gradBar.addColorStop(1, `${volt}20`);
    ctx.fillStyle = gradBar;
    ctx.beginPath();
    ctx.roundRect(bx, waveY + (60 - alt) / 2, barW, alt, 3);
    ctx.fill();
  });

  // Marca de la app y llamada a la curiosidad
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("SYSGYM", centroX, footerY + 148);

  ctx.fillStyle = volt;
  ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("• HECHO CON SYSGYM •", centroX, footerY + 180);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("Gestioná tu progreso así", centroX, footerY + 212);

  // Pastilla de llamado a la acción con URL
  const pillW = 420;
  const pillH = 48;
  const pillY = footerY + 236;
  ctx.fillStyle = `${volt}20`;
  ctx.beginPath();
  ctx.roundRect((W - pillW) / 2, pillY, pillW, pillH, 24);
  ctx.fill();

  ctx.strokeStyle = volt;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = volt;
  ctx.font = "800 19px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, monospace";
  ctx.fillText("SYSGYM.APP", centroX, pillY + pillH / 2 + 1);

  // Footer branding legal sutil
  if (opts.gimnasioNombre && opts.gimnasioNombre !== "SysGym") {
    ctx.fillStyle = "#52525b";
    ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    ctx.fillText(`Sede de entrenamiento: ${opts.gimnasioNombre}`, centroX, H - 45);
  } else {
    ctx.fillStyle = "#52525b";
    ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, monospace";
    ctx.fillText("SYSGYM • SCIENCE-BASED WORKOUT ARCHITECTURE", centroX, H - 45);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Genera la historia de Instagram para un Récord Personal (PR) o Racha.
 * Diseñada para impresionar con números colosales y aura de victoria.
 */
export async function generarImagenLogro(
  opts: OpcionesImagenLogro,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("generarImagenLogro solo corre en el navegador.");
  }

  const W = opts.ancho ?? 1080;
  const H = opts.alto ?? 1920;
  const volt = opts.colores?.volt || "#10e7a0";
  const cyan = "#00f2fe";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas.");

  // Fondo Obsidian
  const gradFondo = ctx.createLinearGradient(0, 0, 0, H);
  gradFondo.addColorStop(0, "#08090d");
  gradFondo.addColorStop(0.4, "#0d0f17");
  gradFondo.addColorStop(1, "#050608");
  ctx.fillStyle = gradFondo;
  ctx.fillRect(0, 0, W, H);

  // Micro-matriz de puntos
  dibujarMatrizDePuntos(ctx, W, H, 54);

  // Aura central masiva en neón
  const glow = ctx.createRadialGradient(W / 2, H / 2 - 100, 50, W / 2, H / 2 - 100, 600);
  glow.addColorStop(0, `${volt}35`);
  glow.addColorStop(0.6, `${volt}0d`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 200, W, 1200);

  // Header HUD con marca del gimnasio
  const gymNombre =
    opts.gimnasioNombre && opts.gimnasioNombre.trim().length > 0
      ? opts.gimnasioNombre.trim()
      : "SYSGYM";

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = volt;
  ctx.beginPath();
  ctx.arc(90, 130, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText(`${gymNombre.toUpperCase()} // ATHLETIC PR`, 115, 130);

  ctx.textAlign = "right";
  ctx.fillStyle = "#71717a";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, monospace";
  ctx.fillText("RECORD LOGGED", W - 90, 130);

  // Línea divisoria
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 175);
  ctx.lineTo(W - 90, 175);
  ctx.stroke();

  // Badge PR
  const badgeY = 360;
  const badgeW = 340;
  const badgeH = 54;
  ctx.fillStyle = `${volt}20`;
  ctx.beginPath();
  ctx.roundRect((W - badgeW) / 2, badgeY, badgeW, badgeH, 27);
  ctx.fill();

  ctx.strokeStyle = volt;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = volt;
  ctx.font = "900 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  ctx.fillText("🏆 NUEVO RÉCORD PERSONAL", W / 2, badgeY + badgeH / 2 + 1);

  // Título del logro (envoltura limpia)
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 84px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  envolverTexto(ctx, opts.titulo, W / 2, H / 2 - 80, W - 160, 96);

  // Subtítulo si existe
  if (opts.subtitulo) {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 36px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    envolverTexto(ctx, opts.subtitulo, W / 2, H / 2 + 130, W - 200, 48);
  }

  // Mención de sede si es gimnasio externo
  if (gymNombre !== "SYSGYM") {
    ctx.fillStyle = "#71717a";
    ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    ctx.fillText(`ENTRENANDO EN ${gymNombre.toUpperCase()}`, W / 2, H / 2 + 210);
  }

  // Footer sutil de SysGym: sólo cuando el socio comparte/exporta fuera de la app
  const incluirSysGym = opts.incluirMarcaSysGym !== false;
  if (incluirSysGym) {
    const footerY = H - 290;
    const cardW = W - 180;
    const footerH = 145;
    const cardX = (W - cardW) / 2;

    // Fondo oscuro translúcido estilo Liquid Glass
    const gradCard = ctx.createLinearGradient(0, footerY, 0, footerY + footerH);
    gradCard.addColorStop(0, "rgba(16, 19, 28, 0.92)");
    gradCard.addColorStop(1, "rgba(8, 10, 15, 0.96)");
    ctx.fillStyle = gradCard;
    ctx.beginPath();
    ctx.roundRect(cardX, footerY, cardW, footerH, 24);
    ctx.fill();

    // Borde sutil Volt
    ctx.strokeStyle = "rgba(16, 231, 160, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crucetas técnicas decorativas
    dibujarCruceta(ctx, cardX + 16, footerY + 16, 5, "rgba(16, 231, 160, 0.4)");
    dibujarCruceta(ctx, cardX + cardW - 16, footerY + footerH - 16, 5, "rgba(16, 231, 160, 0.4)");

    // Squircle logo SysGym
    const logoSize = 64;
    const logoX = cardX + 36;
    const logoY = footerY + (footerH - logoSize) / 2;

    const gradLogo = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
    gradLogo.addColorStop(0, volt);
    gradLogo.addColorStop(1, "#00c282");
    ctx.fillStyle = gradLogo;
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, logoSize, logoSize, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rayo Volt atlético en el logo
    ctx.fillStyle = "#050608";
    ctx.beginPath();
    const lx = logoX + logoSize / 2;
    const ly = logoY + logoSize / 2;
    ctx.moveTo(lx + 2, ly - 17);
    ctx.lineTo(lx - 12, ly + 2);
    ctx.lineTo(lx - 1, ly + 2);
    ctx.lineTo(lx - 4, ly + 17);
    ctx.lineTo(lx + 12, ly - 2);
    ctx.lineTo(lx + 1, ly - 2);
    ctx.closePath();
    ctx.fill();

    // Textos de marca de agua
    const textStartX = logoX + logoSize + 24;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // Fila 1: SYSGYM • HECHO CON SYSGYM
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 26px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    ctx.fillText("SYSGYM", textStartX, footerY + 58);

    const wSysGym = ctx.measureText("SYSGYM").width;
    ctx.fillStyle = volt;
    ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    ctx.fillText("• HECHO CON SYSGYM", textStartX + wSysGym + 10, footerY + 57);

    // Fila 2: Texto gancho hacia afuera
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
    ctx.fillText("Gestioná tu progreso así", textStartX, footerY + 100);

    // Pastilla CTA con link sysgym.app
    const pillText = "sysgym.app";
    ctx.font = "800 19px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, monospace";
    const pillTextW = ctx.measureText(pillText).width;
    const pillW = pillTextW + 36;
    const pillH = 44;
    const pillX = cardX + cardW - pillW - 28;
    const pillY = footerY + (footerH - pillH) / 2;

    ctx.fillStyle = `${volt}20`;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 22);
    ctx.fill();

    ctx.strokeStyle = `${volt}70`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = volt;
    ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);
  }

  // Footer branding sutil al pie
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#52525b";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";
  if (gymNombre !== "SYSGYM") {
    ctx.fillText(`Sede de entrenamiento: ${gymNombre}`, W / 2, H - 45);
  } else {
    ctx.fillText("SYSGYM • SCIENCE-BASED WORKOUT ARCHITECTURE", W / 2, H - 45);
  }

  return canvas.toDataURL("image/png");
}
