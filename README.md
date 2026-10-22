# Crystal Interiors

Redesign of `crystalinteriors.cz` built with Astro 7, Bun, TypeScript 7, Tailwind CSS v4, Fancybox and Decap CMS on Cloudflare Pages – photos are AVIF files in the repo, no image service.

## Stack

| Area | Library / service | Version | Where |
| --- | --- | --- | --- |
| Framework | [Astro](https://astro.build) (static output) | 7.4 | `astro.config.ts`, `src/` |
| Runtime / package manager | [Bun](https://bun.sh) | 1.4 | `bun install`, `bun run …` (`packageManager: bun@1.4.3`) |
| Runtime (tooling) | Node.js 24 LTS (Krypton) | 24 | `engines`, `.node-version`, CI `node-version: 24` |
| Language | TypeScript 7 (`typescript-7`, native `tsc`) | 7.0 | `bun run typecheck` (`.ts` files) |
| Language tooling | TypeScript 6 (JS API for `@astrojs/check` / Astro LS) | 6.0 | kept until TS 7.1 ships a stable API |
| Type check | `@astrojs/check` | 0.9 | `astro check` (`.astro` files) |
| Styling | Tailwind CSS v4 + `@tailwindcss/cli` | 4.3 | `public/styles/tailwind.source.css` → `tailwind.css` |
| Design tokens | OKLCH colours, rem spacing, tracking, motion, z-index | — | `@theme` in `tailwind.source.css` |
| Component variants | `tailwind-variants` + `tailwind-merge` | 3.3 / 3.7 | `src/components/ui/Button.astro` |
| Gallery / lightbox | [Fancybox](https://fancyapps.com) `@fancyapps/ui` | 6.1 | `src/pages/projekty.astro` |
| Images | AVIF image sets in the repo – no image CDN. CMS compresses in the browser (Squoosh AVIF codec via jSquash 2.1 WASM, Lanczos3 resize, smartcrop 2.0 focus point) in module workers; widths 400/800/1200/1800/2400, never upscaled; tiles ≤800 px, lightbox `srcset` ≥1200 px, `sizes="auto"`, focus via `object-position` | — | `public/admin/image-pipeline.js` + `image-worker.js` + `vendor/`, `src/lib/image-set.ts`, `src/components/ui/ResponsiveImage.astro`, `scripts/image-set.ts` (sharp + smartcrop-sharp) |
| Photo storage | `public/gallery/<group>/<name>-<width>.avif`, committed by the CMS through the GitHub Git Data API (one `[skip ci]` commit per upload) or `decap-server` locally | — | `public/admin/repo-store.js`, `photo-upload.js` |
| CMS | [Decap CMS](https://decapcms.org) (from unpkg) | 3.17 | `public/admin/` (`config.yml`, custom widgets) |
| CMS local backend | `decap-server` | 3.11 | `bun run cms:local` |
| CMS onboarding tours | [driver.js](https://driverjs.com) (from jsDelivr) | 1.10 | `public/admin/admin-ux.js` |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) | — | `wrangler.toml`, `public/_headers` |
| Serverless | Cloudflare Pages Functions | — | `functions/api/*` (GitHub OAuth, contact form), `functions/mcp.ts` |
| CMS auth | GitHub OAuth app → Decap GitHub backend, editorial workflow (PRs) | — | `functions/api/auth.ts`, `callback.ts` |
| Content storage | JSON files in git | — | `src/data/content/**/*.json` → `src/data/site.ts` |
| Mail / contact | [Resend](https://resend.com) via Pages Function `/api/inquiry` (both designers, customer as Reply-To); falls back to a prepared `mailto:` e-mail; `tel:`/`mailto:` links | — | `functions/api/inquiry.ts`, `src/pages/kontakt.astro`, `ROLLBACK.md` |
| Maps | Google Maps embed (iframe) | — | `settings.json → company.mapEmbed` |
| Analytics | Google Tag Manager `GTM-542MMSL` | — | `src/layouts/BaseLayout.astro` |
| PWA | Web App Manifest + service worker (network-first pages, SWR assets/images, offline page) | — | `public/manifest.webmanifest`, `public/sw.js`, `src/pages/offline.astro` |
| Icons | `sharp` – favicon / PWA icons generated from the official logo | 0.35 | `bun run icons` → `scripts/generate-icons.ts` |
| SEO | Per-page meta/OG/Twitter, schema.org JSON-LD graph, generated `sitemap.xml` (+ images), `robots.txt` | — | `src/lib/structured-data.ts`, `src/pages/sitemap.xml.ts` |
| Share images | `sharp` text + composite → `/og/<page>.jpg` with logo, Playfair title, royal/lavender light | — | `src/lib/og-image.ts`, `src/pages/og/[slug].jpg.ts` |
| AI agents | `llms.txt`, `/agent/site.json`, WebMCP tools, read-only MCP server | — | `src/pages/llms.txt.ts`, `src/components/agent/WebMcp.astro`, `functions/mcp.ts` |
| Fonts | Google Fonts – Playfair Display (h1–h3), Manrope (UI), Inter (body) | — | `BaseLayout.astro`, `global.css` |
| Rich text | `marked` – Markdown from the CMS editor → HTML (project descriptions) | 18 | `src/lib/markdown.ts` |
| Dev scripts | `npm-run-all` (parallel CSS watch + Astro dev) | 4.1 | `bun run dev` |

Hosting: Cloudflare Pages at `www.crystalinteriors.cz` (deploys on push to `main`) – see [DEPLOY.md](DEPLOY.md). GitHub Actions only checks the build (`.github/workflows/build.yml`).

All packages are on their latest release (`bun outdated` is clean) except two deliberate holds: `typescript` stays on 6 for `@astrojs/check`, and `@types/node` follows the Node 24 LTS line.

Installed but currently unused: `@googlemaps/js-api-loader`, `@toolwind/anchors`.

## Development
```bash
bun install
bun run dev
```

## Build
```bash
bun run build
```

## Content & CMS
All copy lives in `src/data/content/*.json` (one file per project in `src/data/content/projects/`) and is edited in **Decap CMS** at `/admin/` – Czech UI, guided tours, confirmations before removals, in-browser AVIF photo uploads committed to the repo, publish-status panel. `src/data/site.ts` composes the files into one typed object.

Setup (Cloudflare Pages, GitHub OAuth, Resend): see **[DEPLOY.md](DEPLOY.md)**.

## Images
Photos are **image sets** in `public/gallery/`: `<name>-400/800/1200/1800/2400.avif`, never upscaled. Content stores only the base path (`/gallery/projekty/<slug>/<slug>-01`); `src/lib/image-set.ts` reads the widths and size from the files at build. `<ResponsiveImage>` renders `srcset` + `sizes` (`auto` for lazy images) with fixed dimensions (no CLS); gallery tiles offer ≤800 px, the Fancybox lightbox gets its own `data-srcset` from 1200 px, so phones never download 2400 px. Tiles crop with the CMS focus point (`object-position`). The hero is the LCP image: preloaded with the same `imagesrcset`, `fetchpriority="high"`. Bulk import: `bun run image-set <file-or-url> /gallery/<group>/<name>`.

## SEO, PWA & agents
- Per-page title/description/canonical/OG/Twitter, `schema.org` graph (`src/lib/structured-data.ts`): ProfessionalService + HomeAndConstructionBusiness, Person, OfferCatalog, FAQPage, Service, ImageGallery, BreadcrumbList.
- Generated `sitemap.xml` (with image entries), `robots.txt`, `manifest.webmanifest`, service worker (`public/sw.js`, offline page), maskable icons.
- `/llms.txt`, `/agent/site.json`, WebMCP tools (`src/components/agent/WebMcp.astro`) and a read-only MCP server at `/mcp`.

## Routes
- `/`
- `/projekty/`
- `/sluzby/`
- `/o-nas/`
- `/kontakt/`
- `/admin/` (CMS)

## Content Source
The redesign uses the publicly available structure and content from the live Crystal Interiors website, with shortened and improved Czech copy.
