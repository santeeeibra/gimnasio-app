// scripts/test-torniquete.ts
// Pruebas de la lógica pura del backend del torniquete (dispositivos +
// comandos). Cero red, cero DB: valida token válido/inválido/revocado,
// comando vencido, doble consulta y doble confirmación.

import {
  comandoVencido,
  debeEmitirTorniquete,
  debeEncolarComando,
  elegirComandoAEntregar,
  generarTokenDispositivo,
  hashearToken,
  puedeConfirmar,
  resolverConfirmacion,
  tokenCoincide,
  verificarAutenticacionDispositivo,
  type ComandoPendiente,
} from "../src/lib/torniquete/decision";

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

console.log(`\n${CIAN}=== TEST: backend del torniquete ===${RESET}\n`);

// 1. Token válido
{
  const tokenPlano = generarTokenDispositivo();
  const hash = hashearToken(tokenPlano);
  assert(tokenCoincide(tokenPlano, hash), "token correcto: coincide con su hash");

  const r = verificarAutenticacionDispositivo(tokenPlano, { tokenHash: hash, revocadoEn: null });
  assert(r.autenticado === true, "token válido + dispositivo activo: autenticado");
}

// 2. Token inválido (no matchea ningún dispositivo, o hash distinto)
{
  const tokenPlano = generarTokenDispositivo();
  const hashDeOtroDispositivo = hashearToken(generarTokenDispositivo());
  assert(!tokenCoincide(tokenPlano, hashDeOtroDispositivo), "token ajeno: no coincide");

  const rSinDispositivo = verificarAutenticacionDispositivo(tokenPlano, null);
  assert(
    !rSinDispositivo.autenticado && rSinDispositivo.motivo === "token_invalido",
    "sin dispositivo encontrado por ese hash: token_invalido",
  );

  const rHashDistinto = verificarAutenticacionDispositivo(tokenPlano, {
    tokenHash: hashDeOtroDispositivo,
    revocadoEn: null,
  });
  assert(
    !rHashDistinto.autenticado && rHashDistinto.motivo === "token_invalido",
    "token que no matchea el hash guardado: token_invalido",
  );
}

// 3. Token revocado
{
  const tokenPlano = generarTokenDispositivo();
  const hash = hashearToken(tokenPlano);
  const r = verificarAutenticacionDispositivo(tokenPlano, {
    tokenHash: hash,
    revocadoEn: new Date().toISOString(),
  });
  assert(
    !r.autenticado && r.motivo === "dispositivo_revocado",
    "token correcto pero dispositivo revocado: dispositivo_revocado (no token_invalido)",
  );
}

// 4. Comando vencido
{
  const ahora = new Date("2026-01-01T00:00:00.000Z");
  const vencido: ComandoPendiente = {
    id: "c1",
    estado: "pendiente",
    creadoEn: "2025-12-31T23:59:30.000Z",
    venceEn: "2025-12-31T23:59:50.000Z", // venció 10s antes de "ahora"
  };
  const vigente: ComandoPendiente = {
    id: "c2",
    estado: "pendiente",
    creadoEn: "2025-12-31T23:59:55.000Z",
    venceEn: "2026-01-01T00:00:15.000Z",
  };
  assert(comandoVencido(vencido, ahora), "comando con vence_en pasado: vencido");
  assert(!comandoVencido(vigente, ahora), "comando con vence_en futuro: no vencido");
  assert(
    elegirComandoAEntregar([vencido, vigente], ahora)?.id === "c2",
    "al elegir, un comando vencido se descarta aunque sea más viejo",
  );
  assert(
    elegirComandoAEntregar([vencido], ahora) === null,
    "si el único candidato está vencido, no hay nada para entregar",
  );
}

// 5. Doble consulta: el segundo poll no debe recibir el mismo comando
{
  const ahora = new Date("2026-01-01T00:00:00.000Z");
  const comandos: ComandoPendiente[] = [
    { id: "c1", estado: "pendiente", creadoEn: "2025-12-31T23:59:58.000Z", venceEn: "2026-01-01T00:00:18.000Z" },
  ];

  const primeraEntrega = elegirComandoAEntregar(comandos, ahora);
  assert(primeraEntrega?.id === "c1", "primera consulta: retira el comando pendiente");

  // Simula lo que hace torniquete_entregar_comando en SQL tras la entrega.
  const comandosLuegoDeEntregar = comandos.map((c) =>
    c.id === primeraEntrega?.id ? { ...c, estado: "entregado" as const } : c,
  );
  const segundaEntrega = elegirComandoAEntregar(comandosLuegoDeEntregar, ahora);
  assert(segundaEntrega === null, "segunda consulta inmediata: no hay nada más para entregar");
}

