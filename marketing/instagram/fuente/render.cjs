const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1400 } });
  await p.goto(require("url").pathToFileURL(path.join(__dirname, process.argv[3] || "slides.html")).href);
  await p.waitForLoadState("networkidle"); await p.evaluate(() => document.fonts.ready);
  for (const id of await p.$$eval("section", s => s.map(x => x.id)))
    await p.locator("#" + id).screenshot({ path: path.join(process.argv[2], id + ".png"), omitBackground: true });
  await b.close();
})();
