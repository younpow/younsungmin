// Isolated fixtures only: no test image or PDF enters public/ or the production build.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import http from "node:http";
import assert from "node:assert/strict";
import sharp from "sharp";
import { chromium } from "@playwright/test";
const root = process.cwd(),
  fixture = path.join(root, "outputs/qa-site");
await fs.mkdir(fixture, { recursive: true });
for (const name of ["src", "scripts", "public"])
  await fs.cp(path.join(root, name), path.join(fixture, name), {
    recursive: true,
  });
for (const name of ["astro.config.mjs", "tsconfig.json", "package.json"])
  await fs.copyFile(path.join(root, name), path.join(fixture, name));
const metaPath = path.join(
  fixture,
  "src/content/work/our-time/2026-summer/meta.json",
);
const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
meta.published = true;
meta.bookReviewed = true;
await fs.writeFile(metaPath, JSON.stringify(meta));
const imageDir = path.join(fixture, "public/media/work/our-time/2026-summer");
await fs.mkdir(imageDir, { recursive: true });
for (let i = 1; i <= 14; i++)
  await sharp({
    create: {
      width: i % 2 ? 1000 : 650,
      height: i % 2 ? 650 : 1000,
      channels: 3,
      background: { r: 205 + i, g: 208 + i, b: 210 + i },
    },
  })
    .jpeg()
    .toFile(path.join(imageDir, String(i).padStart(2, "0") + ".jpg"));
// A six-page vector test document. Page 3 is deliberately blank.
let pdf = "%PDF-1.4\n";
const offsets = [0];
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R 9 0 R 11 0 R 13 0 R] /Count 6 >>",
];
for (let n = 1; n <= 6; n++) {
  const content = n === 3 ? "" : n / 7 + " g 40 40 220 340 re f";
  objects.push(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << >> /Contents " +
      (n * 2 + 2) +
      " 0 R >>",
    "<< /Length " + content.length + " >>\nstream\n" + content + "\nendstream",
  );
}
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += i + 1 + " 0 obj\n" + body + "\nendobj\n";
});
const start = Buffer.byteLength(pdf);
pdf +=
  "xref\n0 " +
  offsets.length +
  "\n0000000000 65535 f \n" +
  offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
    .join("") +
  "trailer\n<< /Size " +
  offsets.length +
  " /Root 1 0 R >>\nstartxref\n" +
  start +
  "\n%%EOF";
await fs.mkdir(path.join(fixture, "public/media/books"), { recursive: true });
await fs.writeFile(
  path.join(fixture, "public/media/books/our-time-2026-summer.pdf"),
  pdf,
);
const cli = path.join(root, "node_modules/astro/bin/astro.mjs");
const build = spawnSync(process.execPath, [cli, "build"], {
  cwd: fixture,
  encoding: "utf8",
});
if (build.status !== 0) throw Error(build.stdout + build.stderr);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let file = path.resolve(
      fixture,
      "dist",
      "." + decodeURIComponent(url.pathname),
    );
    const base = path.join(fixture, "dist");
    if (!file.startsWith(base + path.sep) && file !== base) throw Error("path");
    if ((await fs.stat(file)).isDirectory())
      file = path.join(file, "index.html");
    res.setHeader(
      "Content-Type",
      types[path.extname(file)] || "application/octet-stream",
    );
    res.end(await fs.readFile(file));
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(4322, "127.0.0.1", r));
let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/work/",
      "/about/",
      "/contact/",
      "/work/our-time/2026-summer/",
      "/book/our-time/2026-summer/",
    ]) {
      await page.goto("http://127.0.0.1:4322" + route);
      await page.waitForLoadState("networkidle");
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Overflow " + width + " " + route,
      );
      if (route.includes("/book/")) await page.waitForSelector("canvas");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4322/work/our-time/2026-summer/");
  assert.equal(await page.locator("[data-photo]").count(), 14);
  assert.deepEqual(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.map((i) => i.getAttribute("src").split("/").pop()),
      ),
    Array.from(
      { length: 14 },
      (_, i) => String(i + 1).padStart(2, "0") + ".jpg",
    ),
  );
  assert.ok(
    await page
      .locator(".artwork")
      .evaluateAll((images) =>
        images.every((i) => getComputedStyle(i).objectFit === "contain"),
      ),
  );
  await page.locator('[data-photo="0"]').click();
  assert.ok(await page.locator("dialog").evaluate((d) => d.open));
  await page.keyboard.press("ArrowRight");
  assert.match(await page.locator("dialog img").getAttribute("src"), /02.jpg$/);
  await page.keyboard.press("ArrowLeft");
  assert.match(await page.locator("dialog img").getAttribute("src"), /01.jpg$/);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
  assert.equal(
    await page
      .locator('[data-photo="0"]')
      .evaluate((b) => b === document.activeElement),
    true,
  );
  await page.locator('[data-language="ko"]').click();
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  await page.goto("http://127.0.0.1:4322/about/");
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  assert.ok(await page.locator('[data-lang="ko"]').isVisible());
  await page.locator('[data-language="en"]').click();
  await page.screenshot({
    path: path.join(root, "outputs/about-desktop.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:4322/book/our-time/2026-summer/");
  await page.waitForSelector('canvas[data-page="1"]');
  await page.keyboard.press("ArrowRight");
  await page.waitForSelector('canvas[data-page="3"]');
  assert.deepEqual(
    await page
      .locator("canvas")
      .evaluateAll((c) => c.map((x) => Number(x.dataset.page))),
    [2, 3],
  );
  const blank = await page.locator('canvas[data-page="3"]').evaluate((c) => {
    const data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    return data.every((v, i) => i % 4 === 3 || v === 255);
  });
  assert.ok(blank);
  await page.keyboard.press("ArrowRight");
  await page.waitForSelector('canvas[data-page="5"]');
  await page.keyboard.press("ArrowRight");
  await page.waitForSelector('canvas[data-page="6"]');
  assert.equal(await page.locator("canvas").count(), 1);
  await page.keyboard.press("ArrowLeft");
  await page.waitForSelector('canvas[data-page="4"]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert.equal(await page.locator("canvas").count(), 1);
  await page.keyboard.press("ArrowRight");
  await page.waitForSelector('canvas[data-page="5"]');
  await page.goto("http://127.0.0.1:4322/about/");
  await page.screenshot({
    path: path.join(root, "outputs/about-mobile.png"),
    fullPage: true,
  });
  await page.route("**/*.pdf", (route) => route.abort());
  await page.goto("http://127.0.0.1:4322/book/our-time/2026-summer/");
  await page.waitForFunction(() =>
    document.querySelector(".book-status").textContent.includes("Unable"),
  );
  assert.ok(await page.locator(".book-fallback a").isVisible());
  assert.deepEqual(errors, []);
  console.log(
    "PASS: six routes × four widths; 14-image order; contain; lightbox arrows/Escape/focus; language persistence; cover/spreads/blank page/mobile; PDF failure fallback.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
