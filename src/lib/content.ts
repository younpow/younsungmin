import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { sortImages } from "./order.mjs";
export interface Photo {
  name: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  srcset?: string;
}
export interface Project {
  title: string;
  series: string;
  chapter: string;
  year?: number;
  slug: string;
  order: number;
  published: boolean;
  hero: string;
  book?: string;
  bookReviewed?: boolean;
  expectedImages?: number;
  imageDirectory: string;
  alt: Record<string, string>;
  photos: Photo[];
  statements: { en: string[]; ko: string[] };
  hasBook: boolean;
}
const root = path.resolve("src/content/work");
async function discover(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? discover(path.join(dir, e.name))
          : e.name === "meta.json"
            ? [path.join(dir, e.name)]
            : [],
      ),
    )
  ).flat();
}
export async function getProjects(): Promise<Project[]> {
  const results: Project[] = [];
  for (const file of await discover(root)) {
    const meta = JSON.parse(await fs.readFile(file, "utf8")) as Project;
    if (!meta.published) continue;
    if (
      !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(meta.slug) ||
      !meta.imageDirectory.startsWith("/media/work/") ||
      meta.imageDirectory.includes("..")
    )
      throw new Error("Invalid project path: " + file);
    const directory = path.join("public", meta.imageDirectory);
    const names = sortImages(await fs.readdir(directory));
    if (
      !names.length ||
      (meta.expectedImages && names.length !== meta.expectedImages)
    )
      throw new Error(
        meta.slug +
          ": image count must be " +
          (meta.expectedImages || "at least one"),
      );
    const photos: Photo[] = await Promise.all(
      names.map(async (name: string, index: number) => {
        const info = await sharp(path.join(directory, name)).metadata();
        if (
          !info.width ||
          !info.height ||
          Math.max(info.width, info.height) > 2000 ||
          info.exif ||
          info.xmp ||
          info.iptc ||
          (info.orientation && info.orientation !== 1)
        )
          throw new Error("Prepare this image before publishing: " + name);
        const candidates = await Promise.all(
          [640, 1200].map(async (size) => {
            const variant = path.join(
              directory,
              "responsive",
              name.replace(/\.[^.]+$/, "-" + size + ".webp"),
            );
            try {
              const v = await sharp(variant).metadata();
              return (
                meta.imageDirectory +
                "/responsive/" +
                path.basename(variant) +
                " " +
                v.width +
                "w"
              );
            } catch {
              return null;
            }
          }),
        );
        return {
          name,
          src: meta.imageDirectory + "/" + name,
          width: info.width,
          height: info.height,
          alt:
            meta.alt?.[name] ||
            "Photograph " +
              String(index + 1).padStart(2, "0") +
              " from " +
              meta.title +
              (meta.chapter ? " — " + meta.chapter : ""),
          srcset: [
            ...candidates.filter(Boolean),
            meta.imageDirectory + "/" + name + " " + info.width + "w",
          ].join(", "),
        };
      }),
    );
    if (!photos.some((p) => p.name === meta.hero))
      throw new Error("Missing project hero: " + meta.slug);
    const statements = { en: [] as string[], ko: [] as string[] };
    for (const lang of ["en", "ko"] as const) {
      const text = await fs.readFile(
        path.join(path.dirname(file), "statement." + lang + ".md"),
        "utf8",
      );
      statements[lang] = text
        .trim()
        .split(/\r?\n\s*\r?\n/)
        .filter(Boolean);
      if (!statements[lang].length)
        throw new Error("Missing statement: " + file);
    }
    let hasBook = false;
    if (meta.book && meta.bookReviewed) {
      if (!/^\/media\/books\/[a-z0-9-]+\.pdf$/.test(meta.book))
        throw new Error("Invalid book path");
      await fs.access(path.join("public", meta.book));
      hasBook = true;
    }
    results.push({ ...meta, photos, statements, hasBook });
  }
  const slugs = new Set(results.map((p) => p.slug));
  if (slugs.size !== results.length) throw new Error("Duplicate project slug");
  return results.sort(
    (a, b) => a.order - b.order || a.slug.localeCompare(b.slug),
  );
}
