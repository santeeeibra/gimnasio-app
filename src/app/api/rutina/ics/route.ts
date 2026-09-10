import { type NextRequest } from "next/server";
import { generarIcsContent } from "@/lib/calendar/google-calendar";

/**
 * Devuelve un archivo .ics servido con `Content-Type: text/calendar`.
 *
 * iOS Safari (y sobre todo la PWA en modo standalone) ignora tanto los URIs
 * `data:` como los `blob:` cuando se navega a ellos: por eso "Agendar en Apple
 * Calendar" no hacía nada. Con una URL real del mismo origen que responde con
 * el MIME correcto, iOS abre la hoja nativa "Agregar al calendario".
 */
export function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;

  const titulo = p.get("t")?.slice(0, 200) || "Entrenamiento";
  const descripcion = p.get("d")?.slice(0, 4000) || "";
  const ubicacion = p.get("loc")?.slice(0, 200) || undefined;
  const durParam = Number(p.get("dur"));
  const duracionMinutos =
    Number.isFinite(durParam) && durParam > 0 && durParam <= 600
      ? durParam
      : 75;
  const startParam = p.get("start");
  const fecha = startParam ? new Date(startParam) : undefined;
  const fechaInicio =
    fecha && !Number.isNaN(fecha.getTime()) ? fecha : undefined;
  const recurrenteSemanal = p.get("rec") !== "0";

  const ics = generarIcsContent({
    titulo,
    descripcion,
    ubicacion,
    duracionMinutos,
    fechaInicio,
    recurrenteSemanal,
  });

  const nombreArchivo =
    titulo.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") ||
    "entrenamiento";

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
