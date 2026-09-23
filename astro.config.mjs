import { pdfAssets } from "./scripts/pdf-assets.mjs";
import { defineConfig } from "astro/config";
import { mediaGuard } from "./scripts/build-media.mjs";
export default defineConfig({
  site: "https://younsungmin.com",
  output: "static",
  trailingSlash: "always",
  integrations: [pdfAssets(), mediaGuard()],
  vite: { css: { postcss: { plugins: [] } } },
});
