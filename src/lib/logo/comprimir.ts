/**
 * Compresión del logo en el navegador (antes de subir — obligatorio).
 * Redimensiona a <= 512px de lado, exporta WebP y baja calidad en escalones
 * hasta entrar en 300 KB. No usa librerías ni cómputo de servidor.
 */

import { comprimirImagen } from "@/lib/img/comprimir";

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

export async function procesarLogo(file: File): Promise<LogoProcesado> {
  const res = await comprimirImagen(file, {
    maxLado: LOGO_MAX_LADO,
    maxBytes: LOGO_MAX_BYTES,
    calidadInicial: 0.8,
  });

  if (!res.imageData) {
    throw new Error("No se pudo obtener la información de la imagen.");
  }

  return {
    blob: res.blob,
    ancho: res.ancho,
    alto: res.alto,
    imageData: res.imageData,
  };
}
