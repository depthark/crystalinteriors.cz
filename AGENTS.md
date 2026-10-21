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
| Images | AVIF image sets in the repo – no image CDN. CMS compresses in the browser (Squoosh AVIF codec via jSquash 2.1 WASM, Lanczos3 resize, smartcrop 2.0 focus point) in module workers; widths 400/800/1200/1800/2400, never upscaled; tiles ≤800 px, lightbox `srcset` ≥1200 px, `sizes="auto"`, focus via `object-position` | — | `public/admin/image-pipeline.js` + `image-worker.js` + `vendor/`, `src/lib/image-set.ts`, `src/components/ui/ResponsiveImage.astro`, `scripts/image-set.mjs` (sharp + smartcrop-sharp) |
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
| Icons | `sharp` – favicon / PWA icons generated from the official logo | 0.35 | `bun run icons` → `scripts/generate-icons.mjs` |
| SEO | Per-page meta/OG/Twitter, schema.org JSON-LD graph, generated `sitemap.xml` (+ images), `robots.txt` | — | `src/lib/structured-data.ts`, `src/pages/sitemap.xml.ts` |
| Share images | `sharp` text + composite → `/og/<page>.jpg` with logo, Playfair title, royal/lavender light | — | `src/lib/og-image.ts`, `src/pages/og/[slug].jpg.ts` |
| AI agents | `llms.txt`, `/agent/site.json`, WebMCP tools, read-only MCP server | — | `src/pages/llms.txt.ts`, `src/components/agent/WebMcp.astro`, `functions/mcp.ts` |
| Fonts | Google Fonts – Playfair Display (h1–h3), Manrope (UI), Inter (body) | — | `BaseLayout.astro`, `global.css` |
| Rich text | `marked` – Markdown from the CMS editor → HTML (project descriptions) | 18 | `src/lib/markdown.ts` |
| Dev scripts | `npm-run-all` (parallel CSS watch + Astro dev) | 4.1 | `bun run dev` |

All packages are on their latest release (`bun outdated` is clean) except two deliberate holds: `typescript` stays on 6 for `@astrojs/check`, and `@types/node` follows the Node 24 LTS line.

Installed but currently unused: `@googlemaps/js-api-loader`, `@toolwind/anchors`.

Hosting today: **GitHub Pages** (`.github/workflows/static.yml`, on push to `main`, base path `/crystalinteriors.cz/` via `PUBLIC_BASE_PATH`). Target: **Cloudflare Pages** at `https://www.crystalinteriors.cz` – needed for `/admin/` login and `/mcp` (see `DEPLOY.md`). Everything public (pages, PWA, sitemap, llms.txt) works on both; paths go through `import.meta.env.BASE_URL` / `withBase()`, and `public/sw.js` + `manifest.webmanifest` are scope-relative.

## Design System

All design tokens live in `public/styles/tailwind.source.css` under `@theme`. Components reference them via Tailwind utilities (`bg-primary`, `text-muted`, `rounded-2xl`, `duration-fast`, etc.). Notable buckets:

