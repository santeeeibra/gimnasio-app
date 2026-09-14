// Único lugar con las citas de teoría del generador de rutinas. Lo consume el
// form del modo avanzado (un <details> "¿por qué?" por control) y la vista del
// dueño (tooltip "por qué está armada así"). Texto en español, resumen de una
// línea, fuente verificable. Sin IA: el motor sigue siendo reglas puras y esto
// solo explica de dónde sale cada regla.

export type Teoria = {
  titulo: string;
  resumen: string;
  fuente: string;
};

export const TEORIA = {
  frecuencia: {
    titulo: "Frecuencia: cada músculo 2 veces por semana",
    resumen:
      "A volumen igualado, repartir el trabajo de un grupo en 2 sesiones semanales rinde más que hacerlo todo en 1.",
    fuente:
      "Schoenfeld, Ogborn & Krieger, Sports Medicine 2016 (meta-análisis de frecuencia de entrenamiento).",
  },
  schoenfeld_techo: {
    titulo: "Techo de volumen por sesión (Evitar Junk Volume)",
    resumen:
      "El estímulo óptimo por músculo satura entre 6 y 8 series por sesión. Superar ese límite genera fatiga y daño muscular sin ganancia extra.",
    fuente:
      "Baz-Valle et al. 2022; Krieger 2020; Heaselgrave et al. 2019.",
  },
  dup: {
    titulo: "Periodización ondulante diaria (DUP)",
    resumen:
      "Variar el rango de repeticiones día a día (pesado / medio / liviano) estimula diferentes adaptaciones neuromusculares sin quemar el sistema nervioso.",
    fuente:
      "Rhea et al. 2002; Zourdos et al. 2016 (DUP vs. periodización lineal).",
  },
  volumen: {
    titulo: "Volumen semanal por grupo muscular (MEV y MAV)",
    resumen:
      "El rango adaptativo óptimo (MAV) se sitúa entre 12 y 18 series semanales. Se asigna 0.5 series de crédito a músculos sinergistas en compuestos.",
    fuente:
      "Schoenfeld et al. 2017; Israetel, Scientific Principles of Hypertrophy Training.",
  },
  rir: {
    titulo: "Esfuerzo: repeticiones en reserva (RIR) y VBT",
    resumen:
      "Entrenar a RIR 1–2 (1 a 2 repeticiones antes del fallo) maximiza el reclutamiento de fibras rápidas con mínima fatiga del sistema nervioso.",
    fuente:
      "Grgic et al. 2022; David Marchante (PowerExplosive, entrenamiento basado en velocidad).",
  },
  // Variantes específicas por opción elegida en el <select> de Esfuerzo. El
  // resumen genérico "rir" de arriba describe RIR 1-2 y quedaba pegado como
  // fundamentación aunque el cliente eligiera "Suave" o "Al límite" (bug
  // reportado: cambiaba la opción y el "¿por qué?" no cambiaba con ella).
  rir_2_3: {
    titulo: "Esfuerzo suave: RIR 2–3",
    resumen:
      "Dejar 2 a 3 repeticiones en reserva reduce al mínimo la fatiga del sistema nervioso central. Ideal para principiantes, técnica en aprendizaje o volumen alto, a costa de un estímulo levemente menor por serie.",
    fuente: "Grgic et al. 2022 (dosis-respuesta de proximidad al fallo).",
  },
  rir_1_2: {
    titulo: "Esfuerzo exigente: RIR 1–2",
    resumen:
      "Entrenar a RIR 1–2 (1 a 2 repeticiones antes del fallo) maximiza el reclutamiento de fibras rápidas con mínima fatiga del sistema nervioso. Es el punto óptimo para hipertrofia en la mayoría de los casos.",
    fuente:
      "Grgic et al. 2022; David Marchante (PowerExplosive, entrenamiento basado en velocidad).",
  },
  rir_0_1: {
    titulo: "Esfuerzo al límite: RIR 0–1",
    resumen:
      "Acercarse al fallo (0 a 1 repeticiones en reserva) exprime el estímulo por serie, pero multiplica la fatiga neuromuscular. Se reserva para atletas avanzados y solo en la última serie de aislamientos, nunca en básicos pesados.",
    fuente: "Grgic et al. 2022; Helms et al. (Muscle & Strength Pyramid).",
  },
  beardsley_rep_efectivas: {
    titulo: "Repeticiones Efectivas y Tensión Mecánica",
    resumen:
      "Solo las últimas 5 repeticiones de una serie pesada cercana al fallo generan tensión mecánica de alto umbral.",
    fuente:
      "Chris Beardsley, Strength and Conditioning Research.",
  },
  nippard_estiramiento: {
    titulo: "Hipertrofia mediada por estiramiento",
    resumen:
      "Entrenar en posiciones de máxima elongación muscular (bancos inclinados, poleas cruzadas, sentadillas profundas) dispara la adición de sarcómeros en serie.",
    fuente:
      "Jeff Nippard; Pedrosa et al. 2022; Maeo et al. 2021.",
  },
  pradells_estabilidad: {
    titulo: "Tensión Mecánica por Máxima Estabilidad",
    resumen:
      "El uso de máquinas convergentes, péndulos y remos apoyados elimina el factor limitante del equilibrio, permitiendo empujar al límite con total seguridad.",
    fuente:
      "Joan Pradells; Directrices de estabilidad biomecánica de alta carga.",
  },
  glass_angulacion: {
    titulo: "Ángulos articulares protectores",
    resumen:
      "Inclinaciones bajas (15–30°), remos con soporte de pecho y pies altos en prensa eliminan el estrés en lumbares, manguito rotador y rodillas.",
    fuente:
      "Charles Glass, The Godfather of Bodybuilding; biomecánica articular aplicada.",
  },
  rambod_fst7: {
    titulo: "Protocolo FST-7 (Fascia Stretch Training)",
    resumen:
      "7 series finales de aislamiento con 30–45s de descanso y pose isométrica para inducir hiperemia reactiva y volemia fascial.",
    fuente:
      "Hany Rambod, Creador de FST-7 y 24x campeón del Olympia.",
  },
  saladino_atletico: {
    titulo: "Rendimiento y Balance Unilateral",
    resumen:
      "Integrar trabajo unilateral y transporte con carga (carries) equilibra asimetrías de fuerza y protege la columna lumbopélvica.",
    fuente:
      "Don Saladino, Especialista en rendimiento atlético funcional.",
  },
  tecnicas: {
    titulo: "Técnicas de intensidad (dropset, rest-pause, myo-reps)",
    resumen:
      "Rinden parecido a las series rectas a volumen igualado pero en menos tiempo, a costa de más fatiga: conviene reservarlas para accesorios y la última serie.",
    fuente:
      "Fink et al. 2018 (dropsets); Enes et al., JSCR 2021 (rest-pause).",
  },
  orden: {
    titulo: "Orden de ejercicios",
    resumen:
      "Los primeros ejercicios de la sesión reciben más volumen efectivo y ganancia; conviene ordenar por prioridad.",
    fuente:
      "Simão et al., Sports Medicine 2012 (revisión sobre orden de ejercicios).",
  },
  molestia: {
    titulo: "Entrenar alrededor del dolor",
    resumen:
      "Ante molestia articular, sustituir el patrón por una variante que respete el rango sin dolor mantiene el estímulo del grupo sin forzar la articulación.",
    fuente:
      "Consenso de rehabilitación de fuerza; p. ej. Rio et al. 2015 sobre carga y dolor tendinoso.",
  },
  sexo_mujer: {
    titulo: "Ajuste para mujeres",
    resumen:
      "Se prioriza el trabajo de cadera, glúteos e isquios y se baja una serie en los compuestos pesados. Es un sesgo, no un filtro: ningún ejercicio queda excluido.",
    fuente:
      "Preferencia y adherencia de práctica; el volumen relativo y la respuesta al entrenamiento no difieren por sexo (Roberts et al. 2020).",
  },
} satisfies Record<string, Teoria>;

export type ClaveTeoria = keyof typeof TEORIA;
