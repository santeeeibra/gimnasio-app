import assert from "node:assert/strict";
import test from "node:test";
import { consultarHistorial } from "../src/lib/progreso/consultar-historial.ts";

test("historial usa GET independiente, sin caché HTTP y con tiempo límite", async (t) => {
  const registros = [{ id: "registro", fecha: "2026-09-30", peso: 20, reps: 12 }];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/rutina/progreso?ejercicio=ejercicio&cliente=socio");
    assert.equal(options.method, undefined); // GET predeterminado
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(registros);
  });
  assert.deepEqual(await consultarHistorial("ejercicio", "socio"), registros);
});

test("un fallo permite reintentar y no se guarda como historial vacío", async (t) => {
  let intentos = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "/api/rutina/progreso?ejercicio=ejercicio");
    return ++intentos === 1 ? new Response(null, { status: 503 }) : Response.json([]);
  });
  await assert.rejects(consultarHistorial("ejercicio"));
  assert.deepEqual(await consultarHistorial("ejercicio"), []);
  assert.equal(intentos, 2);
});

test("redirigir a login no se interpreta como datos y la consulta se cancela a los 8s", async (t) => {
  t.mock.method(AbortSignal, "timeout", (ms) => {
    assert.equal(ms, 8000);
    return AbortSignal.abort(new DOMException("Tiempo agotado", "TimeoutError"));
  });
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    options.signal.throwIfAborted();
  });
  await assert.rejects(consultarHistorial("ejercicio"), { name: "TimeoutError" });
  t.mock.method(globalThis, "fetch", async () => new Response("login", {
    headers: { "Content-Type": "text/html" },
  }));
  await assert.rejects(consultarHistorial("ejercicio"), /No se pudo cargar/);
});
