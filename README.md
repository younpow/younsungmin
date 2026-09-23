# YOUN SUNGMIN

Astro / TypeScript / CSS static photographer portfolio.

```sh
npm ci
npm run dev
```

Open http://localhost:4321. Run `npm test` before deployment and `npm run preview` to inspect the production build.

See [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for Korean content and publishing instructions.

Photos and book PDFs have not been supplied. Projects start unpublished; no substitute photography is included.

The previous vinext/Cloudflare starter in app/, worker/, db/, examples/ and related config files is retained as inactive reference. Astro builds only src/. Existing .openai/hosting.json and root CNAME are preserved. The active deployment is .github/workflows/pages.yml and public/CNAME. No production deployment has been performed.

## Verification

`npm test` checks TypeScript, ESLint, production build, static links, numeric sequence, book spreads, unpublished routes and image preparation. `npm run test:browser` uses installed Microsoft Edge headlessly, with isolated geometric image/PDF fixtures under ignored outputs/qa-site. It checks six routes at 1440, 1280, 768 and 390px, lightbox keyboard/focus, language persistence, blank PDF pages, mobile page order and PDF failure fallback. It does not publish fixtures. Actual artwork and final book sequencing require review after content is supplied.
