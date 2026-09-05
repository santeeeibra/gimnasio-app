/**
 * Compresión de imágenes en el navegador usando Canvas y exportación a WebP.
 * Admite tanto `File` como `HTMLCanvasElement` (por ejemplo, tras un recorte).
 * Reduce la calidad progresivamente hasta cumplir con el tamaño máximo en bytes.
 */

export type OpcionesCompresion = {
  maxLado: number;
  maxBytes: number;
  calidadInicial?: number;
};

export type ResultadoCompresion = {
  blob: Blob;
  ancho: number;
  alto: number;
  imageData?: ImageData;
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

function esCanvas(source: File | HTMLCanvasElement): source is HTMLCanvasElement {
  return (
    (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) ||
    (source != null && typeof (source as HTMLCanvasElement).getContext === "function")
  );
}

export async function comprimirImagen(
  source: File | HTMLCanvasElement,
  opciones: {
    maxLado: number;
    maxBytes: number;
    calidadInicial?: number;
  },
): Promise<ResultadoCompresion> {
  let sourceElement: CanvasImageSource;
  let origWidth = 0;
  let origHeight = 0;

  if (esCanvas(source)) {
    origWidth = source.width;
    origHeight = source.height;
    sourceElement = source;
  } else {
    if (!source.type.startsWith("image/")) {
      throw new Error("Elegí un archivo de imagen.");
    }
    const img = await cargarImagen(source);
    origWidth = img.width;
    origHeight = img.height;
    sourceElement = img;
  }

  if (!origWidth || !origHeight) {
    throw new Error("La imagen está vacía o dañada.");
  }

  // Redimensionar manteniendo aspect ratio
  const escala = Math.min(1, opciones.maxLado / Math.max(origWidth, origHeight));
  const ancho = Math.max(1, Math.round(origWidth * escala));
  const alto = Math.max(1, Math.round(origHeight * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Tu navegador no puede procesar imágenes.");
  }
  ctx.drawImage(sourceElement, 0, 0, ancho, alto);

  const imageData = ctx.getImageData(0, 0, ancho, alto);

  let calidad = opciones.calidadInicial ?? 0.8;
  let blob = await exportarWebp(canvas, calidad);
  while (blob.size > opciones.maxBytes && calidad > 0.4) {
    calidad = Math.round((calidad - 0.1) * 10) / 10;
    blob = await exportarWebp(canvas, calidad);
  }

  if (blob.type !== "image/webp") {
    throw new Error(
      "Tu navegador no puede convertir a WebP. Probá desde Chrome.",
    );
  }
  if (blob.size > opciones.maxBytes) {
    throw new Error("La imagen es muy pesada. Probá con una más simple.");
  }

  return { blob, ancho, alto, imageData };
}