// 6. Doble confirmación: debe ser inofensiva, no un error
{
  const dispositivoId = "disp-1";
  const entregado = { estado: "entregado" as const, entregadoA: dispositivoId };

  const primeraConfirmacion = puedeConfirmar(entregado, dispositivoId);
  assert(primeraConfirmacion.ok === true, "primera confirmación: aceptada");

  // Tras confirmar, el estado pasa a 'confirmado' (lo hace el UPDATE real).
  const confirmado = { estado: "confirmado" as const, entregadoA: dispositivoId };
  const segundaConfirmacion = puedeConfirmar(confirmado, dispositivoId);
  assert(
    segundaConfirmacion.ok === true,
    "reintento de confirmación del mismo dispositivo: sigue siendo aceptada (idempotente)",
  );

  const confirmacionDeOtroDispositivo = puedeConfirmar(confirmado, "disp-2");
  assert(
    !confirmacionDeOtroDispositivo.ok && confirmacionDeOtroDispositivo.motivo === "dispositivo_incorrecto",
    "confirmación de un dispositivo distinto al que lo retiró: rechazada",
  );

  const nuncaEntregado = { estado: "pendiente" as const, entregadoA: null };
  const confirmacionSinEntrega = puedeConfirmar(nuncaEntregado, dispositivoId);
  assert(
    !confirmacionSinEntrega.ok && confirmacionSinEntrega.motivo === "no_entregado",
    "confirmar un comando que nunca se entregó: rechazada",
  );
}

// 7. Sincronización offline: marcarIngresosLote nunca debe emitir al torniquete
{
  assert(debeEmitirTorniquete("vivo") === true, "check-in en vivo: sí emite comando al torniquete");
  assert(
    debeEmitirTorniquete("sincronizacion_offline") === false,
    "sincronización offline (marcarIngresosLote): NUNCA emite comando al torniquete",
  );
}

// 8. Gimnasio sin dispositivo activo: no se debe encolar el comando
{
  assert(
    debeEncolarComando(true) === true,
    "gimnasio con dispositivo activo y no revocado: sí encola el comando",
  );
  assert(
    debeEncolarComando(false) === false,
    "gimnasio sin dispositivo activo (ninguno dado de alta, o todos revocados): NO encola el comando",
  );
}

// 9. Confirmación repetida con valores distintos: no debe pisar lo ya registrado
{
  const dispositivoId = "disp-1";
  const entregado = { estado: "entregado" as const, entregadoA: dispositivoId };

  const primera = resolverConfirmacion(entregado, dispositivoId, {
    giroDetectado: true,
    cerrado: true,
  });
  assert(
    primera.ok === true && primera.actualizar === true && primera.valores.giroDetectado === true,
    "primera confirmación (giro=true, cerrado=true): se debe escribir con esos valores",
  );

  // El comando ya quedó 'confirmado' tras la primera. El reintento llega con
  // valores DISTINTOS (p.ej. una lectura de sensor con ruido) — no debe
  // poder pisar el resultado real ya guardado.
  const confirmado = { estado: "confirmado" as const, entregadoA: dispositivoId };
  const reintentoConValoresDistintos = resolverConfirmacion(confirmado, dispositivoId, {
    giroDetectado: false,
    cerrado: false,
  });
  assert(
    reintentoConValoresDistintos.ok === true && reintentoConValoresDistintos.actualizar === false,
    "reintento con giro=false, cerrado=false sobre un comando ya confirmado: ok, pero SIN actualizar nada",
  );
}

console.log(`\n${CIAN}=== RESULTADO ===${RESET}`);
console.log(`${VERDE}${aciertos} OK${RESET} / ${ROJO}${fallos} fallidos${RESET}\n`);

process.exit(fallos > 0 ? 1 : 0);
