# Automatización de Videos Masivos con n8n y Creatomate / Remotion

Este documento contiene la arquitectura técnica y el payload para orquestar la generación de videos promocionales automatizados para **SysGym** usando **n8n**.

---

## 1. Arquitectura del Flujo en n8n

```
[Webhook / Schedule Trigger]
            ↓
[Nodo 1: Notion / Airtable / Google Sheets]
(Lee la lista de ganchos virales y temas a promocionar)
            ↓
[Nodo 2: OpenAI / Anthropic]
(Genera las 4 líneas del guion: Hook, Problema, Solución en SysGym, CTA)
            ↓
[Nodo 3: ElevenLabs API]
(Genera el audio MP3 ultra-realista y devuelve la URL del archivo)
            ↓
[Nodo 4: Creatomate API (POST /v1/renders)]
(Inserta el audio + video de pantalla de SysGym + subtítulos dinámicos)
            ↓
[Nodo 5: Google Drive / Telegram / Meta Graph API]
(Notifica que el video está listo y exportado en 1080x1920)
```

---

## 2. Configuración del Nodo Creatomate (Plantilla JSON)

Al llamar a `https://api.creatomate.com/v1/renders` desde n8n (HTTP Request Node):

```json
{
  "template_id": "TU_TEMPLATE_ID_EN_CREATOMATE",
  "modifications": {
    "VozEnOff.source": "{{ $node['ElevenLabs'].json['audio_url'] }}",
    "HookText.text": "{{ $node['OpenAI'].json['hook'] }}",
    "ScreenRecording.source": "https://tuservidor.com/assets/sysgym_demo_rutina.mp4",
    "Subtitulos.text": "{{ $node['OpenAI'].json['transcript'] }}",
    "CtaButton.text": "PROBALA GRATIS 7 DÍAS"
  }
}
```

---

## 3. Grabación de Clips Base de SysGym (Solo se graban una vez)

Para alimentar la plantilla de Creatomate o CapCut, solo necesitas grabar **3 videos de 10 segundos** en tu celular o simulador:

1. `clip_1_registro_serie.mp4`: Tocando una serie completada, cambiando el peso o RIR.
2. `clip_2_timer_haptico.mp4`: El cronómetro circular corriendo con el pulpo Volt.
3. `clip_3_grafico_progreso.mp4`: Haciendo scroll en las métricas de hipertrofia semanal.

Con estos 3 clips de fondo, el flujo de n8n puede generar **más de 50 variaciones de anuncios** cambiando solo el gancho inicial, el audio de ElevenLabs y el texto superior.
