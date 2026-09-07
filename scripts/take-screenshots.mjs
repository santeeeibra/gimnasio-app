import puppeteer from "puppeteer-core";
import { resolve } from "node:path";

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ARTIFACT_DIR = "C:\\Users\\santi\\.gemini\\antigravity\\brain\\20449635-480d-4fed-bac1-8c1260055c61";

async function run() {
  console.log("Iniciando Edge headless...");
  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  console.log("Navegando al login...");
  await page.goto("http://localhost:3000/login?g=ironpulse", { waitUntil: "networkidle2" });

  console.log("Completando formulario de login...");
  await page.waitForSelector('input[name="dni"]');
  await page.type('input[name="dni"]', "35999888");
  await page.type('input[name="clave"]', "gym9888");

  console.log("Enviando formulario...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  console.log("URL actual tras login:", page.url());

  if (!page.url().includes("/panel")) {
    console.log("Navegando explícitamente a /panel...");
    await page.goto("http://localhost:3000/panel", { waitUntil: "networkidle2" });
  }

  // Cerrar tutorial si está abierto
  await page.evaluate(() => {
    localStorage.setItem("tutorial_dueno_visto", "1");
  });
  await page.reload({ waitUntil: "networkidle2" });

  // Esperamos a que los datos y métricas carguen
  await page.waitForSelector("main", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Screenshot Mobile (375 x 812)
  console.log("Capturando vista mobile 375px...");
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 500));
  const mobilePath = resolve(ARTIFACT_DIR, "panel-mobile-375px.png");
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log("✓ Mobile screenshot guardado en:", mobilePath);

  // 2. Screenshot Desktop (1280 x 850)
  console.log("Capturando vista desktop 1280px...");
  await page.setViewport({ width: 1280, height: 850, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  await new Promise((r) => setTimeout(r, 500));
  const desktopPath = resolve(ARTIFACT_DIR, "panel-desktop-1280px.png");
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log("✓ Desktop screenshot guardado en:", desktopPath);

  await browser.close();
  console.log("Listo!");
}

run().catch((err) => {
  console.error("Error al capturar screenshots:", err);
  process.exit(1);
});
