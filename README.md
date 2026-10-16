# Crystal Interiors

Redesign of `crystalinteriors.cz` built with Astro 7, Bun, TypeScript 7, Tailwind CSS v4, Fancybox, Cloudinary and Decap CMS on Cloudflare Pages.

## Stack

| Area | Library / service | Version | Where |
| --- | --- | --- | --- |
| Framework | [Astro](https://astro.build) (static output) | 7.4 | `astro.config.mjs`, `src/` |
| Runtime / package manager | [Bun](https://bun.sh) | 1.4 | `bun install`, `bun run …` (`packageManager: bun@1.4.3`) |
| Runtime (tooling) | Node.js 24 LTS (Krypton) | 24 | `engines`, `.node-version`, CI `node-version: 24` |
| Language | TypeScript 7 (`typescript-7`, native `tsc`) | 7.0 | `bun run typecheck` (`.ts` files) |
| Language tooling | TypeScript 6 (JS API for `@astrojs/check` / Astro LS) | 6.0 | kept until TS 7.1 ships a stable API |
| Type check | `@astrojs/check` | 0.9 | `astro check` (`.astro` files) |
| Styling | Tailwind CSS v4 + `@tailwindcss/cli` | 4.3 | `public/styles/tailwind.source.css` → `tailwind.css` |
| Design tokens | OKLCH colours, rem spacing, tracking, motion, z-index | — | `@theme` in `tailwind.source.css` |
| Component variants | `tailwind-variants` + `tailwind-merge` | 3.3 / 3.7 | `src/components/ui/Button.astro` |
| Gallery / lightbox | [Fancybox](https://fancyapps.com) `@fancyapps/ui` | 6.1 | `src/pages/projekty.astro` |
| Images / CDN | [Cloudinary](https://cloudinary.com) – upload + fetch delivery, `f_auto` (AVIF/WebP), `q_auto`, `g_auto`, `srcset` | — | `src/lib/cloudinary.ts`, `src/components/ui/CloudImage.astro` |
| CMS | [Decap CMS](https://decapcms.org) (from unpkg) | 3.17 | `public/admin/` (`config.yml`, custom widgets) |
| CMS local backend | `decap-server` | 3.11 | `bun run cms:local` |
| CMS onboarding tours | [driver.js](https://driverjs.com) (from jsDelivr) | 1.10 | `public/admin/admin-ux.js` |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com) | — | `wrangler.toml`, `public/_headers` |
| Serverless | Cloudflare Pages Functions | — | `functions/api/*` (GitHub OAuth, Cloudinary upload signing), `functions/mcp.ts` |
| CMS auth | GitHub OAuth app → Decap GitHub backend, editorial workflow (PRs) | — | `functions/api/auth.ts`, `callback.ts` |
| Content storage | JSON files in git | — | `src/data/content/**/*.json` → `src/data/site.ts` |
| Mail / contact | No mail library or server: `mailto:` inquiry form + `tel:`/`mailto:` links | — | `src/pages/kontakt.astro` |
| Maps | Google Maps embed (iframe) | — | `settings.json → company.mapEmbed` |
| Analytics | Google Tag Manager `GTM-542MMSL` | — | `src/layouts/BaseLayout.astro` |
| PWA | Web App Manifest + service worker (network-first pages, SWR assets/images, offline page) | — | `public/manifest.webmanifest`, `public/sw.js`, `src/pages/offline.astro` |
| Icons | `sharp` (favicon / maskable PNG generator) | 0.35 | `bun run icons` → `scripts/generate-icons.mjs` |
| SEO | Per-page meta/OG/Twitter, schema.org JSON-LD graph, generated `sitemap.xml` (+ images), `robots.txt` | — | `src/lib/structured-data.ts`, `src/pages/sitemap.xml.ts` |
| AI agents | `llms.txt`, `/agent/site.json`, WebMCP tools, read-only MCP server | — | `src/pages/llms.txt.ts`, `src/components/agent/WebMcp.astro`, `functions/mcp.ts` |
| Fonts | Google Fonts – Inter, Manrope | — | `BaseLayout.astro` |
| Dev scripts | `npm-run-all` (parallel CSS watch + Astro dev) | 4.1 | `bun run dev` |

Hosting: GitHub Pages today (`.github/workflows/static.yml`, base path `/crystalinteriors.cz/`); Cloudflare Pages at `www.crystalinteriors.cz` is the target and is required for the CMS login, Cloudinary uploads and `/mcp` – see [DEPLOY.md](DEPLOY.md).

All packages are on their latest release (`bun outdated` is clean) except two deliberate holds: `typescript` stays on 6 for `@astrojs/check`, and `@types/node` follows the Node 24 LTS line.

Installed but currently unused in `src/`: `cloudinary` (Node SDK – URLs are built by hand), `@googlemaps/js-api-loader`, `@toolwind/anchors`.

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
All copy lives in `src/data/content/*.json` (one file per reference room in `src/data/content/references/`) and is edited in **Decap CMS** at `/admin/` – Czech UI, guided tours, confirmations before removals, signed Cloudinary uploads, publish-status panel. `src/data/site.ts` composes the files into one typed object.

Setup (Cloudflare Pages, GitHub OAuth, Cloudinary): see **[DEPLOY.md](DEPLOY.md)**.

## Images
`src/lib/cloudinary.ts` + `<CloudImage>` serve every image through Cloudinary with `f_auto` (AVIF → WebP → JPEG), `q_auto`, responsive `srcset`/`sizes` and fixed dimensions (no CLS). The hero is the LCP image: preloaded with the same `imagesrcset`, `fetchpriority="high"`.

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
