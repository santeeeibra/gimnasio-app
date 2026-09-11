# Protocolo de Alta Velocidad y Ahorro de Tokens — SysGym (GEMINI.md)

> **Objetivo fundamental**: Tiempo de respuesta < 60s por tarea, consumo mínimo de tokens y máxima precisión quirúrgica. Cero burocracia, cero subagentes innecesarios.

---

## 1. Matriz de Selección de Modelos y Alertas Proactivas

El modelo predeterminado para el 85% del trabajo diario es **Gemini Flash (Medium)** por su balance imbatible de velocidad y costo.

### Regla de Alerta de Cambio de Modelo:
El agente **DEBE avisar proactivamente** al usuario cuando la tarea justifique cambiar a un modelo superior (**Pro**) antes de empezar:

| Escenario | Modelo Recomendado | Notificación al Usuario |
|---|---|---|
| **Tareas habituales**: Fixes, UI/CSS, endpoints, refactors 1-3 archivos, wiring Supabase, haptics | **Gemini Flash** (Actual) | Ninguna (ejecución directa inmediata) |
| **Arquitectura crítica**: Diseño de nuevo subsistema desde cero, esquema de base de datos relacional complejo con RLS estricto | **Gemini Pro** | `⚠️ Tarea de arquitectura crítica: Te recomiendo cambiar a modelo Pro para diseñar este módulo.` |
| **Refactor transversal masivo**: Modificación simultánea de tipados o contratos en 10+ archivos acoplados | **Gemini Pro** | `⚠️ Refactor masivo interdependiente: Conviene Pro para evitar errores de tipado en cascada.` |
| **Bug esotérico / concurrencia**: Errores difíciles de reproducir tras 2 intentos en Flash | **Gemini Pro** | `⚠️ Bug complejo no trivial: Sugiero cambiar a Pro para análisis profundo de traza.` |

---

## 2. Política Quirúrgica de Ejecución (Zero-Waste)

### A. ¿Cuándo usar Subagentes?
* **PROHIBIDO usar subagentes para:**
  * Fixes de 1 a 3 archivos.
  * Cambios de UI, estilos, animaciones o haptics.
  * Consultas a base de datos, creación de migraciones o endpoints únicos.
  *(El agente principal lo resuelve en 20-30 segundos directamente).*
* **ÚNICO caso permitido para Subagentes:**
  * Generación masiva y paralela de archivos **100% desacoplados** (ej: crear 3 componentes o pantallas nuevas independientes a la vez).
  * **Configuración obligatoria:**
    * `Model`: Siempre `'flash_lite'` o `'flash'` (NUNCA `pro` ni `inherit` ciego).
    * `Prompt`: Especificación cerrada ("Caja Negra"): ruta exacta, props y código requerido. Prohibido explorar directorios a ciegas.

### B. Reglas de Manejo de Archivos y Herramientas
1. **Slicing estricto de lectura:**
   * NUNCA hacer `view_file` de 800 líneas.
   * Flujo obligatorio: `grep_search` → `view_file` con `StartLine` y `EndLine` (máximo 40 a 60 líneas de contexto).
2. **Edición contigua de un solo paso:**
   * Usar `replace_file_content` directamente con el bloque exacto.
   * PROHIBIDO re-leer el archivo inmediatamente después de editarlo para "comprobar que quedó bien".
3. **Cero comandos redundantes:**
   * No correr `npm run build` ni `git status` en cada micro-paso. Solo al finalizar la feature si hay riesgo de rotura de tipados globales.

### C. Comunicación y Respuestas
* Respuestas telegráficas: código aplicado, archivo y líneas tocadas.
* Sin narración de pensamientos ni resúmenes redundantes.
* Si el pedido es directo, ejecutar sin entrar en planning mode burocrático.

---

## 3. Prioridad Suprema de UI/UX (SysGym Standards)
En cualquier cambio de interfaz, aplicar siempre sin preguntar:
1. **`sysgym-ux-patterns`**: Feedback sensorial con `src/lib/ui/hapticos.ts` (Acoustic Haptics + Taptic Engine + audio sintetizado).
2. **`apple-design-skill`**: Mobile-first, targets táctiles ≥44px, curvaturas squircle (`rounded-[10px]`, `rounded-[12px]`).
3. **`60fps-animation`**: Animaciones exclusivas sobre GPU (`transform` y `opacity`).
4. **`sysgym-mascot-skill`**: Mascota oficial (Pulpo Volt `#10e7a0` en `<PulpoCard />` con fondo fijo, cero cajas blancas y cero solapamientos en UI).

---

## 4. Asistencia y Dinámica de Trabajo (Perfil No-Programador)

El usuario no memoriza rutas técnicas ni archivos de código. El agente asume el 100% de la carga de búsqueda y verificación técnica:

1. **Localización por Pantalla o URL**:
   * Encontrar los archivos a partir de textos visibles entre comillas, títulos de pantalla, nombres de botones o URLs que mencione el usuario (mediante `grep_search` o `find_by_name`).
   * NUNCA exigirle al usuario que sepa qué archivo tocar.
2. **Recordatorio Activo de Tips**:
   * Si el usuario describe un cambio sin indicar pantalla o texto, recordarle al instante:
     > *💡 Tip rápido: Decime la URL (ej. `/mi/rutina`) o un texto exacto que veas en esa pantalla y voy directo en 5 segundos.*
   * Recordarle que puede pegar errores o capturas de pantalla directamente si algo falla.
3. **Autonomía y Verificación**:
   * Ejecutar directo con diffs limpios y verificar tipados (`npx tsc --noEmit`) sin obligarlo a validar comandos técnicos.

---

## 5. Modo Ultra-Ahorro Quirúrgico (Cuota Crítica)

Directiva permanente para maximizar la cuota disponible y evitar lecturas o respuestas innecesarias:

### A. Reglas Internas del Agente:
1. **Cero subagentes**: 100% prohibido invocar subagentes. Resolver todo en el hilo principal.
2. **Cero exploraciones ciegas**: Localización por `grep_search` certero y lectura quirúrgica de máximo 20-40 líneas (`view_file` con slicing estricto).
3. **Edición atómica en 1 paso**: Usar eplace_file_content directo.
4. **Regla de cierre (Memoria):** Al finalizar, agregar 1 viñeta en MEMORIA.md resumiendo el cambio (hacer append directo sin leer el archivo).
5. **Respuestas telegráficas**: Reportar únicamente el archivo modificado y 2 líneas de resumen.

### B. Formato Óptimo de Pedidos (Guía para el Usuario):
Para consumir la menor cantidad de tokens posible en cada orden:
* **1. Dónde**: La URL visible (ej: `/mi/rutina`, `/perfil`) O el texto exacto entre comillas (ej: `"Terminar serie"`, `"Plan Actual"`).
* **2. Qué**: La acción exacta (ej: *"cambiá el fondo a negro y sumá háptico success"*).
* **3. Errores**: Si algo falla, pegar la captura o el texto del error directamente sin rodeos.


