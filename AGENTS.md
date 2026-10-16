# AGENTS

## Project Goal

Modern Astro redesign of `crystalinteriors.cz`. Keeps the original navigation structure and business scope but rewrites copy, design language, and component architecture from scratch. Primary nav:

- `Úvod` (`/`)
- `Projekty` (`/projekty/`)
- `Služby` (`/sluzby/`)
- `O nás` (`/o-nas/`)
- `Kontakt` (`/kontakt/`)

## Tech Stack

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

All packages are on their latest release (`bun outdated` is clean) except two deliberate holds: `typescript` stays on 6 for `@astrojs/check`, and `@types/node` follows the Node 24 LTS line.

Installed but currently unused in `src/`: `cloudinary` (Node SDK – URLs are built by hand), `@googlemaps/js-api-loader`, `@toolwind/anchors`.

Hosting today: **GitHub Pages** (`.github/workflows/static.yml`, on push to `main`, base path `/crystalinteriors.cz/` via `PUBLIC_BASE_PATH`). Target: **Cloudflare Pages** at `https://www.crystalinteriors.cz` – needed for `/admin/` login, Cloudinary upload signing and `/mcp` (see `DEPLOY.md`). Everything public (pages, PWA, sitemap, llms.txt) works on both; paths go through `import.meta.env.BASE_URL` / `withBase()`, and `public/sw.js` + `manifest.webmanifest` are scope-relative.

## Design System

All design tokens live in `public/styles/tailwind.source.css` under `@theme`. Components reference them via Tailwind utilities (`bg-primary`, `text-muted`, `rounded-2xl`, `duration-fast`, etc.). Notable buckets:

- **Color**: `primary`, `primary-hover`, `accent`, `secondary`, surface/background, ink (dark sections), border, foreground/muted/subtle. Dark theme override under `[data-theme="dark"]`.
- **Spacing**: `--spacing: 0.25rem` (Tailwind derives `p-1, p-2, …` plus arbitrary `h-18`, `w-21`).
- **Radii**: `--radius-xs`...`--radius-3xl`, `--radius-full`.
- **Shadows**: `--shadow-card`, `--shadow-lifted`, `--shadow-soft`.
- **Motion**: `--duration-fast/standard/slow`, `--ease-standard/out-soft`. Custom keyframes (e.g. `hero-zoom`) declared in same source file.
- **Z-index**: `--z-base/sticky/header/overlay/modal`. NOTE: Tailwind v4 does not auto-map `--z-*` → utilities, so consumers must use `z-[var(--z-modal)]`.

Glass surfaces (`.glass`, `.glass-strong`, `.glass-hover`) live in `public/styles/global.css` as `@layer components`. The frosted blur is applied via a `::before` pseudo-element so the host element does **not** create a containing block for fixed-position descendants (critical for the mobile menu panel).

Dark theme toggle: `ThemeToggle.astro` writes `data-theme="dark"|"light"` to `<html>` and persists in `localStorage`. The `@custom-variant dark` declaration in the source CSS hooks Tailwind's `dark:` variants to the data attribute.

## Components

### Layout

- `src/layouts/BaseLayout.astro` — `<head>` boilerplate, meta tags, OG, schema.org JSON-LD, Google Tag Manager (`GTM-542MMSL`), skip link, theme-init inline script.
- `src/components/SiteHeader.astro` — sticky `.glass` header. Logo (SVG, white art via filter inversion in light theme), brand text, nav (desktop ≥lg), mobile cluster with `ThemeToggle` + `MobileMenu`.
- `src/components/MobileMenu.astro` — fullscreen overlay panel via `position: fixed inset-0`. State via `data-state="open"|"closed"` + Tailwind `group-data-[state=open]/menu:` variants. Hamburger transforms, social links, primary CTA.
- `src/components/SiteFooter.astro` — three-column footer with brand, atelier, social. Bottom row shows legal info (Provozovatel, IČO, sídlo) + copyright.

### Reusable

