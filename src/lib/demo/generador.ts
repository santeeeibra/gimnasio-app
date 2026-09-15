// Generadores de datos random para el modo demo (mostrar flujos en vivo).
// Sin dependencias externas: todo es Math.random() + listas fijas.

const NOMBRES_H = ["Tomás", "Lautaro", "Franco", "Nahuel", "Agustín", "Gonzalo", "Facundo", "Julián"];
const NOMBRES_M = ["Sofía", "Valentina", "Camila", "Julieta", "Micaela", "Florencia", "Antonella", "Rocío"];
const APELLIDOS = ["Gómez", "Díaz", "Romero", "Torres", "Flores", "Benítez", "Aguirre", "Medina", "Sosa", "Rojas"];

export type SexoDemo = "hombre" | "mujer";

export function nombreRandom(): { nombre: string; sexo: SexoDemo } {
  const sexo: SexoDemo = Math.random() > 0.5 ? "hombre" : "mujer";
  const pool = sexo === "hombre" ? NOMBRES_H : NOMBRES_M;
  const nombre = `${pool[Math.floor(Math.random() * pool.length)]} ${
    APELLIDOS[Math.floor(Math.random() * APELLIDOS.length)]
  } (demo)`;
  return { nombre, sexo };
}

// DNI random en rango 90.000.000+ para no chocar nunca con datos reales/seed.
export function dniRandom(): string {
  return String(90_000_000 + Math.floor(Math.random() * 9_000_000));
}

export function telefonoRandom(): string {
  return `291-4${Math.floor(100000 + Math.random() * 900000)}`;
}

export function pick<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

const MENSAJES_DEMO = [
  "¡Este finde hay clase abierta de funcional a las 10hs! Los esperamos 💪",
  "Recordatorio: el próximo lunes es feriado, abrimos en horario reducido.",
  "Llegaron mancuernas nuevas hasta 40kg. Ya están en el sector de pesas libres.",
  "¿Cómo veníamos con los objetivos del mes? Cualquier ajuste en la rutina, avisen.",
];

export function mensajeRandom(): string {
  return pick(MENSAJES_DEMO);
}
