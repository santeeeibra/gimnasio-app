/**
 * Compartir logros — generación de la imagen para Instagram Stories.
 * 100% client-side con <canvas>, sin librerías (mismo enfoque que
 * src/lib/logo/comprimir.ts). Salida: PNG dataURL 1080×1920.
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
  /** URL pública del logo (gimnasios.logo_url); si falla o falta, va el nombre. */
  logoUrl?: string | null;
  colores: ColoresImagen;
  ancho?: number;
  alto?: number;
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
): void {
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
}

export async function generarImagenLogro(
  opts: OpcionesImagenLogro,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("generarImagenLogro solo corre en el navegador.");
  }

  const W = opts.ancho ?? 1080;
  const H = opts.alto ?? 1920;
  const { paper, ink, volt, voltInk } = opts.colores;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas.");

  // Fondo (tema del gimnasio)
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // Banda de acento al pie
  ctx.fillStyle = volt;
  ctx.fillRect(0, H - 220, W, 220);

  // Logo del gimnasio (o nombre como fallback)
  const logo = opts.logoUrl ? await cargarImagen(opts.logoUrl) : null;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (logo && logo.width > 0 && logo.height > 0) {
    const max = 280;
    const escala = Math.min(max / logo.width, max / logo.height, 1);
    const w = logo.width * escala;
    const h = logo.height * escala;
    ctx.drawImage(logo, (W - w) / 2, 180, w, h);
  } else {
    ctx.fillStyle = ink;
    ctx.font = "600 56px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(opts.gimnasioNombre, W / 2, 280);
  }

  // Título del logro
  ctx.fillStyle = volt;
  ctx.font = "800 92px ui-sans-serif, system-ui, sans-serif";
  envolverTexto(ctx, opts.titulo, W / 2, H / 2 - 20, W - 160, 108);

  // Subtítulo
  if (opts.subtitulo) {
    ctx.fillStyle = ink;
    ctx.font = "500 44px ui-sans-serif, system-ui, sans-serif";
    envolverTexto(ctx, opts.subtitulo, W / 2, H / 2 + 160, W - 200, 56);
  }

  // Nombre del gimnasio sobre la banda de acento
  ctx.fillStyle = voltInk;
  ctx.font = "700 40px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(opts.gimnasioNombre.toUpperCase(), W / 2, H - 116);

  return canvas.toDataURL("image/png");
}

export type OpcionesImagenDiaCompletado = {
  diaTitulo: string;
  totalSeries: number;
  volumenKilos: number;
  tiempoMin: number;
  gimnasioNombre: string;
  logoUrl?: string | null;
  colores?: ColoresImagen;
};

export async function generarImagenDiaCompletado(
  opts: OpcionesImagenDiaCompletado,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("generarImagenDiaCompletado solo corre en el navegador.");
  }

  const W = 1080;
  const H = 1920;
  const volt = opts.colores?.volt || "#10e7a0";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el canvas.");

  // Fondo gradiente nocturno premium
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#09090b");
  grad.addColorStop(0.5, "#121216");
  grad.addColorStop(1, "#09090b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Círculo resplandor de fondo
  const glow = ctx.createRadialGradient(W / 2, 700, 50, W / 2, 700, 600);
  glow.addColorStop(0, `${volt}25`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 100, W, 1200);

  // Logo o nombre del gimnasio en el header
  const logo = opts.logoUrl ? await cargarImagen(opts.logoUrl) : null;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (logo && logo.width > 0 && logo.height > 0) {
    const max = 220;
    const escala = Math.min(max / logo.width, max / logo.height, 1);
    const w = logo.width * escala;
    const h = logo.height * escala;
    ctx.drawImage(logo, (W - w) / 2, 220 - h / 2, w, h);
  } else {
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "700 36px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(opts.gimnasioNombre.toUpperCase(), W / 2, 220);
  }

  // Badge: "SESIÓN COMPLETADA"
  ctx.fillStyle = `${volt}20`;
  const badgeW = 440;
  const badgeH = 64;
  const badgeX = (W - badgeW) / 2;
  const badgeY = 380;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 32);
  ctx.fill();

  ctx.strokeStyle = `${volt}60`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = volt;
  ctx.font = "800 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("¡SESIÓN COMPLETADA! 💥", W / 2, badgeY + badgeH / 2);

  // Título del Día / Rutina
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 76px ui-sans-serif, system-ui, sans-serif";
  envolverTexto(ctx, opts.diaTitulo, W / 2, 580, W - 180, 88);

  // Tarjetas de Métricas (Series, Volumen, Tiempo)
  const metricas = [
    { valor: `${opts.totalSeries}`, label: "SERIES COMPLETADAS", icon: "⚡" },
    { valor: `~${opts.volumenKilos.toLocaleString("es-AR")} kg`, label: "VOLUMEN TOTAL", icon: "🏋️" },
    { valor: `~${opts.tiempoMin} min`, label: "DURACIÓN ESTIMADA", icon: "⏱️" },
  ];

  const cardW = W - 180;
  const cardH = 140;
  const startY = 820;
  const gap = 30;

  metricas.forEach((m, idx) => {
    const y = startY + idx * (cardH + gap);

    // Fondo tarjeta
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.roundRect((W - cardW) / 2, y, cardW, cardH, 24);
    ctx.fill();

    // Borde fino
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Icono
    ctx.font = "44px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(m.icon, (W - cardW) / 2 + 36, y + cardH / 2);

    // Valor
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 48px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(m.valor, (W - cardW) / 2 + 110, y + cardH / 2 - 14);

    // Label
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "600 20px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(m.label, (W - cardW) / 2 + 110, y + cardH / 2 + 24);
  });

  // Footer con marca de agua elegante
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Entrenando en " + opts.gimnasioNombre, W / 2, H - 160);

  ctx.fillStyle = volt;
  ctx.font = "800 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("POTENCIADO POR SYSGYM", W / 2, H - 110);

  return canvas.toDataURL("image/png");
}
