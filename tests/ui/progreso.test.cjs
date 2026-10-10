const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...rest) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, parent, ...rest);
};
Module._extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
}).outputText, filename);
let env;
const load = Module._load;
Module._load = function(name, ...rest) {
  if (name === '@/lib/auth') return { requireProfile: async () => { env.auth++; return { id: 'perfil-real' }; } };
  if (name === '@/lib/supabase/server') return { createClient: async () => env.db };
  if (name === 'next/cache') return { revalidatePath: () => env.refresh++ };
  if (name === 'next/server') return { after: cb => env.after.push(cb) };
  return load.call(this, name, ...rest);
};
const { guardarProgresoCliente } = require('../../src/lib/progreso/actions.ts');
function setup(opts = {}) {
  env = { auth: 0, refresh: 0, after: [], calls: [], ...opts };
  env.db = { from(table) {
    const q = { table, filters: [], operation: 'read',
      select() { return this; }, eq(...f) { this.filters.push(f); return this; },
      order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
      upsert(payload, options) { this.operation = 'write'; this.payload = payload; this.options = options; return this; },
      then(resolve, reject) {
        env.calls.push(this);
        let result;
        if (table === 'clientes') result = { data: { id: 'cliente-real', gimnasio_id: 'gym-real' } };
        else if (table === 'registro_progreso' && this.operation === 'write') result = env.write ?? { error: null };
        else if (table === 'registro_progreso') result = env.history ?? { data: [{ peso: 50, fecha: '2020-01-01' }] };
        else if (table === 'ejercicios') result = { data: { nombre: 'Sentadilla' } };
        else result = { error: null };
        return Promise.resolve(result).then(resolve, reject);
      },
    }; return q;
  } };
  return env;
}
function form(peso = '60') { const fd = new FormData(); fd.set('ejercicio_id','sentadilla'); fd.set('peso',peso); fd.set('reps','10'); fd.set('cliente_id','intruso'); return fd; }
function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }

test('El guardado confirma la escritura sin esperar el feed ni refrescar la rutina', async () => {
  const e = setup();
  const result = await guardarProgresoCliente({}, form());
  assert.equal(result.ok, '✓'); assert.equal(result.record.esRecord, true);
  assert.equal(e.auth, 1); assert.equal(e.refresh, 0);
  assert.deepEqual(e.calls.map(c => c.table), ['clientes','registro_progreso','registro_progreso']);
  const write = e.calls.find(c => c.operation === 'write');
  assert.equal(write.payload.cliente_id, 'cliente-real'); assert.equal(write.payload.gimnasio_id, 'gym-real');
  assert.equal(write.payload.peso,60); assert.equal(write.payload.reps,10);
  assert.equal(e.after.length,1);
  await e.after[0]();
  assert.equal(e.auth,1); assert.equal(e.calls.at(-1).table,'logros_gimnasio');
  assert.equal(e.calls.at(-1).payload.cliente_id,'cliente-real');
});
test('Historial y escritura empiezan juntos; no hay éxito antes de persistir', async () => {
  const write = deferred(), history = deferred();
  const e = setup({ write: write.promise, history: history.promise });
  let completed = false;
  const action = guardarProgresoCliente({}, form()).then(r => { completed = true; return r; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(e.calls.filter(c => c.table === 'registro_progreso').length,2);
  history.resolve({ data: [] });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(completed,false);
  write.resolve({ error: null }); assert.equal((await action).ok,'✓');
});
test('Un error de escritura no confirma ni publica logros', async () => {
  const e = setup({ write: { error: { message: 'RLS' } } });
  const r = await guardarProgresoCliente({}, form());
  assert.ok(r.error); assert.equal(r.ok,undefined); assert.equal(e.after.length,0);
});
test('La detección fallida de récord no impide guardar el peso', async () => {
  setup({ history: Promise.reject(new Error('sin historial')) });
  const r = await guardarProgresoCliente({}, form()); assert.equal(r.ok,'✓'); assert.equal(r.record,undefined);
});
test('Pesos no numéricos se rechazan sin escribir', async () => {
  const e = setup(); const r = await guardarProgresoCliente({}, form('NaN'));
  assert.ok(r.error); assert.equal(e.calls.some(c => c.operation === 'write'),false);
});
