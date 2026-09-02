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
  dup: {
    titulo: "Periodización ondulante diaria (DUP)",
    resumen:
      "Variar el rango de repeticiones día a día (pesado / medio / liviano) iguala o supera a mantenerlo fijo, en personas entrenadas.",
    fuente:
      "Rhea et al., Journal of Strength and Conditioning Research 2002 (DUP vs. periodización lineal).",
  },
  volumen: {
    titulo: "Volumen semanal por grupo muscular",
    resumen:
      "Más de 10 series semanales por grupo produce más hipertrofia que menos de 10; el beneficio sigue subiendo hasta ~20 con rendimientos decrecientes.",
    fuente:
      "Schoenfeld et al., Journal of Sports Sciences 2017 (dosis-respuesta) y Baz-Valle et al. 2022 (revisión).",
  },
  rir: {
    titulo: "Esfuerzo: repeticiones en reserva (RIR)",
    resumen:
      "Llegar al fallo no es necesario para ganar músculo cuando el volumen está igualado, y agrega fatiga y tiempo de recuperación, sobre todo en los básicos.",
    fuente:
      "Grgic et al., Sports Medicine 2022 (meta-análisis entrenamiento al fallo vs. sin fallo).",
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