- **Color**: `action` / `action-hover` / `on-action` (filled buttons & CTAs – near-black in light, warm off-white in dark), `primary` (purple #7C50A8 / dark #BA9ADD – **text accents only**: eyebrows, links, thin lines, icon tints, focus; no gold anywhere, per client), `accent` (light lavender for lines/glows), `secondary`, surface/background, ink (dark sections), border, foreground/muted/subtle. Dark theme override under `[data-theme="dark"]`. Never fill large areas or buttons with purple.
- **Logo**: the only web logo is the vector `public/images/logos/crystalinteriors_logo-white.svg` – the client's original artwork (`public/images/logos/original/`: SVG/EPS/PDF, plum `#44013F`) recoloured white, artboard clip removed and a 4-unit margin added so the ring is never shaved. The ring is intentionally open around the script and tagline (original design). Never redraw it; regenerate icons with `bun run icons` after changing it.
- **Royal purple** `royal` / `royal-soft` (#5B2C83, from the original identity; dark mode tint #B79AD6): a second, sparing accent – hero and CTA glows, active nav underline, open FAQ marker, text selection, share images. Never for large fills or body text blocks.
- **Typography**: `--font-serif` Playfair Display for h1–h3 (set in `global.css`), `--font-display` Manrope for UI/buttons/small headings, `--font-sans` Inter for body. Chosen with the ui-ux-pro-max skill ("Classic Elegant" pairing) to match the script logo.
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
- `src/components/MobileMenu.astro` — disclosure nav (toggle `aria-expanded`/`aria-controls`), **not** a second header: the panel (fixed, `z-modal`) holds only links, CTA and social icons and slides out *under* the real header – SiteHeader's logo link, theme toggle and the hamburger (→ X) sit at `z-modal + 1`, so the header looks identical open or closed. While open: `main`/`footer` are `inert`, body scroll-locked, focus moves to the first link; Escape/X/link click close it. Never duplicate the logo or a close button inside the panel.
- `src/components/SiteFooter.astro` — three-column footer with brand, atelier, social. Bottom row shows legal info (Provozovatel, IČO, sídlo) + copyright.

### Reusable

- `src/components/ui/Button.astro` — `tailwind-variants` styled. Variants: `primary`, `secondary`, `outline`, `outline-on-dark`, `ghost`, `hero-primary`, `hero-outline`. Sizes: `sm`, `md`, `lg`. `fullWidth` prop for `w-full sm:w-auto` mobile pattern. Min tap target 44px (`min-h-11`).
- `src/components/ui/IconButton.astro` — icon-only round button.
- `src/components/SectionIntro.astro` — eyebrow + heading + lead; `level={1}` renders the page `<h1>`.
- `src/components/FaqSection.astro` — native `<details name>` accordion (CMS FAQ, also FAQPage schema).
- `src/components/ui/ResponsiveImage.astro` — responsive AVIF image from an image set (`src/lib/image-set.ts`): srcset/sizes (`auto` when lazy), `max` width cap, `focus` → object-position, no CLS; plain `<img>` for other paths.
- `src/components/agent/WebMcp.astro` — WebMCP tools for in-browser AI agents.
- `src/components/SocialLinks.astro` — reusable Facebook (solid filled) + Instagram (outline) icons with `title` tooltip, `aria-label`, `sr-only` text, `focus-visible:ring`. `variant: inline | card`, `align: left | right | center`.
- `src/components/ParallaxStrip.astro` — full-width banner with `background-attachment: fixed` parallax (mobile/iOS fallback to `scroll` via `@media (hover: none)` + `prefers-reduced-motion`). Used on homepage between sections; image `home.json → intro.parallaxImage` (image set in `public/gallery/web/`; 1800 px desktop, 1200 px on touch).
- `src/components/HeroSection.astro` — full-bleed hero with an image set (LCP, preloaded), ink overlay, official logo (`/images/logos/crystalinteriors_logo-white.svg`), eyebrow + serif title + CTAs (white `hero-primary`), staggered motion-safe entrance and a 3× scroll cue.
- `src/components/ProjectSection.astro` — one project (title, subtitle, rich-text description, gallery) from `getProjectMedia()` (`src/lib/gallery.ts`: CMS list → image sets in `public/gallery/projekty/<slug>/`); tiles ≤800 px with focus crop, Fancybox lightbox with its own srcset (≥1200 px) and 400 px thumbs.

### Icons

`src/components/icons/*.astro` — Heroicons-style 1.5 stroke outline:

`ArrowRightIcon`, `ChevronDownIcon`, `ClockIcon`, `EnvelopeIcon`, `FacebookIcon` (solid filled), `InstagramIcon` (outline), `LanguageIcon`, `MagnifyIcon`, `MapPinIcon`, `MoonIcon`, `PhoneIcon`, `SadFaceIcon`, `SendIcon`, `SparklesIcon`, `SunIcon`, `UserGroupIcon`, `WrenchScrewdriverIcon`.

## Data Layer

Content is edited in Decap CMS and stored as JSON in `src/data/content/`; `src/data/site.ts` composes it into one typed `site` object (components never import JSON directly):

- `settings.json` – name, tagline, description, keywords, social, `company` (legal info, address parts, geo, opening hours, designers with role/phone/email, map embed)
- `home.json` – SEO, `hero`, `intro` (title, text, statement, `parallaxImage`), `process` (4 items, icons in index.astro), `faq`, `cta`
- `services.json` – SEO, intro, pillars, `services` (9 cards with local thumbnail `image`, shown on the home page in "Co navrhujeme"), `pricing` (`price` text + optional numeric `amount` for schema)
- `about.json` (paragraphs may contain `<strong>`), `contact.json`, `references.json` (page SEO + intro)
- `projects/<slug>.json` – one file per project (CMS collection *Projekty*): `order`, `slug`, `title` (Nadpis), optional `subtitle` (Podnadpis), `text` (Popis – Markdown from the CMS rich-text editor: bold, italics, bullet/numbered lists, links; rendered by `src/lib/markdown.ts` with `marked`), `images: [{ src, alt, hidden }]`, optional `tag`. Projects, not room types (client decision); the page shows an empty state until the first project is added.

`site.nav` stays in code. Derived helpers: `site.company.address/phones/emails`, `telHref()`. Machine-readable facts for agents: `src/lib/site-data.ts`.

## Page-Specific Notes

### `/` (index.astro)

1. Hero (`HeroSection`) — full bleed with an image set, two CTAs (`hero-primary`, `hero-outline`).
2. "Jak pracujeme" — two-column: `SectionIntro` + consumer-focused blockquote (large `&ldquo;` quote mark, "PRO KLIENTA" eyebrow).
3. Parallax strip "Čím se zabýváme" (medium height).
4. `#co-navrhujeme` — "Co navrhujeme" photo cards (9 services from `services.json`), 3×3; **not links** (client: no click-through to another page from this section).
5. Parallax strip "Náš přístup" (small height).
6. Process boxes — 4 items with primary/10 icon circles.
7. FAQ accordion (`FaqSection`).
8. CTA section — "Domluvit schůzku" primary button (full-width mobile via `fullWidth lg:w-auto`).

### `/projekty/` (projekty.astro)

Renders `ProjectSection` for each project (CMS *Projekty*), or an empty state with a consultation CTA when there are none. Sections have `id={slug}` for `/projekty/#<slug>` anchors with `scroll-mt-28`. Fancybox binds to all `[data-fancybox]` elements.

### `/sluzby/` (sluzby.astro)

Two info cards + pricing table + "Poptat projekt" CTA (service photo cards live on the home page).

### `/o-nas/` (o-nas.astro)

Designer info block.

### `/kontakt/` (kontakt.astro)

Two designer tiles side-by-side (`md:grid-cols-2`), each with role + name + email/phone pills (icon in primary/10 circle, hover → primary/white). Below: Atelier address card (MapPin icon, address, route link, legal info) + Google Maps iframe (`self-start`). Then the inquiry form: posts to `/api/inquiry` (Resend → both designers), falls back to a prepared `mailto:` e-mail when the function is unavailable; WebMCP `prefill_inquiry` can fill it but never sends.

## SEO / Metadata

- Per-page `title`, `description` (from CMS `seo`), keywords, canonical, hreflang, Open Graph, Twitter, geo meta in `BaseLayout`.
- JSON-LD `@graph` (`src/lib/structured-data.ts`): `WebSite`, `ProfessionalService`+`HomeAndConstructionBusiness`, `Person` ×2, `OfferCatalog`, per-page `WebPage`/`AboutPage`/`ContactPage`/`CollectionPage`, `BreadcrumbList`, `FAQPage` (home), `Service` (služby), `ImageGallery` per project (projekty).
- Generated `sitemap.xml` (with image entries) and `llms.txt`; `robots.txt` in `/public`.
- Share images: `/og/<page>.jpg` (1200×630) rendered at build by `src/lib/og-image.ts` + `src/pages/og/[slug].jpg.ts` with sharp – official logo, page title in Playfair (font files in `src/assets/fonts/`, OFL), royal + lavender light over a local project photo. `BaseLayout` uses them for og/twitter and `primaryImageOfPage` unless a page passes `image`.
- One `<h1>` per page (`SectionIntro level={1}` on subpages).

## Tracking

- **Google Tag Manager**: `GTM-542MMSL` (same container as the live site). Standard snippet in `BaseLayout` `<head>`, noscript iframe right after `<body>`. Uses the default `dataLayer` global (the live site uses `_gtmDataLayer`; we use the standard name for better GA4/3rd-party compatibility).

## Admin / CMS (`/admin/`)

Implemented with **Decap CMS** (replaces the earlier magic-link plan):

- Config `public/admin/config.yml` – collections *Projekty* (folder, one entry per project), *Stránky*, *Nastavení*; Czech UI; editorial workflow (drafts are PRs → preview build → publish).
- Custom widgets: `project-gallery` (`gallery-manager.js`: upload, order, alt, hide, focus-point editor) and `photo` (`media-widgets.js`: single photo, value = image-set base path).
- Photo pipeline (project-agnostic, reusable in other Decap sites): `image-pipeline.js` compresses in the browser – module-worker pool (`image-worker.js`) with the vendored Squoosh AVIF encoder + Lanczos3 resize (`vendor/`), widths 400–2400 never upscaled, smartcrop focus; `repo-store.js` commits all files of an upload in one `[skip ci]` commit via the GitHub Git Data API with the editor's CMS token (locally via `decap-server`). Files: `public/gallery/projekty/<slug>/`, `public/gallery/web/`. Removed photos stay in the repo.
- Editor UX: driver.js guided tours + help button + removal confirmations (`admin-ux.js`), publish progress panel polling `/build.json` (`publish-status.js`).
- Auth: GitHub OAuth via `functions/api/auth.ts` + `callback.ts` (env `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`). Works only on Cloudflare Pages (`base_url` in config). Local: `bun run cms:local`.

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
- Scroll reveals are CSS-first (`global.css`): `data-reveal` (rise) / `data-reveal="fade"`, scroll-driven `animation-timeline: view()` with range `entry 0%–40%` (always completes, even at page end); stagger siblings with `style="--reveal-i: n"`. No JS observers.
- Anchors: `html { scroll-padding-block-start: calc(var(--header-height) + 1rem) }` keeps every `#id` jump clear of the sticky header – don't add per-element `scroll-margin`/`scroll-mt-*`.
- Mobile-first responsive: full-width CTAs on `<sm`, side-by-side `≥sm`.

## Conventions

- Centralize copy in `src/data/content/*.json` (CMS) and read it through `src/data/site.ts`; never hardcode copy in templates.
- Images: use `<ResponsiveImage>` with an image-set path (AVIF only, no WebP/JPEG fallbacks, fixed width/height, `max` for small boxes); the LCP hero gets `priority` + preload via `heroPreload()`. Never add an image CDN.
- Agents (WebMCP/MCP) are read-only or prefill-only — never submit the inquiry form for a visitor.
- New design tokens go in the `@theme` block, not in component-scoped CSS.
- Component-scoped `<style>` only for things Tailwind can't express cleanly: compound `:nth-child` selectors, `clamp()` with `vw`, multi-stop `radial-gradient` with `color-mix()`, runtime `transition-delay: calc(var(--i) * 60ms)` patterns.
- For dark-section components, use `outline-on-dark` Button variant or the hero variants rather than inverting colors ad-hoc.
- New SVG assets: include `viewBox` tightly cropped to content (no whitespace bleed).

## Build & Dev

- `bun run dev` — concurrent Tailwind watcher + Astro dev server
- `bun run cms:local` — local Decap backend (edit at `http://localhost:4321/admin/`, writes files directly)
- `bun run build` — minify CSS → `astro check` → TypeScript 7 `tsc --noEmit` → `astro build`
- `bun run image-set <file-or-url> /gallery/<group>/<name>` — make an image set locally (sharp + smartcrop-sharp), prints `{ src, focus, … }`
- `bun run icons` — regenerate favicon/PWA icons from the official logo (`scripts/generate-icons.mjs`: full logo for app/maskable/apple icons, crystal crop for small favicons), then `convert favicon-48x48.png -define icon:auto-resize=48,32,16 favicon.ico`
- `bun run preview` — preview production build
- `/dist` is gitignored. `public/styles/tailwind.css` is generated (by `bun run dev`/`build`) but committed – regenerate it, never edit by hand.
- After editing `public/admin/*.js`, bump `?v=` in `public/admin/index.html`.
