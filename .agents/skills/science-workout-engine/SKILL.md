---
name: science-workout-engine
description: |
  Motor de generación y optimización algorítmica de rutinas en SysGym, basado
  estrictamente en evidencia científica (Schoenfeld, Israetel/RP, Helms, Beardsley).
  Gobierna la selección de split, volumen por sesión (evitando junk volume),
  frecuencia 2x real, proximidad al fallo (RIR), DUP coherente, sustituciones
  biomecánicas finas por molestia articular y contratos tipados en TypeScript.
version: 1.0.0
---

# Science Workout Engine — SysGym Algorithmic Routine Designer

> **PRINCIPIO FUNDAMENTAL**: Máximo estímulo hipertrófico y de fuerza con la mínima fatiga articular y sistémica necesaria. Prohibido el volumen basura, las progresiones lesivas y las incoherencias entre split y periodización.

---

## 1. Fundamentos Científicos de Base

Toda decisión algorítmica generada por este motor se rige por la literatura de entrenamiento de fuerza contemporánea:

1. **Dosis-Respuesta de Volumen (*Schoenfeld et al. 2017, Baz-Valle et al. 2022*)**:
   * **MEV** (Volumen Mínimo Efectivo): ~6–8 series semanales por grupo muscular.
   * **MAV** (Volumen Adaptativo Óptimo): ~12–18 series semanales por grupo.
   * **MRV** (Volumen Máximo Recuperable): ~20–22+ series semanales (riesgo de rendimientos decrecientes).
   * **Techo por sesión (*Heaselgrave 2019, Krieger 2020*)**: El beneficio hipertrófico satura entre **6 y 8 (máximo 10) series efectivas por grupo muscular en una misma sesión**. Cualquier serie por encima de 8–10 se clasifica como *junk volume* (fatiga residual y daño muscular sin estímulo adicional).
2. **Frecuencia Óptima (*Schoenfeld, Ogborn & Krieger 2016*)**:
   * A volumen igualado, repartir el trabajo semanal en **frecuencia 2x** por grupo muscular supera a la frecuencia 1x por menor fatiga aguda por sesión y mejor calidad técnica en cada serie.
3. **Proximidad al Fallo y RIR (*Grgic et al. 2022*)**:
   * Entrenar a **RIR 1–3** (1 a 3 repeticiones en reserva) produce idéntica hipertrofia que el fallo concéntrico absoluto (RIR 0), pero reduce a la mitad la fatiga del sistema nervioso central (SNC) y el daño neuromuscular.
   * El fallo (RIR 0) solo se permite en la última serie de ejercicios de aislamiento guiados/poleas.
4. **Aprendizaje Motor y Especificidad de Fuerza (*Suchomel et al. 2018, Rippetoe*)**:
   * En principiantes, la fuerza depende del aprendizaje motor y la sincronización intermuscular. Requiere repetición del mismo patrón básico 2–3 veces por semana con sobrecarga lineal, sin rotaciones caóticas de ejercicios.

---

## 2. Capa 1: Parámetros Básicos (Vista Cliente / Formulario Simple)

Entradas mínimas e intuitivas para el usuario final sin jerga técnica:

| Parámetro | Tipo / Opciones | Comportamiento Algorítmico |
|---|---|---|
| `objetivo` | `fuerza` \| `hipertrofia` | • **Fuerza**: 4–6 reps en primarios, descansos 2–3 min, RIR 2–3, énfasis en básicos con barra.<br>• **Hipertrofia**: 6–12 reps, descansos 90–120 s, RIR 1–2, balance entre libres y máquinas. |
| `dias` | `2` \| `3` \| `4` \| `5` \| `6` | Determina la topología del split base para garantizar frecuencia 2x sin exceder el techo por sesión. |
| `zona_enfoque` | `string[]` (máx. 2)<br>*[gluteos, piernas, pecho, espalda, hombros, brazos, abdomen]* | • Asigna **+2 a +4 series semanales** a las zonas elegidas (llevándolas a su MAV ~16–18 series).<br>• Grupos no seleccionados se mantienen en **MEV (~8–10 series)** para sostener el presupuesto de fatiga. |
| `evitar_dolor` | `string[]` (opcional)<br>*[hombro, rodilla, lumbar, muneca, codo]* | **Filtro Excluyente Duro**: Elimina del catálogo los ejercicios de torque lesivo directo en esa articulación (ej: lumbar $\rightarrow$ descarta peso muerto libre y sentadilla trasnuca). |
| `equipamiento` | `gimnasio_completo` \| `mancuernas_peso_corporal` \| `solo_peso_corporal` | Filtro absoluto de disponibilidad de equipamiento sobre el banco de ejercicios. |

---

## 3. Capa 2: Parámetros Avanzados (Ajustes Finos / Motor Interno)

Variables operadas automáticamente con valores por defecto óptimos, o ajustables por entrenadores/soporte:

### A. `split` (Topología de Distribución Semanal)
* **Default Automático por Días**:
  * **2 Días**: `Full Body A` / `Full Body B` (Frecuencia 2x total, ~14–16 series/sesión).
  * **3 Días**: `Full Body A` / `Full Body B` / `Full Body C` **O** `Torso` / `Pierna` / `Full Body` (Garantiza frecuencia 2x real para tren inferior y superior, evitando el error de dejar piernas en frecuencia 1x).
  * **4 Días**: `Torso A` / `Pierna A` / `Torso B` / `Pierna B` (Frecuencia 2x canónica).
  * **5 Días**: `Torso` / `Pierna` / `Empuje` / `Tracción` / `Pierna` o `Push` / `Pull` / `Legs` / `Torso` / `Pierna`.
  * **6 Días**: `Push A` / `Pull A` / `Legs A` / `Push B` / `Pull B` / `Legs B`.
* **Override Manual**: Permite forzar una estructura específica si el usuario tiene preferencias cerradas.

### B. `repeticiones` y Periodización
* **Default**: Fijado según el `objetivo`:
  * *Fuerza*: Primarios 4–6 reps, Secundarios 6–8 reps, Aislamientos 8–10 reps.
  * *Hipertrofia*: Primarios 6–8 reps, Secundarios 8–10 reps, Aislamientos 10–12 reps.
* **Avanzado DUP (Daily Undulating Periodization)**:
  > [!IMPORTANT]
  > **Regla Anti-Falsa DUP**: La ondulación de repeticiones debe aplicarse **dentro de cada grupo muscular**, jamás asignando un día "liviano" a todo un tren corporal que solo entrena una vez por semana.
  * *Día Pesado (Tensión Mecánica)*: 5–8 reps · 2–3 min descanso.
  * *Día Metabólico / Hipertrofia*: 10–15 reps · 60–90 s descanso.
  * *Prohibido*: Series axiales pesadas (como Peso Muerto Rumano o Sentadilla libre) a 15–20 reps con descansos menores a 90s (previene colapso postural y daño lumbar).

### C. `volumen_semanal` y Techo por Sesión
* **Presets**:
  * `bajo`: ~10–12 series semanales por grupo muscular.
  * `estandar` (Default): ~14–16 series semanales por grupo muscular.
  * `alto`: ~18–20 series semanales (reservado para atletas avanzados en superávit calórico).
* **Techo Duro por Ejercicio y Sesión**:
  * Máximo **3 a 4 series** de un mismo ejercicio básico (6 series del mismo patrón genera fatiga redundante y sobreuso articular).
  * Máximo **6 a 8 series totales** para un mismo grupo muscular por día.

### D. `esfuerzo` (RIR / Proximidad al Fallo)
* **Compuestos Multiarticulares (Banca, Sentadilla, RDL, Remos libres)**:
  * RIR obligatorio: **2–3** (fuerza) o **1–2** (hipertrofia). **NUNCA RIR 0**.
* **Secundarios en Máquinas / Poleas**:
  * RIR: **1–2**.
* **Aislamientos (Bíceps, Tríceps, Elevaciones laterales, Gemelos)**:
  * RIR: **1–2**, permitiendo **RIR 0 (fallo técnico)** en la última serie.

### E. `orden_ejercicios`
1. **Primarios**: Compuestos pesados libres / mayor demanda neural y axial (banca, sentadilla, hip thrust, dominadas/remos pesados).
2. **Secundarios**: Multiarticulares en máquina o mancuernas de mayor estabilidad (prensa, jalones, press inclinado).
3. **Aislamientos**: Monoarticulares en polea o mancuerna (curls, extensiones, elevaciones).
4. **Core / Accesorios menores**: Crunches, gemelos, antebrazos.

### F. `tecnicas_intensidad` (Solo Aislamientos)
* **Default**: `ninguna` (series tradicionales).
* **Opciones**: `drop_set` o `rest_pause`.
* **Regla Estricta**: Únicamente aplicables en la **última serie del ejercicio final de aislamiento en máquina o polea** (ej: última serie de extensiones de tríceps o elevaciones laterales). Terminantemente prohibido en sentadillas, presses libres, pesos muertos o remos libres.

### G. `molestias_avanzado` (Sustitución Biomecánica Fina)
A diferencia del filtro básico que solo descarta, este módulo realiza **sustituciones funcionales equivalentes**:

| Molestia | Ejercicio Problemático | Sustituto Biomecánico Exacto | Razón Mecánica |
|---|---|---|---|
| **Rodilla** | Sentadilla profunda libre / Extensión cuádriceps pesada | **Prensa con pies altos** / **Zancada estática inversa** / **Hip Thrust** | Reduce el brazo de palanca patelofemoral y aumenta el reclutamiento de cadera/glúteo. |
| **Zona lumbar** | Remo con barra libre / Peso muerto convencional | **Remo con apoyo en pecho (Chest-supported)** / **Remo en polea baja con banco inclinado** | Elimina por completo el momento de fuerza sobre los erectores espinales y la compresión vertebral $L4-L5/S1$. |
| **Hombro** | Press banca plano con barra / Press militar estricto | **Press inclinado a 30° con mancuernas en plano escapular** / **Press militar neutro en máquina convergente** | Descomprime el espacio subacromial y previene el pinzamiento del supraespinoso. |
| **Codo / Muñeca** | Press francés con barra recta / Curl de bíceps barra recta | **Extensión de tríceps en polea con cuerda doble** / **Curl en banco inclinado con mancuernas libres** | Permite pronosupinación libre respetando el ángulo de carga del codo (*carrying angle*). |

