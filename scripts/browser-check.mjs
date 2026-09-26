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
await fs.rm(fixture, { recursive: true, force: true });
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
      "/work/our-time/",
      "/about/",
      "/contact/",
      "/work/our-time/2026-summer/",
      "/work/our-time/2026-spring/",
      "/work/distance/",
      "/work/origin/",
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
  await page.goto("http://127.0.0.1:4322/");
  assert.match(
    await page.locator(".home-hero img").getAttribute("src"),
    /ourtime_2026-03-08_01\.jpg$/,
  );
  await page.goto("http://127.0.0.1:4322/");
  assert.equal(
    await page.locator(".home-hero > a").getAttribute("href"),
    "/work/our-time/",
  );
  assert.equal(
    await page.locator(".hero-note h1 a").getAttribute("href"),
    "/work/our-time/",
  );
  assert.equal(
    await page.locator(".hero-note .text-link").getAttribute("href"),
    "/work/",
  );
  assert.match(
    await page.locator('meta[name="description"]').getAttribute("content"),
    /long-term observation of time, distance, growth, memory/,
  );
  assert.doesNotMatch(
    await page.locator('meta[name="description"]').getAttribute("content"),
    /\bchild\b/i,
  );
  assert.deepEqual(
    await page
      .locator(".selected .project-index-card > h2")
      .evaluateAll((headings) => headings.map((heading) => heading.innerText)),
    ["OUR TIME", "DISTANCE", "ORIGIN"],
  );
  assert.equal(await page.locator(".selected .project-chapters").count(), 0);
  await page.goto("http://127.0.0.1:4322/work/our-time/");
  assert.equal(await page.locator(".season-entry").count(), 2);
  assert.match(
    await page.locator('.statement [data-lang="en"]').innerText(),
    /OUR TIME observes the time accumulated through ordinary days/,
  );
  await page.locator('[data-language="ko"]').click();
  assert.match(
    await page.locator('.statement [data-lang="ko"]').innerText(),
    /함께 보낸 시간은 특별한 사건보다 반복되는 일상 속에 쌓인다/,
  );
  await page.locator('[data-language="en"]').click();
  await page.goto("http://127.0.0.1:4322/work/");
  assert.deepEqual(
    await page
      .locator(".project-index-card > h2")
      .evaluateAll((headings) => headings.map((heading) => heading.innerText)),
    ["OUR TIME", "DISTANCE", "ORIGIN"],
  );
  assert.deepEqual(
    await page
      .locator(".project-chapters a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
    ["/work/our-time/2026-spring/", "/work/our-time/2026-summer/"],
  );
  await page.goto("http://127.0.0.1:4322/work/our-time/");
  assert.ok(await page.locator("#statement").isVisible());
  assert.equal(await page.locator(".season-entry").count(), 2);
  await page.goto("http://127.0.0.1:4322/work/origin/");
  assert.equal(await page.locator("h1").innerText(), "ORIGIN");
  assert.equal(await page.locator(".project-history").count(), 0);
  assert.equal(await page.locator(".statement").count(), 0);
  assert.equal(await page.locator('a[href^="/book/"]').count(), 0);
  assert.equal(await page.locator(".back").getAttribute("href"), "/work/");
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://younsungmin.com/work/origin/",
  );
  assert.match(
    await page.locator('meta[property="og:image"]').getAttribute("content"),
    /\/media\/work\/origin\/lens_05\.jpg$/,
  );
  assert.deepEqual(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.map((img) => img.getAttribute("src").split("/").pop()),
      ),
    [
      "lens_01.jpg",
      "lens_06.jpg",
      "lens_02.jpg",
      "lens_03.jpg",
      "lens_04.jpg",
      "lens_05.jpg",
    ],
  );
  for (const img of await page.locator("[data-photo] img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((image) => image.decode());
  }
  assert.ok(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.every(
          (img) =>
            getComputedStyle(img).objectFit === "contain" &&
            img.naturalWidth > 0 &&
            img.naturalHeight > 0 &&
            Math.abs(
              Number(img.getAttribute("width")) /
                Number(img.getAttribute("height")) -
                img.naturalWidth / img.naturalHeight,
            ) < 0.002,
        ),
      ),
  );
  await page.locator('[data-language="ko"]').click();
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  assert.match(
    await page.locator('[data-photo="0"] img').getAttribute("alt"),
    /신생아/,
  );
  assert.match(
    await page.locator('[data-photo="0"]').getAttribute("aria-label"),
    /사진 열기/,
  );
  await page.locator('[data-language="en"]').click();
  assert.match(
    await page.locator('[data-photo="0"] img').getAttribute("alt"),
    /newborn/,
  );
  await page.locator('[data-photo="0"]').click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /lens_01\.jpg$/,
  );
  await page.keyboard.press("ArrowRight");
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /lens_06\.jpg$/,
  );
  await page.locator(".lightbox-next").click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /lens_02\.jpg$/,
  );
  await page.keyboard.press("ArrowLeft");
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /lens_06\.jpg$/,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
  await page.goto("http://127.0.0.1:4322/work/distance/");
  assert.equal(await page.locator("h1").innerText(), "DISTANCE");
  assert.match(await page.locator(".project-history").innerText(), /2021/);
  assert.equal(await page.locator("[data-photo]").count(), 8);
  assert.deepEqual(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.map((img) => img.getAttribute("src").split("/").pop()),
      ),
    [
      "distance_01.jpg",
      "distance_02.jpg",
      "distance_04.jpg",
      "distance_05.jpg",
      "distance_06.jpg",
      "distance_07.jpg",
      "distance_09.jpg",
      "distance_10.jpg",
    ],
  );
  assert.match(
    await page.locator('meta[property="og:image"]').getAttribute("content"),
    /\/media\/work\/distance\/distance_06\.jpg$/,
  );
  for (const img of await page.locator("[data-photo] img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((image) => image.decode());
  }
  assert.ok(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.every(
          (img) =>
            getComputedStyle(img).objectFit === "contain" &&
            img.naturalWidth > 0 &&
            img.naturalHeight > 0 &&
            Math.abs(
              Number(img.getAttribute("width")) /
                Number(img.getAttribute("height")) -
                img.naturalWidth / img.naturalHeight,
            ) < 0.002,
        ),
      ),
  );
  await page.locator('[data-language="ko"]').click();
  assert.match(await page.locator(".project-history").innerText(), /2021년/);
  assert.match(
    await page.locator('[data-photo="0"] img').getAttribute("alt"),
    /돌길/,
  );
  await page.locator('[data-language="en"]').click();
  await page.locator('[data-photo="0"]').click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /distance_01\.jpg$/,
  );
  await page.keyboard.press("ArrowRight");
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /distance_02\.jpg$/,
  );
  await page.locator(".lightbox-next").click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /distance_04\.jpg$/,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("dialog").evaluate((dialog) => dialog.open),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4322/work/distance/");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator('[data-photo="0"]').click();
  await page.locator(".lightbox-next").click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /distance_02\.jpg$/,
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4322/work/origin/");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator('[data-photo="0"]').click();
  await page.locator(".lightbox-next").click();
  assert.match(
    await page.locator("dialog img").getAttribute("src"),
    /lens_06\.jpg$/,
  );
  await page.keyboard.press("Escape");
  await page.goto("http://127.0.0.1:4322/work/our-time/2026-spring/");
  assert.equal(await page.locator("[data-photo]").count(), 4);
  assert.deepEqual(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.map((img) => img.getAttribute("src").split("/").pop()),
      ),
    ["01.jpg", "02.jpg", "03.jpg", "04.jpg"],
  );
  assert.ok(
    await page
      .locator("[data-photo] img")
      .evaluateAll((imgs) =>
        imgs.every((img) => getComputedStyle(img).objectFit === "contain"),
      ),
  );
  for (const img of await page.locator("[data-photo] img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((image) => image.decode());
  }
  await page.locator('[data-language="ko"]').click();
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  assert.match(
    await page.locator(".project-history").innerText(),
    /2026\uB144 3\uC6D4/,
  );
  assert.match(
    await page.locator('.statement [data-lang="ko"]').innerText(),
    /3\uC6D4\uACFC 4\uC6D4/,
  );
  await page.locator('[data-language="en"]').click();
  assert.match(
    await page.locator(".project-history").innerText(),
    /March 2026/,
  );
  assert.match(
    await page.locator('.statement [data-lang="en"]').innerText(),
    /March and April/,
  );
  assert.equal(await page.locator('a[href^="/book/"]').count(), 0);
  await page.locator('[data-photo="0"]').click();
  await page.keyboard.press("ArrowRight");
  assert.match(await page.locator("dialog img").getAttribute("src"), /02.jpg$/);
  await page.locator(".lightbox-next").click();
  assert.match(await page.locator("dialog img").getAttribute("src"), /03.jpg$/);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:4322/work/our-time/2026-spring/");
  await page.locator('[data-photo="0"]').click();
  await page.locator(".lightbox-next").click();
  assert.match(await page.locator("dialog img").getAttribute("src"), /02.jpg$/);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4322/work/our-time/2026-summer/");
  assert.equal(await page.locator("[data-photo]").count(), 14);
  assert.equal(
    await page.locator('a[href^="/book/"]').getAttribute("href"),
    "/book/our-time/2026-summer/",
  );
  assert.match(
    await page.locator(".project-history").innerText(),
    /March 2026/,
  );
  assert.ok(await page.locator(".project-history").isVisible());
  const firstPhotoTop = await page
    .locator('[data-photo="0"]')
    .evaluate((photo) => photo.getBoundingClientRect().top);
  assert.ok(firstPhotoTop < 850, "First work photograph should appear early");
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
  assert.equal(
    await page.locator("article.text-page .prose > [data-lang='en'] p").count(),
    3,
  );
  assert.equal(
    await page.locator("article.text-page .prose > [data-lang='ko'] p").count(),
    3,
  );
  assert.doesNotMatch(
    await page
      .locator("article.text-page .prose > [data-lang='en']")
      .innerText(),
    /\b(she|her|daughter)\b/i,
  );
  assert.ok(await page.locator('[data-lang="ko"]').first().isVisible());
  assert.match(await page.locator("body").innerText(), /\uB2E8\uBE5B/);
  assert.match(await page.locator("body").innerText(), /\uCD08\uD310/);
  await page.locator('[data-language="en"]').click();
  assert.match(await page.locator("body").innerText(), /Danbit/);
  assert.match(await page.locator("body").innerText(), /First edition/);
  await page.screenshot({
    path: path.join(root, "outputs/about-desktop.png"),
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:4322/book/our-time/2026-summer/");
  assert.ok(await page.locator(".book-open-pdf").isVisible());
  assert.match(await page.locator(".book-details").innerText(), /257.*188 mm/);
  await page.waitForSelector('canvas[data-page="1"]');
  const canvasWidth = await page
    .locator("canvas")
    .first()
    .evaluate((c) => c.clientWidth);
  await page.locator(".book-zoom-in").click();
  await page.waitForTimeout(150);
  assert.ok(
    await page
      .locator(".book-stage")
      .evaluate((s) => s.classList.contains("is-zoomed")),
  );
  assert.ok(
    (await page
      .locator("canvas")
      .first()
      .evaluate((c) => c.clientWidth)) > canvasWidth,
  );
  await page.locator(".book-zoom-out").click();
  await page.waitForTimeout(150);
  await page.locator(".book-fullscreen").click();
  await page.waitForFunction(
    () =>
      document.fullscreenElement?.classList.contains("book-screen") ||
      document
        .querySelector(".book-status")
        .textContent.includes("unavailable"),
  );
  if (await page.evaluate(() => document.fullscreenElement !== null)) {
    await page.locator(".book-fullscreen").click();
    await page.waitForFunction(() => document.fullscreenElement === null);
  } else {
    assert.match(await page.locator(".book-status").innerText(), /unavailable/);
  }
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
    "PASS: ten routes at four widths; OUR TIME statement and season links; Spring, DISTANCE and ORIGIN images, order, language, lightbox and mobile; top-level WORK projects; unchanged home hero and Summer book; existing Summer/book regressions.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
