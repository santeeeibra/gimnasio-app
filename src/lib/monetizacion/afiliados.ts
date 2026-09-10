// ─────────────────────────────────────────────────────────────────────────────
// Configuración centralizada de Monetización Pasiva y Afiliados — SysGym
// Permite generar enlaces de afiliados sin fricción (Mercado Libre / Amazon)
// y sugerir equipamiento biomecánico según el ejercicio actual.
// ─────────────────────────────────────────────────────────────────────────────

export type TipoEquipamiento =
  | "straps"
  | "cinturon"
  | "munequeras"
  | "magnesio"
  | "rodilleras"
  | "creatina"
  | "shaker";

export type ProductoAfiliado = {
  id: TipoEquipamiento;
  titulo: string;
  subtitulo: string;
  categoria: string;
  beneficioCientifico: string;
  icono: "straps" | "shield" | "wrist" | "sparkles" | "flask";
  busquedaMeli: string;
  urlDirecta?: string;
  etiquetaPromo?: string;
};

/**
 * Parámetros globales de afiliados.
 * Cuando el creador cree su cuenta de Mercado Libre Afiliados o Amazon,
 * solo reemplaza estos tags o los define en variables de entorno.
 */
export const CONFIG_AFILIADOS = {
  // Tag de afiliado de Mercado Libre (o parámetro de referido)
  tagMercadoLibre: process.env.NEXT_PUBLIC_MELI_AFFILIATE_TAG || "sysgym-21",
  // Tag de Amazon Afiliados
  tagAmazon: process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG || "sysgym-20",
  // Habilitar o pausar sugerencias en la app
  activo: true,
};

/**
 * Catálogo curado de equipamiento y suplementación con base científica
 */
export const CATALOGO_EQUIPAMIENTO: Record<TipoEquipamiento, ProductoAfiliado> = {
  straps: {
    id: "straps",
    titulo: "Straps de Agarre con Neopreno",
    subtitulo: "Agarre asistido para series pesadas",
    categoria: "Accesorios de tracción",
    beneficioCientifico:
      "Evita que el fallo del antebrazo limite el estímulo del dorsal y cadena posterior.",
    icono: "straps",
    busquedaMeli: "straps levantamiento peso gimnasio neopreno",
    etiquetaPromo: "Más elegido",
  },
  cinturon: {
    id: "cinturon",
    titulo: "Cinturón Lumbar de Levantamiento",
    subtitulo: "Soporte intra-abdominal de alta rigidez",
    categoria: "Seguridad y fuerza",
    beneficioCientifico:
      "Aumenta la presión intra-abdominal y protege la columna en cargas axiales pesadas.",
    icono: "shield",
    busquedaMeli: "cinturon levantamiento pesas cuero palanca",
    etiquetaPromo: "Fuerza segura",
  },
  munequeras: {
    id: "munequeras",
    titulo: "Muñequeras Elásticas de Compresión",
    subtitulo: "Estabilidad de muñeca para empujes",
    categoria: "Accesorios de empuje",
    beneficioCientifico:
      "Fija la articulación de la muñeca para transferir la fuerza directo a la barra.",
    icono: "wrist",
    busquedaMeli: "munequeras crossfit gimnasio powerlifting",
  },
  rodilleras: {
    id: "rodilleras",
    titulo: "Rodilleras de Neopreno 7mm",
    subtitulo: "Compresión y calor articular profundo",
    categoria: "Protección de rodilla",
    beneficioCientifico:
      "Favorece la propiocepción y amortigua las fuerzas de cizalla en flexión profunda.",
    icono: "shield",
    busquedaMeli: "rodilleras neopreno 7mm gimnasio sentadillas",
  },
  magnesio: {
    id: "magnesio",
    titulo: "Magnesio Deportivo Antideslizante",
    subtitulo: "En tiza o líquido para barras lisas",
    categoria: "Tracción y fricción",
    beneficioCientifico:
      "Elimina por completo la humedad dérmica maximizando el agarre sobre el moleteado.",
    icono: "sparkles",
    busquedaMeli: "magnesio deportivo liquido gimnasio",
  },
  creatina: {
    id: "creatina",
    titulo: "Creatina Monohidrato Micronizada",
    subtitulo: "100% pura sin sabor",
    categoria: "Suplementación con evidencia",
    beneficioCientifico:
      "Incrementa las reservas intramusculares de fosfocreatina para más reps por serie.",
    icono: "flask",
    busquedaMeli: "creatina monohidrato pura 300g",
    etiquetaPromo: "Evidencia Grado A",
  },
  shaker: {
    id: "shaker",
    titulo: "Botella Mezcladora Shaker",
    subtitulo: "Anti-derrames con rejilla disolutora",
    categoria: "Hidratación",
    beneficioCientifico:
      "Garantiza una disolución óptima de aminoácidos o proteínas durante la sesión.",
    icono: "flask",
    busquedaMeli: "shaker gimnasio vaso mezclador",
  },
};

