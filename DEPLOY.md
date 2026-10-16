# Nasazení a správa obsahu – Cloudflare Pages + Decap CMS + Cloudinary

Web je statický Astro build na **Cloudflare Pages**. Složka `functions/` přidává
na stejné doméně tři malé serverové funkce:

| Cesta | Soubor | K čemu |
| --- | --- | --- |
| `/api/auth`, `/api/callback` | `functions/api/auth.ts`, `callback.ts` | Přihlášení do administrace přes GitHub (OAuth) |
| `/api/cloudinary` | `functions/api/cloudinary.ts` | Podepisuje nahrávání fotek do Cloudinary – editorky nepotřebují účet v Cloudinary |
| `/mcp` | `functions/mcp.ts` | Read-only MCP server pro AI agenty |

## 1. Cloudflare Pages – jednorázově

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git** → repozitář `Luko248/crystalinteriors.cz`.
2. Build:
   - **Production branch:** `main`
   - **Build command:** `bun run build`
   - **Build output directory:** `dist`
3. **Settings → Variables and Secrets** (Production i Preview):

   | Proměnná | Hodnota | Typ |
   | --- | --- | --- |
   | `PUBLIC_CLOUDINARY_CLOUD_NAME` | název cloudu v Cloudinary | text |
   | `PUBLIC_SITE_URL` | `https://www.crystalinteriors.cz` | text |
   | `CLOUDINARY_URL` | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` | **Secret** |
   | `GITHUB_CLIENT_ID` | z kroku 2 | text |
   | `GITHUB_CLIENT_SECRET` | z kroku 2 | **Secret** |
   | `DEPLOY_HOOK_URL` | volitelně – *Settings → Builds → Deploy hooks* | Secret |
   | `BUN_VERSION` | volitelně, např. `1.3.1` | text |

4. **Custom domains** → `www.crystalinteriors.cz` (+ přesměrování z `crystalinteriors.cz`).

## 2. Přihlášení do administrace (GitHub OAuth)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: `https://www.crystalinteriors.cz`
   - Authorization callback URL: `https://www.crystalinteriors.cz/api/callback`
2. Zkopírujte **Client ID**, vygenerujte **Client secret** a vložte je do Cloudflare (tabulka výše). Redeploy.
3. Každá editorka potřebuje GitHub účet s právem **Write** do repozitáře (*Repo → Settings → Collaborators*).

> `public/admin/config.yml` má `base_url: https://www.crystalinteriors.cz` a `branch: main`.
> Přihlášení proto funguje na produkční doméně, ne na `*.pages.dev`.

## 3. Cloudinary

- **Settings → Security → Strict transformations: vypnuto** (web si říká o velikosti a formáty – AVIF/WebP – sám).
- **Settings → Security → Allowed fetch domains**: přidejte domény původních obrázků (např. `d9775ec23a.clvaw-cdnwnd.com`), nebo nechte prázdné.
- Fotky z administrace se ukládají do `CrystalInteriors/Reference/<sekce>` a `CrystalInteriors/Web`.
- *(Volitelné)* Náhradní zdroj galerií: sekce bez fotek v CMS načte za běhu fotky s tagem (`kuchyne`, `loznice`…). Vyžaduje **Security → Restricted media types → odškrtnout „Resource list“**.

## 4. Jak editorky pracují (`/admin/`)

1. `https://www.crystalinteriors.cz/admin/` → **Přihlásit se přes GitHub**.
2. Při prvním otevření každé obrazovky se spustí **průvodce** (driver.js); kdykoli znovu přes **Nápověda** vlevo dole.
3. **Reference** – jedna položka = jedna sekce galerie. *Nahrát fotky* (i víc najednou, přetažením), doplnit *Popis fotky*, hvězdičkou vybrat hlavní fotku, šipkami pořadí.
4. **Stránky** – texty, služby, ceník, časté dotazy, SEO titulky a popisy.
5. **Nastavení** – kontakty, adresa, otevírací doba, sociální sítě.
6. **Uložit** → vznikne koncept (pull request, Cloudflare postaví náhled) → **Publikovat → Publikovat nyní**. Panel vpravo dole hlídá sestavení (`/build.json`) a ohlásí, až je změna na webu (2–3 min).

Před každým odebráním se administrace zeptá. Odebraná fotka v Cloudinary zůstává.

## 5. Lokální vývoj

```bash
bun install
bun run dev          # http://localhost:4321
bun run cms:local    # ve druhém terminálu → http://localhost:4321/admin/ (zapisuje přímo do souborů)
bun run build        # css → astro check → astro build
bun run icons        # přegeneruje favicony / PWA ikony ze scripts/generate-icons.mjs
```

## 6. Kontrola po nasazení

- `/admin/` – přihlášení, úprava textu, publikování.
- [Rich Results Test](https://search.google.com/test/rich-results) – LocalBusiness, FAQPage, BreadcrumbList, Service.
- Lighthouse (mobil) – výkon, přístupnost, SEO, PWA (instalace z prohlížeče).
- `/llms.txt`, `/agent/site.json`, `/sitemap.xml`
- MCP: `curl -s https://www.crystalinteriors.cz/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
- Google Search Console → odeslat `sitemap.xml`.
