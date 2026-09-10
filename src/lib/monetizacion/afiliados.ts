// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Afiliados y Equipamiento Biomecánico — SysGym
// Solo se activa con enlaces reales verificados (Mercado Libre /sec/ o directos)
// y NUNCA se muestra como publicidad invasiva.
// ─────────────────────────────────────────────────────────────────────────────

export type TipoEquipamiento =
  | "straps"
  | "cinturon"
  | "munequeras"
  | "rodilleras";

export type ProductoAfiliado = {
  id: TipoEquipamiento;
  titulo: string;
  subtitulo: string;
  explicacionBiomecanica: string;
  icono: "straps" | "shield" | "wrist";
  /**
   * URL real generada desde el panel de Mercado Libre Afiliados (ej: https://mercadolibre.com/sec/...)
   * Si está vacía, el componente NO se renderiza para evitar enlaces rotos o inútiles.
   */
  urlDirecta?: string;
};

/**
 * Control global del módulo.
 * Permanece APAGADO por defecto hasta que el desarrollador configure
 * sus links oficiales de Mercado Libre Afiliados.
 */
export const CONFIG_AFILIADOS = {
  // Solo se activa si está explícitamente encendido y configurado en el entorno
  activo: process.env.NEXT_PUBLIC_HABILITAR_AFILIADOS === "true",
};

/**
 * Catálogo curado: únicamente equipamiento con justificación biomecánica directa.
 */
export const CATALOGO_EQUIPAMIENTO: Record<TipoEquipamiento, ProductoAfiliado> = {
  straps: {
    id: "straps",
    titulo: "Straps de agarre",
    subtitulo: "Soporte para series pesadas de tracción",
    explicacionBiomecanica:
      "Evita que la fatiga prematura del antebrazo limite el estímulo sobre la espalda o isquios.",
    icono: "straps",
    urlDirecta: process.env.NEXT_PUBLIC_MELI_URL_STRAPS || "",
  },
  cinturon: {
    id: "cinturon",
    titulo: "Cinturón de levantamiento",
    subtitulo: "Soporte de presión intra-abdominal",
    explicacionBiomecanica:
      "Ayuda en la maniobra de Valsalva para estabilizar el core en cargas axiales máximas.",
    icono: "shield",
    urlDirecta: process.env.NEXT_PUBLIC_MELI_URL_CINTURON || "",
  },
  munequeras: {
    id: "munequeras",
    titulo: "Muñequeras rígidas",
    subtitulo: "Estabilidad articular en empujes",
    explicacionBiomecanica:
      "Mantiene la articulación en neutro para evitar hiperextensión dolorosa bajo la barra.",
    icono: "wrist",
    urlDirecta: process.env.NEXT_PUBLIC_MELI_URL_MUNEQUERAS || "",
  },
  rodilleras: {
    id: "rodilleras",
    titulo: "Rodilleras de neopreno 7mm",
    subtitulo: "Compresión y calor articular",
    explicacionBiomecanica:
      "Aporta estabilidad propioceptiva en flexión profunda de rodilla.",
    icono: "shield",
    urlDirecta: process.env.NEXT_PUBLIC_MELI_URL_RODILLERAS || "",
  },
};

/**
 * Sugerencia quirúrgica:
 * SOLO sugiere si el ejercicio es un compuesto muy pesado específico.
 * En el resto de los casos devuelve NULL (cero spam).
 */
export function obtenerEquipamientoParaEjercicio(ejercicio?: {
  nombre?: string | null;
  grupo_muscular?: string | null;
  equipo?: string | null;
  patron?: string | null;
}): ProductoAfiliado | null {
  // Si la feature flag está apagada, no devuelve nada
  if (!CONFIG_AFILIADOS.activo || !ejercicio) return null;

  const nombre = (ejercicio.nombre || "").toLowerCase();
  const equipo = (ejercicio.equipo || "").toLowerCase();

  // 1. Tracciones pesadas con barra/mancuerna donde el agarre falla antes: Straps
  const esTraccionPesada =
    nombre.includes("peso muerto") ||
    nombre.includes("deadlift") ||
    nombre.includes("rdl") ||
    nombre.includes("rumano") ||
    (nombre.includes("remo con barra") && equipo === "barra") ||
    nombre.includes("rack pull");

  if (esTraccionPesada) {
    const prod = CATALOGO_EQUIPAMIENTO.straps;
    return prod.urlDirecta ? prod : null;
  }

  // 2. Sentadillas axiales pesadas: Cinturón
  const esSentadillaAxialPesada =
    nombre.includes("sentadilla trasera") ||
    nombre.includes("sentadilla libre") ||
    nombre.includes("back squat") ||
    nombre.includes("hack squat") ||
    nombre.includes("prensa 45");

  if (esSentadillaAxialPesada) {
    const prod = CATALOGO_EQUIPAMIENTO.cinturon;
    return prod.urlDirecta ? prod : null;
  }

  // 3. Empujes máximos con barra: Muñequeras
  const esEmpujeMaximo =
    (nombre.includes("press banca") && equipo === "barra") ||
    (nombre.includes("press militar") && equipo === "barra");

  if (esEmpujeMaximo) {
    const prod = CATALOGO_EQUIPAMIENTO.munequeras;
    return prod.urlDirecta ? prod : null;
  }

  // En cualquier otro caso: NO mostrar nada
  return null;
}
