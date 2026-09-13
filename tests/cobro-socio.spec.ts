import { test, expect } from "@playwright/test";

const GIMNASIO = "sante";
const DUENO_DNI = "12345678";
const DUENO_CLAVE = "RQdvBXcNF90dZh";
const SOCIO_NOMBRE = "Lucas Socio";

async function loginDueno(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Con DNI (Gimnasio)" }).click();
  await page.locator('input[name="gimnasio"]').fill(GIMNASIO);
  await page.locator('input[name="dni"]').fill(DUENO_DNI);
  await page.locator('input[name="clave"]').fill(DUENO_CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  // El dueño de prueba reutiliza el SUPERADMIN_ID -> lo manda a /admin en vez
  // de /panel (ver tests/login.spec.ts). Navegamos a /panel a mano.
  await page.waitForURL(/\/(panel|admin)$/, { timeout: 15000 });

  // Este dueño de prueba reutiliza el SUPERADMIN_ID -> cae en el Cockpit Dev
  // (/admin), no en /panel. El cockpit trae un switcher de 1 click que abre
  // una sesión real como dueño; lo usamos en vez de un goto directo (la
  // conexión HMR de Next dev deja la red "activa" para siempre y networkidle
  // nunca resuelve).
  if (page.url().includes("/admin")) {
    await page.getByRole("button", { name: "Entrar como Dueño (Ir a /panel)" }).click();
  } else {
    await page.goto("/panel/clientes");
  }
  await page.waitForURL(/\/panel/, { timeout: 15000 });
  if (!page.url().includes("/panel/clientes")) {
    await page.goto("/panel/clientes");
  }
}

test.describe("Registrar pago a un socio (cobro manual)", () => {
  test("el dueno registra un cobro y la cuota del socio queda al dia", async ({ page }) => {
    await loginDueno(page);

    const saltear = page.getByRole("button", { name: "Saltear" });
    try {
      await saltear.waitFor({ state: "visible", timeout: 5000 });
      await saltear.click();
    } catch {
      // No apareció el tutorial (ya estaba salteado en este contexto).
    }

    await page
      .getByRole("link", { name: new RegExp(SOCIO_NOMBRE) })
      .click();
    await expect(page).toHaveURL(/\/panel\/clientes\/[^/]+$/, { timeout: 15000 });

    await page.getByRole("button", { name: "Registrar pago" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Registrar pago" });
    await expect(dialog).toBeVisible();

    // Dejamos el plan por defecto (el actual) y el monto vacío = precio de lista.
    await dialog.getByRole("button", { name: "Registrar pago" }).click();

    await expect(dialog.getByText(/Pago registrado\. Cuota al día hasta/)).toBeVisible({
      timeout: 10000,
    });
  });
});
