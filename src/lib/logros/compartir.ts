/**
 * Compartir logros — armado de textos y helpers de descarga / WhatsApp.
 * Sin dependencias; el link de WhatsApp es un `wa.me/?text=` (no adjunta la
 * imagen: el flujo es descargar imagen -> abrir WhatsApp -> adjuntar a mano).
 */

// ── Títulos del logro (también van en la imagen) ─────────────────────────────

export function tituloRecord(pesoKg: number, ejercicio: string): string {
  return `Nuevo récord: ${pesoKg} kg en ${ejercicio}`;
}

export function tituloRacha(dias: number): string {
  return `${dias} días seguidos entrenando`;
}

// ── WhatsApp ────────────────────────────────────────────────────────────────

export function linkWhatsAppLogro(mensaje: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeWhatsAppRecord(
  gimnasio: string,
  pesoKg: number,
  ejercicio: string,
): string {
  return `¡Nuevo récord en ${gimnasio}! 💪 ${pesoKg} kg en ${ejercicio}. Gestioná tu progreso así en sysgym.app 🔥 Mirá la tarjeta 👇`;
}

export function mensajeWhatsAppRacha(gimnasio: string, dias: number): string {
  return `¡${dias} días seguidos entrenando en ${gimnasio}! 🔥 Gestioná tu progreso así en sysgym.app 💪 Mirá la tarjeta 👇`;
}

// ── Descarga de la imagen generada ──────────────────────────────────────────

export function descargarDataUrl(dataUrl: string, nombreArchivo: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
