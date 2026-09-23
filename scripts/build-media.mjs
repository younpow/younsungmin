import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
async function walk(dir) {
  try {
    return (
      await Promise.all(
        (await fs.readdir(dir, { withFileTypes: true })).map((e) =>
          e.isDirectory()
            ? walk(path.join(dir, e.name))
            : [path.join(dir, e.name)],
        ),
      )
    ).flat();
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
export function mediaGuard() {
  return {
    name: "published-media-only",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const build = path.resolve(fileURLToPath(dir));
        const allowed = new Set();
        const published = new Set();
        for (const file of await walk("src/content/work")) {
          if (!file.endsWith("meta.json")) continue;
          const meta = JSON.parse(await fs.readFile(file, "utf8"));
          if (!meta.published) continue;
          published.add(meta.slug);
          const prefix = meta.imageDirectory.replace(/^\//, "");
          for (const image of await walk(path.join("public", prefix))) {
            if (!/\.(jpe?g|webp)$/i.test(image))
              throw new Error(
                "Unsupported file in published image folder: " + image,
              );
            const info = await sharp(image).metadata();
            if (
              !info.width ||
              !info.height ||
              Math.max(info.width, info.height) > 2000 ||
              info.exif ||
              info.xmp ||
              info.iptc
            )
              throw new Error("Unsafe image: " + image);
            allowed.add(
              path.relative("public", image).split(path.sep).join("/"),
            );
          }
          if (meta.book && meta.bookReviewed) allowed.add(meta.book.slice(1));
        }
        const site=JSON.parse(await fs.readFile('src/config/site.json','utf8'));
        if(site.heroPhoto && published.has(site.heroProject)) {
          const urls=[site.heroPhoto.src,...(site.heroPhoto.srcset||'').split(',').map(s=>s.trim().split(' ')[0])];
          for(const url of new Set(urls)){
            if(!url.startsWith('/media/home/') || url.includes('..'))throw Error('Invalid home photograph path');
            const image=await sharp(path.join('public',url)).metadata();
            if(!image.width||!image.height||Math.max(image.width,image.height)>2000||image.exif||image.xmp||image.iptc)throw Error('Unsafe home photograph');
            allowed.add(url.slice(1));
          }
        }
        for (const file of await walk(path.join(build, "media"))) {
          const relative = path.relative(build, file).split(path.sep).join("/");
          if (!allowed.has(relative)) await fs.unlink(file);
        }
      },
    },
  };
}