---

## 4. Reglas Transversales de Cálculo de Volumen

### Solapamiento Muscular y Series Fraccionales (*Sinergistas*)
Para no subestimar ni inflar el volumen de brazos y hombros:
* **Ejercicios de Empuje Compuesto (Press banca, Militar)**:
  * Suma **1.0 serie** al músculo principal (Pecho o Deltoides anterior).
  * Suma **0.5 series** a los sinergistas directos (Tríceps y Deltoides anterior).
* **Ejercicios de Tracción Compuesta (Remos, Dominadas, Jalones)**:
  * Suma **1.0 serie** al músculo principal (Dorsal / Trapecio).
  * Suma **0.5 series** a los sinergistas directos (Bíceps y Deltoides posterior).
* **Ejercicios Dominantes de Cadera (Peso Muerto Rumano)**:
  * Suma **1.0 serie** a Isquiosururales.
  * Suma **0.5 series** a Glúteos y Erectores Espinales.

---

## 5. Contrato de Tipado TypeScript

La salida de cualquier generador regido por esta skill debe ajustarse estrictamente a este esquema tipado:

```ts
export type Objetivo = 'fuerza' | 'hipertrofia';
export type Nivel = 'principiante' | 'intermedio' | 'avanzado';
export type Equipamiento = 'gimnasio_completo' | 'mancuernas_peso_corporal' | 'solo_peso_corporal';
export type ArticulacionMolestia = 'hombro' | 'rodilla' | 'lumbar' | 'muneca' | 'codo';
export type GrupoMuscular = 'pecho' | 'espalda' | 'cuadriceps' | 'isquios' | 'gluteos' | 'hombros' | 'biceps' | 'triceps' | 'gemelos' | 'core';
export type RolEjercicio = 'primario' | 'secundario' | 'aislamiento';

export interface ParametrosRutina {
  // Capa 1: Básicos
  objetivo: Objetivo;
  dias: 2 | 3 | 4 | 5 | 6;
  zonasEnfoque?: GrupoMuscular[]; // Máximo 2
  evitarDolor?: ArticulacionMolestia[];
  equipamiento: Equipamiento;

  // Capa 2: Avanzados (Opcionales con defaults calculados)
  nivel?: Nivel;
  splitOverride?: string;
  periodizacion?: 'fija' | 'dup';
  volumenPreset?: 'bajo' | 'estandar' | 'alto';
  rirCompuestos?: number;
  rirAislamientos?: number;
  tecnicaIntensidadAislamiento?: 'ninguna' | 'drop_set' | 'rest_pause';
}

export interface EjercicioProgramado {
  id: string;
  nombre: string;
  grupoPrincipal: GrupoMuscular;
  gruposSinergistas: GrupoMuscular[];
  rol: RolEjercicio;
  series: number;
  repeticionesMin: number;
  repeticionesMax: number;
  descansoSegundos: number;
  rirObjetivo: number;
  tecnica?: 'drop_set' | 'rest_pause';
  notasBiomecanicas?: string;
}

export interface SesionEntrenamiento {
  diaNumero: number;
  nombreSesion: string; // ej: "Full Body A - Énfasis Tensión Mecánica"
  enfoque: string;
  ejercicios: EjercicioProgramado[];
  totalSeriesSesion: number; // No debe superar 18-22 series
  duracionEstimadaMinutos: number;
}

export interface RutinaGenerada {
  id: string;
  nombre: string;
  splitUtilizado: string;
  frecuenciaPromedio: number; // Idealmente 2.0x
  balanceVolumenSemanal: Record<GrupoMuscular, number>; // Incluye 0.5 de sinergistas
  sesiones: SesionEntrenamiento[];
  justificacionCientifica: string[];
}
```

---

## 6. Checklist de Validación Pre-Generación

Antes de entregar o guardar una rutina generada por el motor, validar estas 5 condiciones invariantes:
1. [ ] **¿Ninguna sesión supera las 22 series totales?** (Ideal: 15–20 series).
2. [ ] **¿Ningún grupo muscular supera 8–10 series en una misma sesión?**
3. [ ] **¿Ningún ejercicio básico se programa con más de 4 series efectivas?**
4. [ ] **¿El split de 3 días otorga frecuencia 2x real a todo el cuerpo (Full Body o Torso/Pierna/Full Body)?**
5. [ ] **¿Las molestias articulares tienen reemplazos ergonómicos y no solo descansos cortos imposibles?**
