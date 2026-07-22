const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.join(__dirname, "..");
const shotDir = path.join(root, "assets", "screenshots");
fs.mkdirSync(shotDir, { recursive: true });

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404).end("Not found"); return; }
  response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "light", locale: "ko-KR" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  assert.match(await page.title(), /CutFlow/);
  assert.equal(await page.locator("#itemRows tr").count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  const row = page.locator("#itemRows tr").first();
  await row.locator('[data-field="drawingNo"]').fill("A-101");
  await row.locator('[data-field="shapeId"]').selectOption("structural-tube");
  await row.locator('[data-field="material"]').selectOption("흑관");
  await row.locator('[data-field="spec"]').selectOption("50x50x2.3");
  await row.locator('[data-field="cutLength"]').fill("2500");
  await row.locator('[data-field="holeEnabled"]').check();
  await row.locator('[data-field="holeDiameter"]').fill("12");
  await row.locator('[data-field="holeCount"]').fill("2");
  await row.locator('[data-field="holePosition"]').fill("양끝 50mm");
  await row.locator('[data-field="quantity"]').fill("2");
  await page.locator('#calculatorForm button[type="submit"]').click();
  await page.waitForSelector("#results:not([hidden])");
  assert.match(await page.locator("#metrics").textContent(), /2개/);
  assert.match(await page.locator("#bomContainer").textContent(), /양끝 50mm/);
  assert.match(await page.locator("#summaryContainer").textContent(), /1본/);
  await page.screenshot({ path: path.join(shotDir, "01-cutflow-overview.png"), fullPage: true });
  await page.locator("#results").screenshot({ path: path.join(shotDir, "03-cutting-result.png") });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#results:not([hidden])");
  assert.equal(await page.locator('[data-field="holePosition"]').inputValue(), "양끝 50mm");
  assert.match(await page.locator("#toast").textContent(), /이전 계산 결과/);

  await page.locator("#copyRowButton").click();
  const copied = page.locator("#itemRows tr").nth(1);
  await copied.locator('[data-field="drawingNo"]').fill("A-102");
  await copied.locator('[data-field="holePosition"]').fill("좌측 100mm");
  await page.locator('#calculatorForm button[type="submit"]').click();
  assert.equal(await page.locator("#bomContainer tbody tr").count(), 2, "홀 위치가 다른 부품을 별도 BOM으로 표시");

  const download = page.waitForEvent("download");
  await page.locator("#downloadButton").click();
  assert.match((await download).suggestedFilename(), /새 절단 작업_\d{8}\.json/);

  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".input-panel").evaluate(element => getComputedStyle(element).display), "none");
  assert.notEqual(await page.locator("#results").evaluate(element => getComputedStyle(element).display), "none");
  await page.screenshot({ path: path.join(shotDir, "04-print-preview.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: path.join(shotDir, "02-cutflow-mobile.png"), fullPage: true });

  await page.locator("#themeButton").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log("browser: calculation, hole identity, restore, download, print, mobile, dark mode passed");
})().catch(error => {
  console.error(error);
  server.close();
  process.exit(1);
});
