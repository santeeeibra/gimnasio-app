// ─────────────────────────────────────────────────────────────────────────────
// Voz guiada — TTS server-side con Edge TTS (voz neural de Microsoft, gratis,
// sin límite de caracteres). El cliente cachea el audio resultante (Cache API,
// ver src/lib/ui/voz.ts) así que esto se llama una sola vez por frase.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";

const VOZ = "es-AR-TomasNeural";

export async function GET(req: NextRequest) {
  const texto = req.nextUrl.searchParams.get("texto")?.trim();
  if (!texto) {
    return NextResponse.json({ error: "falta texto" }, { status: 400 });
  }
  // Hasta ~3 bullets de tips de técnica (generados con max_tokens 220 en
  // scripts/pregenerar-tips-ia.mjs y src/lib/rutina/tips-tecnica-ia.ts).
  if (texto.length > 1000) {
    return NextResponse.json({ error: "texto demasiado largo" }, { status: 400 });
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOZ, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(texto);

    const chunks: Buffer[] = [];
    for await (const chunk of audioStream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "content-type": "audio/mpeg",
        // Inmutable: el mismo texto siempre produce el mismo audio.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error generando voz con Edge TTS:", err);
    return NextResponse.json({ error: "tts-fail" }, { status: 502 });
  }
}
