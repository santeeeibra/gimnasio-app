import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditRoutes, routeMatches, scanSource } from "../scripts/check-routes.mjs";

test("detecta enlaces rotos en navegación de distintos roles y redirects", () => {
  const code = `const individual = [{href: '/mi/peso'}];
    const gym = [{href: '/panel/clientes'}];
    router.push('/mi/falta'); redirect('/login');
    const jsx = <Link href={'/mi/otro'} />;`;
  const missing = scanSource(code, "nav.tsx", ["/panel/clientes", "/login"]).filter((entry) => !entry.valid);
  assert.deepEqual(missing.map((entry) => entry.target), ["/mi/peso", "/mi/falta", "/mi/otro"]);
});

test("valida segmentos dinámicos, catch-all y query/hash sin permitir subrutas inventadas", () => {
  assert.ok(routeMatches("/panel/clientes/[id]", "/panel/clientes/123"));
  assert.ok(!routeMatches("/panel/clientes/[id]", "/panel/clientes/123/no-existe"));
  assert.ok(routeMatches("/docs/[...slug]", "/docs/uno/dos"));
  assert.ok(!routeMatches("/docs/[...slug]", "/docs"));
  assert.ok(routeMatches("/docs/[[...slug]]", "/docs"));
  const code = "const el = <Link href={`/panel/clientes/${id}?tab=peso#historial`} />;";
  assert.ok(scanSource(code, "card.tsx", ["/panel/clientes/[id]"])[0].valid);
});

test("ignora portales externos y verifica assets y API internos", () => {
  const code = `const links = [{href: 'https://example.com/no-existe'}, {href: '#peso'}, {url: '/icon.png'}];
    fetch('/api/peso'); fetch('/api/falta');`;
  const entries = scanSource(code, "links.ts", ["/api/peso"], new Set(["/icon.png"]));
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.filter((entry) => !entry.valid).map((entry) => entry.target), ["/api/falta"]);
});

test("retirar la página Peso vuelve a fallar la auditoría; no basta con tener su carpeta", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sysgym-routes-"));
  try {
    fs.mkdirSync(path.join(root, "src/app/mi/peso"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/app/nav.tsx"), "const nav = [{ href: '/mi/peso' }];");
    assert.equal(auditRoutes(root).missing.length, 1);
    fs.writeFileSync(path.join(root, "src/app/mi/peso/page.tsx"), "export default function Peso() {}");
    assert.equal(auditRoutes(root).missing.length, 0);
    fs.unlinkSync(path.join(root, "src/app/mi/peso/page.tsx"));
    assert.equal(auditRoutes(root).missing.length, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("todos los destinos detectables del proyecto tienen página, endpoint o asset", () => {
  const result = auditRoutes();
  assert.ok(result.references.length > 300);
  assert.deepEqual(result.missing, []);
});
