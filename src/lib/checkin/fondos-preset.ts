/**
 * Galería de fondos precargados para la pantalla de check-in (kiosko).
 * Cada preset es una imagen estática en `public/checkin-fondos/<id>.webp`
 * (subida al repo, no a Supabase Storage — no cambia por gimnasio).
 *
 * Para sumar un fondo nuevo: agregar el archivo WebP en esa carpeta
 * (recomendado ≤ 400 KB, orientación vertical/retrato para tablets de
 * mostrador) y agregar una entrada acá. No hace falta migración.
 */
export type FondoPreset = {
  id: string;
  label: string;
  url: string;
};

// Todavía sin imágenes precargadas: se suman a medida que estén listas.
export const PRESETS_FONDO_CHECKIN: FondoPreset[] = [];
