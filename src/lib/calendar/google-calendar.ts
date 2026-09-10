/**
 * Generador de eventos de Google Calendar e iCalendar (.ics) en cliente
 * 100% libre de almacenamiento en base de datos (0 bytes en Supabase).
 */

export interface EventoEntrenamiento {
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  fechaInicio?: Date;
  duracionMinutos?: number;
  recurrenteSemanal?: boolean;
}

function formatUtc(d: Date): string {
  return d.toISOString().replace(/-|:|\.\d+/g, "");
}

/**
 * Genera el enlace directo a Google Calendar (Web Intent)
 */
export function generarGoogleCalendarUrl({
  titulo,
  descripcion,
  ubicacion,
  fechaInicio,
  duracionMinutos = 75,
  recurrenteSemanal = true,
}: EventoEntrenamiento): string {
  const ahora = new Date();
  // Horario sugerido: hoy o la fecha dada a las 18:00 hs si no se especificó hora
  const inicio = fechaInicio ? new Date(fechaInicio) : new Date();
  if (!fechaInicio) {
    inicio.setHours(18, 0, 0, 0);
    // Si ya pasaron las 18:00, ponerlo para mañana a las 18:00
    if (inicio.getTime() <= ahora.getTime()) {
      inicio.setDate(inicio.getDate() + 1);
    }
  }

  const fin = new Date(inicio.getTime() + duracionMinutos * 60 * 1000);
  const dates = `${formatUtc(inicio)}/${formatUtc(fin)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    details: descripcion,
    dates,
  });

  if (ubicacion) {
    params.set("location", ubicacion);
  }

  if (recurrenteSemanal) {
    params.set("recur", "RRULE:FREQ=WEEKLY");
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera y descarga un archivo .ics estándar (funciona en Google Calendar, Apple Calendar, Outlook)
 * sin consumir servidor ni almacenamiento.
 */
export function descargarIcsEntrenamiento(evento: EventoEntrenamiento): void {
  const ahora = new Date();
  const inicio = evento.fechaInicio ? new Date(evento.fechaInicio) : new Date();
  if (!evento.fechaInicio) {
    inicio.setHours(18, 0, 0, 0);
    if (inicio.getTime() <= ahora.getTime()) {
      inicio.setDate(inicio.getDate() + 1);
    }
  }
  const fin = new Date(inicio.getTime() + (evento.duracionMinutos ?? 75) * 60 * 1000);

  const uid = `sysgym-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@sysgym.app`;
  const dtStamp = formatUtc(new Date());
  const dtStart = formatUtc(inicio);
  const dtEnd = formatUtc(fin);

  // Escapar caracteres para formato iCalendar
  const cleanSummary = evento.titulo.replace(/\n/g, " ").replace(/,/g, "\\,");
  const cleanDesc = evento.descripcion
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

  const rruleLine = evento.recurrenteSemanal !== false ? "RRULE:FREQ=WEEKLY\r\n" : "";
  const locationLine = evento.ubicacion ? `LOCATION:${evento.ubicacion.replace(/,/g, "\\,")}\r\n` : "";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SysGym//Entrenamientos//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    rruleLine.trim(),
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDesc}`,
    locationLine.trim(),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de entrenamiento SysGym",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${evento.titulo.toLowerCase().replace(/\s+/g, "_")}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
