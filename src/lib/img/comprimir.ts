/**
 * Compresión de imágenes en el navegador usando Canvas y exportación a WebP
 * con fallback transparente a JPEG (para navegadores como Safari iOS donde
 * la codificación de canvas a WebP puede no estar soportada nativamente).
 *
 * Admite tanto `File` como `HTMLCanvasElement` (por ejemplo, tras un recorte).
 * Reduce la calidad progresivamente hasta cumplir con el tamaño máximo en bytes.
 */

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

function exportarCanvas(
  canvas: HTMLCanvasElement,
  tipo: "image/webp" | "image/jpeg",
  calidad: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("No se pudo exportar la imagen.")),
      tipo,
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

  // Si se exporta a JPEG y la imagen tenía transparencias, rellenar fondo blanco/neutro
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(sourceElement, 0, 0, ancho, alto);

  const imageData = ctx.getImageData(0, 0, ancho, alto);

  let calidad = opciones.calidadInicial ?? 0.85;
  let formato: "image/webp" | "image/jpeg" = "image/webp";

  // Intentar primero con WebP
  let blob = await exportarCanvas(canvas, formato, calidad);

  // En Safari / WebKit, si el navegador no soporta codificar canvas a WebP,
  // toBlob devuelve un PNG o un tipo no-webp. En ese caso hacemos fallback transparente a JPEG.
  if (!blob.type.includes("webp")) {
    formato = "image/jpeg";
    blob = await exportarCanvas(canvas, formato, calidad);
  }

  // Bucle de compresión decreciente si supera el peso máximo
  while (blob.size > opciones.maxBytes && calidad > 0.35) {
    calidad = Math.round((calidad - 0.08) * 100) / 100;
    blob = await exportarCanvas(canvas, formato, calidad);
  }

  // Si aun así supera (fotos con mucho ruido/detalle), reescalar un 20% menos para asegurar el límite
  if (blob.size > opciones.maxBytes && ancho > 120 && alto > 120) {
    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = Math.round(ancho * 0.8);
    miniCanvas.height = Math.round(alto * 0.8);
    const miniCtx = miniCanvas.getContext("2d");
    if (miniCtx) {
      miniCtx.fillStyle = "#ffffff";
      miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);
      miniCtx.drawImage(canvas, 0, 0, miniCanvas.width, miniCanvas.height);
      const miniBlob = await exportarCanvas(miniCanvas, formato, 0.7);
      if (miniBlob.size <= opciones.maxBytes) {
        blob = miniBlob;
      }
    }
  }

  if (blob.size > opciones.maxBytes) {
    throw new Error("La imagen es muy pesada. Probá con una más simple.");
  }

  return { blob, ancho, alto, imageData };
}
