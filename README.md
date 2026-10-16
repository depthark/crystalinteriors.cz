# Crystal Interiors

Redesign of `crystalinteriors.cz` built with Astro, Bun, Tailwind CSS v4, Fancybox, and Cloudinary-ready image delivery.

## Stack
- Astro
- Bun
- Tailwind CSS v4
- Fancybox
- Cloudinary fetch integration

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
