# Molinete virtual (Wokwi + ESP32)

Simulador aislado de un molinete para prototipar la integración de hardware de SysGym.
**No** usa Wi-Fi, HTTP, MQTT ni se conecta a SysGym/Supabase: todo se maneja por monitor serie.

## Circuito

| Componente | Pin ESP32 | Función |
|---|---|---|
| LED verde | GPIO 26 | Acceso autorizado (encendido mientras el molinete está destrabado) |
| LED rojo | GPIO 27 | Acceso rechazado (1 s) |
| LED azul | GPIO 25 | Salida virtual **entrada** (relé de destrabe, sentido entrada) |
| LED amarillo | GPIO 33 | Salida virtual **salida** (relé de destrabe, sentido salida) |
| Botón azul | GPIO 18 | Simula el giro de entrada (sensor) |
| Botón amarillo | GPIO 19 | Simula el giro de salida (sensor) |

Tiempos (constantes al inicio de `sketch.ino`):

- `RELOCK_AFTER_PASS_MS = 1000`: cierre automático 1 s después del giro.
- `UNLOCK_TIMEOUT_MS = 5000`: si nadie gira, se vuelve a trabar a los 5 s.
- `DEBOUNCE_MS = 50`: antirrebote de los botones.

No hace falta ninguna librería externa (no hay `libraries.txt`).

## Abrirlo en Wokwi

1. Entrá a <https://wokwi.com/projects/new/esp32>.
2. En la pestaña `sketch.ino`, reemplazá todo por el contenido de [`sketch.ino`](sketch.ino).
3. En la pestaña `diagram.json`, reemplazá todo por el contenido de [`diagram.json`](diagram.json).
4. Tocá ▶ (Start the simulation). Al arrancar aparece `{"event":"boot","state":"locked"}`.
5. Escribí los comandos en el campo de entrada del monitor serie (abajo del circuito) y presioná Enter.

Alternativa con VS Code: extensión *Wokwi for VS Code* + compilar con `arduino-cli` (placa `esp32:esp32:esp32`) y agregar un `wokwi.toml` apuntando al `.bin`/`.elf` generado.

## Comandos por monitor serie

| Comando | Efecto |
|---|---|
| `OPEN ENTRY` | Autoriza y destraba en sentido entrada |
| `OPEN EXIT` | Autoriza y destraba en sentido salida |
| `DENY` | Rechaza: LED rojo 1 s (si estaba destrabado, lo traba) |
| `STATUS` | Imprime estado, sentido y cantidad de pasos |
| `RESET` | Traba, apaga LEDs y pone el contador en 0 |

No distingue mayúsculas. Un comando desconocido devuelve `{"event":"error",...}`.

## Eventos (JSON, una línea cada uno)

```json
{"event":"access_authorized","direction":"entry","ts":1234}
{"event":"turnstile_unlocked","direction":"entry","ts":1234}
{"event":"passage_confirmed","direction":"entry","ts":2100}
{"event":"turnstile_relocked","direction":"entry","reason":"passage_complete","ts":3100}
{"event":"access_denied","direction":"none","ts":5000}
```

`reason` de `turnstile_relocked`: `passage_complete`, `timeout`, `reset`, `denied`, `superseded`.
`STATUS`/`RESET` responden `{"event":"status","state":"locked|unlocked|passed","direction":"...","passages":N,"ts":...}`.

## Pruebas manuales

1. **Autorizar entrada**: `OPEN ENTRY` → `access_authorized` + `turnstile_unlocked` (entry), se prenden verde y azul. Presionar el botón azul → `passage_confirmed`; 1 s después → `turnstile_relocked` (`passage_complete`) y se apagan los LEDs.
2. **Autorizar salida**: `OPEN EXIT` → igual pero con `direction:"exit"`, LED amarillo y botón amarillo. El botón azul no hace nada en este modo.
3. **Rechazar ingreso**: `DENY` → `access_denied`, LED rojo 1 s. Presionar cualquier botón no genera eventos; `STATUS` sigue en `locked`.
4. **Autorizar pero no girar**: `OPEN ENTRY` y no tocar nada → a los 5 s `turnstile_relocked` con `reason:"timeout"`. `STATUS` → `passages` sin cambios.
5. **Doble pulsación del sensor**: `OPEN ENTRY`, presionar el botón azul dos veces rápido → un solo `passage_confirmed`; `STATUS` muestra `passages` incrementado en 1.

## Próximos pasos (fuera de alcance de este PR)

Conectividad (Wi-Fi/MQTT/HTTP), integración con el check-in y el aforo de SysGym.

## Resultados de las pruebas (Wokwi, 2026-09-21)

Firmware compilado localmente (`arduino-cli`, `esp32:esp32:esp32`, core 3.3.12) y cargado en Wokwi web con "Upload Firmware and Start Simulation".

| # | Prueba | Resultado |
|---|---|---|
| 1 | Autorizar entrada | ✅ Pasó |
| 2 | Autorizar salida | ✅ Pasó |
| 3 | Rechazar ingreso | ✅ Pasó |
| 4 | Autorizar pero no girar | ✅ Pasó |
| 5 | Doble pulsación del sensor sin duplicar el paso | ✅ Pasó |

Nota: el monitor serie usa `"display": "always"`; con `"terminal"` no se podían ingresar los comandos correctamente.
