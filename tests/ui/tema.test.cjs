const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...rest) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) Module._extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};

const { SKINS_TEMA, aplicarSkin, parseTema, derivarAmbiente } = require('../../src/lib/tema.ts');
const { chequearContraste, chequearBloqueos, ratio } = require('../../src/lib/contraste.ts');
const anterior = {
  ...SKINS_TEMA[0].tema,
  navegacionMovil: 'top', navegacionDesktop: 'top', densidad: 'compact', espaciado: 'spacious', escalaFuente: 1.25,
  reposoCheckin: { activo: true, segundos: 150, mensaje: 'Bienvenidos', mostrarReloj: false, mostrarLogo: true, intensidad: 'estatico' },
  checkinFondo: { activo: true, imagenUrl: '/checkin-fondos/propio.webp', origen: 'propio', oscurecido: 72 },
};

test('Las skins preservan la distribución, las preferencias y el fondo del kiosko', () => {
  for (const { tema } of SKINS_TEMA) {
    const aplicado = aplicarSkin(anterior, tema);
    for (const key of ['navegacionMovil','navegacionDesktop','densidad','espaciado','escalaFuente','reposoCheckin','checkinFondo'])
      assert.deepEqual(aplicado[key], anterior[key]);
    assert.deepEqual(parseTema(JSON.parse(JSON.stringify(aplicado))), aplicado);
    assert.equal(aplicado.estiloVisual, tema.estiloVisual);
  }
});

test('Las skins nuevas pasan contraste y los avisos se leen en fondo y tarjetas', () => {
  for (const { key, tema } of SKINS_TEMA) {
    if (['neon','studio'].includes(key)) {
      assert.equal(chequearContraste(tema).hayFallos, false, key);
      assert.equal(chequearBloqueos(tema).bloqueado, false, key);
    }
    const vars = derivarAmbiente(tema);
    for (const color of ['--danger','--warn','--ok'])
      for (const fondo of [tema.paper, tema.paper2])
        assert.ok(ratio(vars[color],fondo) >= 4.5, `${key} ${color} ${fondo}`);
  }
});

// Ejecuta la Server Action real con auth y DB simuladas. No requiere credenciales.
let readError = null;
let payload = null;
const invalidaciones = [];
const originalLoad = Module._load;
Module._load = function(name, ...rest) {
  if (name === 'next/cache') return { revalidatePath: (...args) => invalidaciones.push(args) };
  if (name === '@/lib/auth') return { requireDueno: async () => ({ gimnasio_id: 'gym-1' }) };
  if (name === '@/lib/supabase/server') return { createClient: async () => ({
    from(table) {
      assert.equal(table, 'gimnasios');
      return {
        select: () => ({ eq: (_, id) => { assert.equal(id,'gym-1'); return { single: async () => ({data: {tema: anterior},error:readError}) }; } }),
        update: (data) => { payload=data; return {eq: async (_, id) => { assert.equal(id,'gym-1'); return {error:null}; }}; },
      };
    },
  }) };
  if (name.startsWith('@/lib/') && !['@/lib/tema','@/lib/contraste'].includes(name)) return {};
  return originalLoad.call(this, name, ...rest);
};
const { actualizarTema } = require('../../src/app/panel/ajustes/actions.ts');
function form() {
  const data = new FormData();
  for (const [key,value] of Object.entries(SKINS_TEMA[1].tema)) if (typeof value !== 'object') data.set(key,String(value));
  data.set('gimnasio_id','gym-1');
  return data;
}

test('Guardar una skin conserva el fondo y reposo del check-in', async () => {
  payload=null;
  const result=await actualizarTema({},form());
  assert.ok(result.ok,JSON.stringify(result));
  assert.deepEqual(payload.tema.checkinFondo,anterior.checkinFondo);
  assert.deepEqual(payload.tema.reposoCheckin,anterior.reposoCheckin);
  assert.equal(payload.tema.estiloVisual,'estudio');
  assert.ok(invalidaciones.length>0);
});

test('Si no se puede leer el tema anterior, no se guarda ni se resetea el kiosko', async () => {
  readError={message:'Lectura fallida'};
  payload=null;
  const result=await actualizarTema({},form());
  assert.ok(result.error);
  assert.equal(payload,null);
  readError=null;
});
