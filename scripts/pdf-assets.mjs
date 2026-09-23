import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const packageRoot = path.dirname(
  fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")),
);
export function pdfAssets() {
  return {
    name: "local-pdf-assets",
    hooks: {
      "astro:config:setup": async ({ config }) => {
        const destination = fileURLToPath(
          new URL("vendor/pdfjs/", config.publicDir),
        );
        for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"])
          await fs.cp(
            path.join(packageRoot, folder),
            path.join(destination, folder),
            { recursive: true },
          );
        await fs.copyFile(
          path.join(packageRoot, "LICENSE"),
          path.join(destination, "LICENSE"),
        );
      },
    },
  };
}
