"use server";

// Simulador del motor de rutinas (solo superadmin). Llama a generarPlan() con
// `debug: true` y devuelve todo EN MEMORIA: no toca `rutinas` ni `rutina_items`,
// no usa generarYGuardar(). Sirve para probar combinaciones sin crear un socio.

import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarPlan } from "@/lib/rutina/motor";
import { TEORIA, type ClaveTeoria } from "@/lib/rutina/teoria";
import {
  ENFASIS,
  ENFASIS_LABEL,
  MAX_ENFASIS,
  MOLESTIAS,
  MOLESTIA_LABEL,
  NIVELES,
  NIVEL_LABEL,
  OBJETIVOS,
  OBJETIVO_AYUDA,
  OBJETIVO_LABEL,
  ORDENES,
  ORDEN_LABEL,
  PREFERENCIAS_EQUIPO,
  PREFERENCIA_EQUIPO_LABEL,
  RANGOS,
  RANGO_LABEL,
  RIR_LABEL,
  RIR_OPCIONES,
  SEXOS,
  SEXO_LABEL,
  SPLITS,
  SPLIT_LABEL,
  TECNICAS,
  TECNICA_LABEL,
  VOLUMENES,
  VOLUMEN_LABEL,
  type Ejercicio,
  type Enfasis,
  type EntradaMotor,
  type Molestia,
  type Nivel,
  type Objetivo,
  type OpcionesAvanzadas,
  type PreferenciaEquipo,
  type Sexo,
  type Tecnica,
} from "@/lib/rutina/tipos";

export type ItemSim = {
  nombre: string;
  grupo: string;
  equipo: string;
  series: number;
  reps: string;
  rol: string;
  nota: string;
  tecnica?: string;
};

export type SimState = {
  error?: string;
  combinacion?: string[];
  porque?: { titulo: string; resumen: string; fuente: string }[];
  trace?: string[];
  dias?: { titulo: string; items: ItemSim[] }[];
};