/**
 * Genera la URL de búsqueda o producto con el tag de referido
 */
export function construirEnlaceAfiliado(
  producto: ProductoAfiliado,
  plataforma: "mercadolibre" | "amazon" = "mercadolibre"
): string {
  if (producto.urlDirecta) {
    return producto.urlDirecta;
  }

  if (plataforma === "mercadolibre") {
    const encoded = encodeURIComponent(producto.busquedaMeli);
    const tag = CONFIG_AFILIADOS.tagMercadoLibre;
    // URL de búsqueda de Mercado Libre con tracking de referido
    return `https://listado.mercadolibre.com.ar/${encoded}#ref=${tag}`;
  }

  const encoded = encodeURIComponent(producto.busquedaMeli);
  const tag = CONFIG_AFILIADOS.tagAmazon;
  return `https://www.amazon.com/s?k=${encoded}&tag=${tag}`;
}

/**
 * Detecta qué equipamiento sugerir de forma hiper-contextual
 * según el nombre, patrón biomecánico o grupo muscular del ejercicio.
 */
export function obtenerEquipamientoParaEjercicio(ejercicio?: {
  nombre?: string | null;
  grupo_muscular?: string | null;
  equipo?: string | null;
  patron?: string | null;
}): ProductoAfiliado | null {
  if (!CONFIG_AFILIADOS.activo || !ejercicio) return null;

  const nombre = (ejercicio.nombre || "").toLowerCase();
  const grupo = (ejercicio.grupo_muscular || "").toLowerCase();
  const patron = (ejercicio.patron || "").toLowerCase();
  const equipo = (ejercicio.equipo || "").toLowerCase();

  // 1. Ejercicios pesados de tracción o espalda: Straps
  const esTraccionPesada =
    nombre.includes("peso muerto") ||
    nombre.includes("deadlift") ||
    nombre.includes("rdl") ||
    nombre.includes("rumano") ||
    nombre.includes("remo") ||
    nombre.includes("jalon") ||
    nombre.includes("jalón") ||
    nombre.includes("dominadas") ||
    patron.includes("traccion") ||
    patron.includes("tracción") ||
    patron.includes("bisagra");

  if (esTraccionPesada) {
    return CATALOGO_EQUIPAMIENTO.straps;
  }

  // 2. Sentadillas pesadas o cargas axiales en columna: Cinturón
  const esSentadillaPesada =
    nombre.includes("sentadilla") ||
    nombre.includes("squat") ||
    nombre.includes("prensa") ||
    nombre.includes("hack") ||
    nombre.includes("hip thrust");

  if (esSentadillaPesada) {
    return CATALOGO_EQUIPAMIENTO.cinturon;
  }

  // 3. Empujes pesados con barra o mancuerna: Muñequeras
  const esEmpujePesado =
    nombre.includes("press banca") ||
    nombre.includes("press plano") ||
    nombre.includes("press inclinado") ||
    nombre.includes("press militar") ||
    nombre.includes("press de hombro") ||
    (grupo === "pecho" && (equipo === "barra" || equipo === "mancuernas")) ||
    (grupo === "hombros" && equipo === "barra");

  if (esEmpujePesado) {
    return CATALOGO_EQUIPAMIENTO.munequeras;
  }

  // 4. Rodilleras para pierna / cuádriceps
  if (grupo === "cuadriceps" || grupo === "piernas") {
    return CATALOGO_EQUIPAMIENTO.rodilleras;
  }

  // 5. Ejercicios con barra olímpica o dominadas: Magnesio
  if (equipo === "barra" || nombre.includes("fondos") || nombre.includes("dominada")) {
    return CATALOGO_EQUIPAMIENTO.magnesio;
  }

  // Fallback por defecto: Creatina Monohidrato
  return CATALOGO_EQUIPAMIENTO.creatina;
}
