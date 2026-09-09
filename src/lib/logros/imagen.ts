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