- `src/components/ui/Button.astro` — `tailwind-variants` styled. Variants: `primary`, `secondary`, `outline`, `outline-on-dark`, `ghost`, `hero-primary`, `hero-outline`. Sizes: `sm`, `md`, `lg`. `fullWidth` prop for `w-full sm:w-auto` mobile pattern. Min tap target 44px (`min-h-11`).
- `src/components/ui/IconButton.astro` — icon-only round button.
- `src/components/SectionIntro.astro` — eyebrow + heading + lead; `level={1}` renders the page `<h1>`.
- `src/components/FaqSection.astro` — native `<details name>` accordion (CMS FAQ, also FAQPage schema).
- `src/components/ui/CloudImage.astro` — responsive Cloudinary image (AVIF/WebP, srcset, no CLS).
- `src/components/agent/WebMcp.astro` — WebMCP tools for in-browser AI agents.
- `src/components/SocialLinks.astro` — reusable Facebook (solid filled) + Instagram (outline) icons with `title` tooltip, `aria-label`, `sr-only` text, `focus-visible:ring`. `variant: inline | card`, `align: left | right | center`.
- `src/components/ParallaxStrip.astro` — full-width banner with `background-attachment: fixed` parallax (mobile/iOS fallback to `scroll` via `@media (hover: none)` + `prefers-reduced-motion`). Used on homepage between sections; image taken from old site CDN (`duyn491kcolsw.cloudfront.net/files/1u/1um/1umned.jpg`).
- `src/components/HeroSection.astro` — full-bleed hero with Cloudinary image, gradient overlay, eyebrow + title + CTAs.
- `src/components/ReferencesGallery.astro` — room section; CMS images render statically (crawlable), empty rooms fall back to the Cloudinary tag list at runtime; Fancybox lightbox.

### Icons

`src/components/icons/*.astro` — Heroicons-style 1.5 stroke outline:

`ArrowRightIcon`, `ChevronDownIcon`, `ClockIcon`, `EnvelopeIcon`, `FacebookIcon` (solid filled), `InstagramIcon` (outline), `LanguageIcon`, `MagnifyIcon`, `MapPinIcon`, `MoonIcon`, `PhoneIcon`, `SadFaceIcon`, `SendIcon`, `SparklesIcon`, `SunIcon`, `UserGroupIcon`, `WrenchScrewdriverIcon`.

## Data Layer

Content is edited in Decap CMS and stored as JSON in `src/data/content/`; `src/data/site.ts` composes it into one typed `site` object (components never import JSON directly):

- `settings.json` – name, tagline, description, keywords, share image, social, `company` (legal info, address parts, geo, opening hours, designers with role/phone/email, map embed)
- `home.json` – SEO, `hero`, `intro` (title, text, statement, `parallaxImage`), `process` (4 items, icons in index.astro), `faq`, `cta`
- `services.json` – SEO, intro, pillars, `services` (9, each `slug` → `/projekty/#<slug>`, local thumbnail `image`), `pricing` (`price` text + optional numeric `amount` for schema)
- `about.json` (paragraphs may contain `<strong>`), `contact.json`, `references.json` (page SEO + intro)
- `references/<slug>.json` – one file per room (9, matching services 1:1): `order`, `slug`, `tag`, `title`, `text`, `images: [{ src, alt, hidden }]`

`site.nav` stays in code. Derived helpers: `site.company.address/phones/emails`, `telHref()`. Machine-readable facts for agents: `src/lib/site-data.ts`.

## Page-Specific Notes

### `/` (index.astro)

1. Hero (`HeroSection`) — full bleed with Cloudinary image, two CTAs (`hero-primary`, `hero-outline`).
2. "Jak pracujeme" — two-column: `SectionIntro` + consumer-focused blockquote (large `&ldquo;` quote mark, "PRO KLIENTA" eyebrow).
3. Parallax strip "Čím se zabýváme" (`ParallaxStrip`, medium height).
4. Services grid — 3×3 (md:2, lg:3). Each tile is `<a>` linking to `/projekty/#<slug>` with image zoom on hover (`group-hover:scale-110`), bottom-aligned "ZOBRAZIT GALERII →" hint that translates on hover.
5. Parallax strip "Náš přístup" (small height).
6. Process boxes — 4 items with primary/10 icon circles.
7. FAQ accordion (`FaqSection`).
8. CTA section — "Domluvit schůzku" primary button (full-width mobile via `fullWidth lg:w-auto`).

### `/projekty/` (projekty.astro)

Renders `ReferencesGallery` for each category. Sections have `id={slug}` for `/projekty/#<slug>` anchors with `scroll-mt-28` for sticky-header compensation. Galleries load Cloudinary images by tag at runtime via `https://res.cloudinary.com/{cloud}/image/list/{tag}.json` and bind Fancybox to all `[data-fancybox]` elements.

### `/sluzby/` (sluzby.astro)

Two info cards + pricing table + "Poptat projekt" CTA.

### `/o-nas/` (o-nas.astro)

Designer info block.

### `/kontakt/` (kontakt.astro)

Two designer tiles side-by-side (`md:grid-cols-2`), each with role + name + email/phone pills (icon in primary/10 circle, hover → primary/white). Below: Atelier address card (MapPin icon, address, route link, legal info) + Google Maps iframe (`self-start`). Then the inquiry form: builds a `mailto:` e-mail (no mail server); plain `mailto` POST without JS; WebMCP `prefill_inquiry` can fill it.