function pick<T extends string>(
  fd: FormData,
  key: string,
  allowed: readonly T[],
  def: T,
): T {
  const v = String(fd.get(key) ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : def;
}

function parseAvanzado(fd: FormData): OpcionesAvanzadas {
  const tec = String(fd.get("tecnicaAislamientos") ?? "ninguna");
  return {
    split: pick(fd, "split", SPLITS, "auto"),
    rango: pick(fd, "rango", RANGOS, "estandar"),
    volumen: pick(fd, "volumen", VOLUMENES, "estandar"),
    rir: pick(fd, "rir", RIR_OPCIONES, "2-3"),
    orden: pick(fd, "orden", ORDENES, "compuestos_primero"),
    tecnicaAislamientos: (TECNICAS as readonly string[]).includes(tec)
      ? (tec as Tecnica)
      : "ninguna",
    evitar: fd
      .getAll("evitar")
      .map(String)
      .filter((v): v is Molestia => (MOLESTIAS as readonly string[]).includes(v)),
  };
}

// Los mismos "¿por qué?" que muestra el form real (generar-form.tsx), pero solo
// para los controles avanzados que el simulador dejó en un valor no-default.
// Se lee de TEORIA, no se reescribe el texto.
function porqueAvanzado(av: OpcionesAvanzadas): ClaveTeoria[] {
  const claves: ClaveTeoria[] = ["frecuencia"];
  if (av.rango !== "estandar") claves.push("dup");
  if (av.volumen !== "estandar") claves.push("volumen");
  if (av.rir !== "2-3") claves.push("rir");
  if (av.orden !== "compuestos_primero") claves.push("orden");
  if (av.tecnicaAislamientos !== "ninguna") claves.push("tecnicas");
  if (av.evitar.length > 0) claves.push("molestia");
  return claves;
}

export async function simularRutina(
  _prev: SimState,
  fd: FormData,
): Promise<SimState> {
  await requireSuperadmin();

  const objetivo = pick(fd, "objetivo", OBJETIVOS, "hipertrofia") as Objetivo;
  const nivel = pick(fd, "nivel", NIVELES, "principiante") as Nivel;
  const sexo = pick(fd, "sexo", SEXOS, "sin_especificar") as Sexo;
  const preferencia = pick(
    fd,
    "preferencia",
    Object.keys(PREFERENCIAS_EQUIPO) as PreferenciaEquipo[],
    "gimnasio",
  );
  const dias = Math.min(6, Math.max(2, Number(fd.get("dias") ?? 3) || 3));
  const enfasis = fd
    .getAll("enfasis")
    .map(String)
    .filter((v): v is Enfasis => (ENFASIS as readonly string[]).includes(v))
    .slice(0, MAX_ENFASIS);
  const zonasDolor = fd
    .getAll("zonasDolor")
    .map(String)
    .filter((v): v is Molestia => (MOLESTIAS as readonly string[]).includes(v));
  const avanzado = nivel === "avanzado" ? parseAvanzado(fd) : undefined;

  const entrada: EntradaMotor = {
    objetivo,
    dias,
    nivel,
    preferencia,
    sexo,
    enfasis,
    zonasDolor,
    avanzado,
    debug: true,
  };

  // Lectura con service_role: el gimnasio del superadmin está vacío y la tabla
  // `ejercicios` es global. No se escribe nada.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ejercicios")
    .select(
      "id, slug, nombre, grupo_muscular, patron, equipo, nivel, imagen_url, descripcion",
    );
  if (error) return { error: `No se pudieron leer los ejercicios: ${error.message}` };
  const ejercicios = (data ?? []) as Ejercicio[];
  if (ejercicios.length === 0) {
    return { error: "La base de ejercicios está vacía. Corré el seed." };
  }

  const plan = generarPlan(entrada, ejercicios);
  const porSlug = new Map(ejercicios.filter((e) => e.slug).map((e) => [e.slug!, e]));

  const combinacion = [
    `Objetivo: ${OBJETIVO_LABEL[objetivo]} — ${OBJETIVO_AYUDA[objetivo]}`,
    `Días: ${dias}`,
    `Nivel: ${NIVEL_LABEL[nivel]}`,
    `Zona a enfocar: ${
      enfasis.length ? enfasis.map((e) => ENFASIS_LABEL[e]).join(", ") : "—"
    }`,
    `Evitar dolor en: ${
      zonasDolor.length ? zonasDolor.map((m) => MOLESTIA_LABEL[m]).join(", ") : "—"
    }`,
    `Equipo: ${PREFERENCIA_EQUIPO_LABEL[preferencia]}`,
    `Sexo: ${SEXO_LABEL[sexo]}`,
  ];
  if (avanzado) {
    combinacion.push(
      `(avanzado) Estructura: ${SPLIT_LABEL[avanzado.split]}`,
      `(avanzado) Repeticiones: ${RANGO_LABEL[avanzado.rango]}`,
      `(avanzado) Volumen semanal: ${VOLUMEN_LABEL[avanzado.volumen]}`,
      `(avanzado) Esfuerzo: ${RIR_LABEL[avanzado.rir]}`,
      `(avanzado) Orden: ${ORDEN_LABEL[avanzado.orden]}`,
      `(avanzado) Técnica aislamientos: ${TECNICA_LABEL[avanzado.tecnicaAislamientos]}`,
      `(avanzado) Molestias a evitar: ${
        avanzado.evitar.length
          ? avanzado.evitar.map((m) => MOLESTIA_LABEL[m]).join(", ")
          : "—"
      }`,
    );
  }

  const porque = (avanzado ? porqueAvanzado(avanzado) : []).map((k) => TEORIA[k]);
  if (sexo === "mujer") porque.push(TEORIA.sexo_mujer);

  const diasSim = plan.dias.map((d) => ({
    titulo: d.titulo,
    items: d.items.map((it) => {
      const ej = porSlug.get(it.ejercicio_slug);
      return {
        nombre: ej?.nombre ?? it.ejercicio_slug,
        grupo: ej?.grupo_muscular ?? "—",
        equipo: ej?.equipo ?? "—",
        series: it.series,
        reps: it.repeticiones,
        rol: it.rol ?? "—",
        nota: it.nota,
        tecnica:
          it.tecnica && it.tecnica !== "ninguna"
            ? TECNICA_LABEL[it.tecnica]
            : undefined,
      };
    }),
  }));

  return { combinacion, porque, trace: plan.trace ?? [], dias: diasSim };
}
