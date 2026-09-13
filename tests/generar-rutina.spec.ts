import { test, expect, type Page } from "@playwright/test";

const GIMNASIO = "sante";
const DUENO_DNI = "12345678";
const DUENO_CLAVE = "RQdvBXcNF90dZh";
const SOCIO_NOMBRE = "Lucas Socio";

async function loginDuenoYVerClientes(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Con DNI (Gimnasio)" }).click();
  await page.locator('input[name="gimnasio"]').fill(GIMNASIO);
  await page.locator('input[name="dni"]').fill(DUENO_DNI);
  await page.locator('input[name="clave"]').fill(DUENO_CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  // El dueño de prueba reutiliza el SUPERADMIN_ID -> cae en el Cockpit Dev
  // (/admin), no en /panel. El cockpit trae un switcher de 1 click.
  await page.waitForURL(/\/(panel|admin)$/, { timeout: 15000 });
  if (page.url().includes("/admin")) {
    await page.getByRole("button", { name: "Entrar como Dueño (Ir a /panel)" }).click();
  } else {
    await page.goto("/panel/clientes");
  }
  await page.waitForURL(/\/panel/, { timeout: 15000 });
  if (!page.url().includes("/panel/clientes")) {
    await page.goto("/panel/clientes");
  }

  // Tutorial de onboarding: tapa la pantalla en el primer ingreso.
  const saltear = page.getByRole("button", { name: "Saltear" });
  try {
    await saltear.waitFor({ state: "visible", timeout: 5000 });
    await saltear.click();
  } catch {
    // No apareció (ya salteado en este contexto de browser).
  }
}

test.describe("Generar rutina para un socio (motor cientifico, desde el panel del dueno)", () => {
  test("el dueno genera una rutina y el panel confirma la asignacion", async ({ page }) => {
    await loginDuenoYVerClientes(page);

    await page.getByRole("link", { name: new RegExp(SOCIO_NOMBRE) }).click();
    await expect(page).toHaveURL(/\/panel\/clientes\/[^/]+$/, { timeout: 15000 });

    // El bloque de rutina es un <details>; puede empezar cerrado si el socio
    // ya tiene una rutina generada de una corrida anterior del reset script.
    const detalle = page.locator("details", {
      has: page.getByText(/Generar rutina|Regenerar rutina/),
    });
    const summary = detalle.locator("summary");
    if (!(await detalle.getAttribute("open"))) {
      await summary.click();
    }

    const submitBtn = detalle.getByRole("button", {
      name: /Generar rutina|Regenerar rutina/,
    });
    await submitBtn.click();

    await expect(detalle.getByText("Rutina generada para el cliente.")).toBeVisible({
      timeout: 15000,
    });
  });
});
