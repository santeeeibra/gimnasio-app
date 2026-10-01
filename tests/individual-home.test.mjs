import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function loadComponent(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/") || name.startsWith("./")) return {};
    return require(name);
  }, exports);
  return exports;
}

function loadPanel(gym, error = null, role = "dueno") {
  const consultas = [];
  const Individual = Symbol("InicioIndividual");
  const panel = loadComponent("src/app/panel/page.tsx", {
    "@/lib/auth": { requireStaffODueno: async () => ({ rol: role, gimnasio_id: "espacio-propio", nombre: "Santi" }) },
    "@/lib/supabase/server": { createClient: async () => ({ from(table) {
      consultas.push(table);
      assert.equal(table, "gimnasios", "no consultar clientes/caja/cupos antes de resolver el tipo de cuenta");
      return { select(columns) {
        assert.ok(columns.includes("tipo_cuenta"));
        return { eq(field, value) {
          assert.equal(field, "id"); assert.equal(value, "espacio-propio");
          return { single: async () => ({ data: gym, error }) };
        } };
      } };
    } }) },
    "@/lib/supabase/admin": { createAdminClient() { throw new Error("flujo-gimnasio"); } },
    "@/components/mi/inicio-individual": { InicioIndividual: Individual },
  });
  return { run: panel.default, consultas, Individual };
}

test("cuenta personal con rol dueño muestra entrenamiento y evita consultas de recepción", async () => {
  const fixture = loadPanel({ tipo_cuenta: "individual", nombre: "Santi", estado: "prueba" });
  const element = await fixture.run();
  assert.equal(element.type, fixture.Individual);
  assert.equal(element.props.nombre, "Santi");
  assert.deepEqual(fixture.consultas, ["gimnasios"]);
});

test("gimnasios y negocios mantienen su tablero operativo, incluyendo staff", async () => {
  for (const tipo_cuenta of ["gym", "negocio_liviano"]) {
    for (const role of ["dueno", "staff"]) {
      const fixture = loadPanel({ tipo_cuenta }, null, role);
      await assert.rejects(fixture.run(), /flujo-gimnasio/);
    }
  }
});

test("una consulta de cuenta fallida no cae por defecto al tablero de dueño", async () => {
  for (const [gym, error] of [[null, null], [null, { message: "sin conexión" }]]) {
    await assert.rejects(loadPanel(gym, error).run(), /No se pudo cargar tu cuenta/);
  }
});

test("un enlace anterior a /mi también muestra el inicio individual", async () => {
  const Individual = Symbol("InicioIndividual");
  const tables = [];
  const { default: MiPage } = loadComponent("src/app/mi/page.tsx", {
    "@/lib/auth": { requireProfile: async () => ({ id: "propio", gimnasio_id: "personal", nombre: "Santi", rol: "dueno" }) },
    "@/components/mi/inicio-individual": { InicioIndividual: Individual },
    "@/lib/supabase/server": { createClient: async () => ({ from(table) {
      tables.push(table);
      assert.ok(["gimnasios", "clientes", "mensaje_destinatarios"].includes(table));
      const result = { data: table === "gimnasios" ? { tipo_cuenta: "individual" } : { id: "ficha" }, count: 0 };
      const query = {
        select: () => query, eq: () => query,
        single: async () => result, maybeSingle: async () => result,
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    } }) },
  });
  assert.equal((await MiPage()).type, Individual);
  assert.equal(tables.length, 3);
});

test("inicio individual ofrece Rutina y Peso sin cupos, cobros ni check-in", () => {
  const { InicioIndividual } = loadComponent("src/components/mi/inicio-individual.tsx", {
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "@/components/mascota/pulpo": { Pulpo: () => null },
    "@/components/pwa/boton-instalar-app": { BotonInstalarApp: () => null },
    "@/lib/ui/hapticos": { hapticoSeleccion: () => {} },
  });
  const html = renderToStaticMarkup(React.createElement(InicioIndividual, { nombre: "Santi Gutierrez" }));
  assert.match(html, /Cuenta personal/);
  assert.match(html, /href="\/mi\/rutina"/);
  assert.match(html, /href="\/mi\/peso"/);
  assert.doesNotMatch(html, /Cobrar|Socios|Check-in|cupos|Caja|Mostrador/i);
});
