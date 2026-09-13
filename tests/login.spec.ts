import { test, expect } from "@playwright/test";

const GIMNASIO = "sante";

test.describe("Login con DNI (gimnasio)", () => {
  test("cliente con credenciales validas entra a /mi", async ({ page }) => {
    await page.goto("/login");

    // Cambiar al modo "Con DNI (Gimnasio)" — el default es "Cuenta individual".
    await page.getByRole("button", { name: "Con DNI (Gimnasio)" }).click();

    await page.locator('input[name="gimnasio"]').fill(GIMNASIO);
    await page.locator('input[name="dni"]').fill("20000000");
    await page.locator('input[name="clave"]').fill("Z7ITCjdWUs0W5M");
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.waitForURL("**/mi", { timeout: 15000 });
    await expect(page).toHaveURL(/\/mi$/);
  });

  test("dueno con credenciales validas entra (redirige a /admin: reset-single-gym.mjs reutiliza el SUPERADMIN_ID como dueno de sante)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Con DNI (Gimnasio)" }).click();

    await page.locator('input[name="gimnasio"]').fill(GIMNASIO);
    await page.locator('input[name="dni"]').fill("12345678");
    await page.locator('input[name="clave"]').fill("RQdvBXcNF90dZh");
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.waitForURL(/\/(panel|admin)$/, { timeout: 15000 });
  });

  test("credenciales invalidas muestran error y no redirige", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Con DNI (Gimnasio)" }).click();

    await page.locator('input[name="gimnasio"]').fill(GIMNASIO);
    await page.locator('input[name="dni"]').fill("99999999");
    await page.locator('input[name="clave"]').fill("clave-incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "DNI o contraseña incorrectos" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
