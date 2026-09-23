import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sortImages } from "../src/lib/order.mjs";
const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug))
  throw new Error("Usage: npm run prepare:images -- our-time/2026-summer");
const source = path.resolve("local-originals", slug),
  target = path.resolve("public/media/work", slug);
const names = (await fs.readdir(source)).filter((n) =>
  /\.(jpe?g|png|tiff?|webp)$/i.test(n),
);
const normalized = names.map((n) => n.replace(/\.[^.]+$/, ".jpg"));
sortImages(normalized);
await fs.mkdir(path.join(target, "responsive"), { recursive: true });
for (const name of names) {
  const base = String(parseInt(name)).padStart(2, "0");
  const input = path.join(source, name);
  await sharp(input)
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(target, base + ".jpg"));
  for (const size of [640, 1200])
    await sharp(input)
      .rotate()
      .resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(path.join(target, "responsive", base + "-" + size + ".webp"));
  console.log(
    name +
      " → " +
      path.relative(process.cwd(), path.join(target, base + ".jpg")),
  );
}
console.log(
  "Prepared " +
    names.length +
    " images. Remove obsolete output files before publishing.",
);