## SEO / Metadata

- Per-page `title`, `description` (from CMS `seo`), keywords, canonical, hreflang, Open Graph, Twitter, geo meta in `BaseLayout`.
- JSON-LD `@graph` (`src/lib/structured-data.ts`): `WebSite`, `ProfessionalService`+`HomeAndConstructionBusiness`, `Person` ×2, `OfferCatalog`, per-page `WebPage`/`AboutPage`/`ContactPage`/`CollectionPage`, `BreadcrumbList`, `FAQPage` (home), `Service` (služby), `ImageGallery` (projekty, CMS images).
- Generated `sitemap.xml` (with image entries) and `llms.txt`; `robots.txt` in `/public`.
- One `<h1>` per page (`SectionIntro level={1}` on subpages).

## Tracking

- **Google Tag Manager**: `GTM-542MMSL` (same container as the live site). Standard snippet in `BaseLayout` `<head>`, noscript iframe right after `<body>`. Uses the default `dataLayer` global (the live site uses `_gtmDataLayer`; we use the standard name for better GA4/3rd-party compatibility).

## Admin / CMS (`/admin/`)

Implemented with **Decap CMS** (replaces the earlier magic-link plan):

- Config `public/admin/config.yml` – collections *Reference* (folder, one entry per room), *Stránky*, *Nastavení*; Czech UI; editorial workflow (drafts are PRs → preview build → publish).
- Custom widgets: `room-gallery` (`gallery-manager.js`), `cloud-image` (`media-widgets.js`); uploads in `cloudinary-upload.js` go straight to Cloudinary (`CrystalInteriors/Reference/<slug>`, `CrystalInteriors/Web`), signed by `functions/api/cloudinary.ts` for GitHub users with push access.
- Editor UX: driver.js guided tours + help button + removal confirmations (`admin-ux.js`), publish progress panel polling `/build.json` (`publish-status.js`).
- Auth: GitHub OAuth via `functions/api/auth.ts` + `callback.ts` (env `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `CLOUDINARY_URL`). Works only on Cloudflare Pages (`base_url` in config). Local: `bun run cms:local`.

## Editorial / Copy Rules

- Czech only. Tone: clear, premium, customer-outcome focused.
- Shorter than the live site, but preserve meaning. Reword for clarity.
- Phone numbers/emails are clickable (`tel:`/`mailto:`).
- Names of designers: Lucie Vodáková, Hanka Neklapilová (both "Designérka").

## UX Rules

- Support light and dark theme; respect `prefers-color-scheme` on first load.
- All interactive elements meet 44px tap-target minimum (`min-h-11` on buttons).
- Focus rings via `focus-visible:ring-2 ring-primary ring-offset-2`.
- Respect `prefers-reduced-motion` (parallax fallback, hover transitions, hero zoom).
- Mobile-first responsive: full-width CTAs on `<sm`, side-by-side `≥sm`.

## Conventions

- Centralize copy in `src/data/content/*.json` (CMS) and read it through `src/data/site.ts`; never hardcode copy in templates.
- Images: use `<CloudImage>` (Cloudinary `f_auto`/`q_auto`/`srcset`, fixed width/height); the LCP hero gets `priority` + preload via `heroPreload()`.
- Agents (WebMCP/MCP) are read-only or prefill-only — never submit the inquiry form for a visitor.
- New design tokens go in the `@theme` block, not in component-scoped CSS.
- Component-scoped `<style>` only for things Tailwind can't express cleanly: compound `:nth-child` selectors, `clamp()` with `vw`, multi-stop `radial-gradient` with `color-mix()`, runtime `transition-delay: calc(var(--i) * 60ms)` patterns.
- For dark-section components, use `outline-on-dark` Button variant or the hero variants rather than inverting colors ad-hoc.
- New SVG assets: include `viewBox` tightly cropped to content (no whitespace bleed).

## Build & Dev

- `bun run dev` — concurrent Tailwind watcher + Astro dev server
- `bun run cms:local` — local Decap backend (edit at `http://localhost:4321/admin/`, writes files directly)
- `bun run build` — minify CSS → `astro check` → TypeScript 7 `tsc --noEmit` → `astro build`
- `bun run icons` — regenerate favicon/PWA icons (`scripts/generate-icons.mjs`)
- `bun run preview` — preview production build
- `/dist` is gitignored. `public/styles/tailwind.css` is generated (by `bun run dev`/`build`) but committed – regenerate it, never edit by hand.
- After editing `public/admin/*.js`, bump `?v=` in `public/admin/index.html`.
