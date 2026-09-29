import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("registration creates Auth + Partner only and keeps normal email verification", async () => {
  const source = await read("src/app/registro-partner/actions.ts");
  assert.match(source, /auth\.signUp\(/);
  assert.doesNotMatch(source, /auth\.admin\.createUser/);
  assert.doesNotMatch(source, /email_confirm/);
  assert.match(source, /from\("partners"\)\.insert/);
  assert.doesNotMatch(source, /from\("gimnasios"\)\.insert/);
  assert.doesNotMatch(source, /from\("profiles"\)\.insert/);
  assert.doesNotMatch(source, /from\("clientes"\)\.insert/);
  assert.match(source, /terminos_version: PARTNER_TERMS_VERSION/);
  assert.match(source, /compensateFailedPartnerRegistration/);
});

test("route guards keep Partner, gym member, and platform admin contexts separate", async () => {
  const [partner, panel, member, admin] = await Promise.all([
    read("src/app/partner/layout.tsx"),
    read("src/app/panel/layout.tsx"),
    read("src/app/mi/layout.tsx"),
    read("src/app/admin/partner/page.tsx"),
  ]);
  assert.match(partner, /requirePartner\(\)/);
  assert.match(panel, /requireStaffODueno\(\)/);
  assert.match(member, /requireProfile\(\)/);
  assert.match(admin, /requireSuperadmin\(\)/);
});

test("all Partner service-role actions derive identity from the validated session", async () => {
  const sources = await Promise.all([
    read("src/app/partner/actions.ts"),
    read("src/app/partner/mensajes-actions.ts"),
    read("src/app/partner/push-actions.ts"),
  ]);
  for (const source of sources) {
    assert.match(source, /requirePartner\(\)/);
    assert.doesNotMatch(source, /formData\.get\("partner_id"\)/);
  }
});
