import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { sortImages, bookPages } from "../src/lib/order.mjs";
test("numeric sequence is stable and rejects duplicates", () => {
  assert.deepEqual(sortImages(["14.jpg", "2.jpg", "01.jpg", "10.jpg"]), [
    "01.jpg",
    "2.jpg",
    "10.jpg",
    "14.jpg",
  ]);
  assert.throws(() => sortImages(["01.jpg", "1.webp"]));
  assert.throws(() => sortImages(["cover.jpg"]));
});
test("book preserves cover, spreads, blank-page positions and last page", () => {
  assert.deepEqual(bookPages(1, 6, true), [1]);
  assert.deepEqual(bookPages(3, 6, true), [2, 3]);
  assert.deepEqual(bookPages(6, 6, true), [6]);
  assert.deepEqual(bookPages(3, 6, false), [3]);
});
async function walk(dir) {
  return (
    await Promise.all(
      (await fs.readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
test("static routes and local links resolve, deployment domain is retained", async () => {
  for (const route of [
    "index.html",
    "work/index.html",
    "about/index.html",
    "contact/index.html",
    "404.html",
  ]) {
    const html = await fs.readFile(path.join("dist", route), "utf8");
    assert.match(html, /YOUN SUNGMIN/);
    assert.match(html, /rel="canonical"/);
  }
  for (const file of (await walk("dist")).filter((f) => f.endsWith(".html"))) {
    const html = await fs.readFile(file, "utf8");
    for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const url = match[1];
      await fs.access(
        path.join("dist", url.endsWith("/") ? url + "index.html" : url),
      );
    }
  }
  assert.equal(
    (await fs.readFile("dist/CNAME", "utf8")).trim(),
    "younsungmin.com",
  );
  assert.match(
    await fs.readFile("dist/sitemap.xml", "utf8"),
    /https:\/\/younsungmin.com\/about\//,
  );
});
test("unpublished work is absent from public pages and sitemap", async () => {
  const files = (await walk("src/content/work")).filter((f) =>
    f.endsWith("meta.json"),
  );
  const sitemap = await fs.readFile("dist/sitemap.xml", "utf8");
  for (const file of files) {
    const meta = JSON.parse(await fs.readFile(file, "utf8"));
    if (meta.published) continue;
    await assert.rejects(
      fs.access(path.join("dist", "work", meta.slug, "index.html")),
    );
    assert.ok(!sitemap.includes("/work/" + meta.slug + "/"));
  }
});
