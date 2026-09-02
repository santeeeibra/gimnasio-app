/**
 * Compresión del logo en el navegador (antes de subir — obligatorio).
 * Redimensiona a <= 512px de lado, exporta WebP y baja calidad en escalones
 * hasta entrar en 300 KB. No usa librerías ni cómputo de servidor.
 */

export const LOGO_MAX_LADO = 512;
export const LOGO_MAX_BYTES = 300 * 1024;

export type LogoProcesado = {
  /** WebP comprimido, listo para subir al bucket. */
  blob: Blob;
  ancho: number;
  alto: number;
  /** Píxeles del canvas ya redimensionado, para extraer el color dominante. */
  imageData: ImageData;
};

function cargarImagen(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function exportarWebp(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo exportar la imagen.")),
      "image/webp",
      calidad,
    );
  });
}

export async function procesarLogo(file: File): Promise<LogoProcesado> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen.");
  }

  const img = await cargarImagen(file);
  if (!img.width || !img.height) {
    throw new Error("La imagen está vacía o dañada.");
  }

  // Redimensionar manteniendo aspect ratio, sin recorte forzado.
  const escala = Math.min(1, LOGO_MAX_LADO / Math.max(img.width, img.height));
  const ancho = Math.max(1, Math.round(img.width * escala));
  const alto = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no puede procesar imágenes.");
  }
  ctx.drawImage(img, 0, 0, ancho, alto);

  const imageData = ctx.getImageData(0, 0, ancho, alto);

  let calidad = 0.8;
  let blob = await exportarWebp(canvas, calidad);
  while (blob.size > LOGO_MAX_BYTES && calidad > 0.4) {
    calidad = Math.round((calidad - 0.1) * 10) / 10;
    blob = await exportarWebp(canvas, calidad);
  }

  if (blob.type !== "image/webp") {
    throw new Error(
      "Tu navegador no puede convertir a WebP. Probá desde Chrome.",
    );
  }
  if (blob.size > LOGO_MAX_BYTES) {
    throw new Error("La imagen es muy pesada. Probá con una más simple.");
  }

  return { blob, ancho, alto, imageData };
}
