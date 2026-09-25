# YOUN SUNGMIN

Astro / TypeScript / CSS static photographer portfolio.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Run `npm test` before deployment and `npm run preview` to inspect the production build.

See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for Korean content and publishing instructions.

The published projects are OUR TIME — 2026 SPRING (4 photographs), OUR TIME — 2026 SUMMER (14 photographs and an artist book), DISTANCE (8 photographs), and ORIGIN (6 photographs). The OUR TIME hub is at `/work/our-time/`. Interface labels and photograph descriptions are available in English and Korean.

Original photographs and import manifests are kept in the ignored `local-originals/` folder. Only prepared web images under `public/media/` are deployed. Update the photograph count and order in each project's `meta.json`, remove obsolete web derivatives, then run `npm test`.

The active deployment is GitHub Pages through [.github/workflows/pages.yml](.github/workflows/pages.yml), which builds and tests `dist` on pushes to `main`. The previous vinext/Cloudflare starter in `app/`, `worker/`, `db/`, `examples/` and related configuration is inactive reference code; Astro does not include it in the published site. The root and `public/CNAME` files keep `younsungmin.com` on GitHub Pages.

`npm test` checks TypeScript, ESLint, the production build, static links and content ordering, book spreads, unpublished routes, and image preparation. `npm run test:browser` checks responsive layouts, lightbox controls, language persistence and book rendering using isolated fixtures. The actual artwork and book still need the photographer's final visual review.
