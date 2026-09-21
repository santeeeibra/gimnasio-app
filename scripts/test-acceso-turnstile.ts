// scripts/test-acceso-turnstile.ts
// Pruebas de la lógica pura de decisión de acceso (torniquete / check-in).
// Cero red, cero DB: valida los 4 casos pedidos para feat/turnstile-access-decisions.

import { decidirAcceso } from "../src/lib/acceso/decision";

const VERDE = "\x1b[32m";
const ROJO = "\x1b[31m";
const CIAN = "\x1b[36m";
const RESET = "\x1b[0m";

let fallos = 0;
let aciertos = 0;

function assert(cond: boolean, desc: string) {
  if (cond) {
    console.log(`  ${VERDE}✔${RESET} ${desc}`);
    aciertos++;
  } else {
    console.log(`  ${ROJO}✖ FALLÓ:${RESET} ${desc}`);
    fallos++;
  }
}

console.log(`\n${CIAN}=== TEST: decisiones de acceso (torniquete) ===${RESET}\n`);

// 1. Socio habilitado -> abrir entrada
{
  const r = decidirAcceso({
    socioEncontrado: true,
    enPrueba: false,
    pruebaVencida: false,
    estadoCuota: "al_dia",
  });
  assert(r.habilitado === true, "socio con cuota al día: habilitado");
  assert(r.motivo === "ok", "socio con cuota al día: motivo ok");
  assert(r.registrarAsistencia === true, "socio con cuota al día: registra asistencia");
}

// 2. Cuota vencida -> bloquear, sin registrar asistencia
{
  const r = decidirAcceso({
    socioEncontrado: true,
    enPrueba: false,
    pruebaVencida: false,
    estadoCuota: "vencido",
  });
  assert(r.habilitado === false, "cuota vencida: bloqueado");
  assert(r.motivo === "cuota_vencida", "cuota vencida: motivo cuota_vencida");
  assert(r.registrarAsistencia === false, "cuota vencida: NO registra asistencia");
}

// 3. Prueba vencida -> bloquear, sin registrar asistencia
{
  const r = decidirAcceso({
    socioEncontrado: true,
    enPrueba: true,
    pruebaVencida: true,
    estadoCuota: null,
  });
  assert(r.habilitado === false, "prueba vencida: bloqueado");
  assert(r.motivo === "prueba_vencida", "prueba vencida: motivo prueba_vencida");
  assert(r.registrarAsistencia === false, "prueba vencida: NO registra asistencia");
}

// 4. DNI inexistente -> bloquear, sin registrar asistencia
{
  const r = decidirAcceso({
    socioEncontrado: false,
    enPrueba: false,
    pruebaVencida: false,
    estadoCuota: null,
  });
  assert(r.habilitado === false, "DNI inexistente: bloqueado");
  assert(r.motivo === "no_encontrado", "DNI inexistente: motivo no_encontrado");
  assert(r.registrarAsistencia === false, "DNI inexistente: NO registra asistencia");
}

console.log(`\n${CIAN}=== RESULTADO ===${RESET}`);
console.log(`${VERDE}${aciertos} OK${RESET} / ${ROJO}${fallos} fallidos${RESET}\n`);

process.exit(fallos > 0 ? 1 : 0);
