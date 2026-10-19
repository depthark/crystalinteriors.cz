# Nasazení a správa obsahu – Cloudflare Pages + Decap CMS + Cloudinary

Web je statický Astro build na **Cloudflare Pages**. Složka `functions/` přidává
na stejné doméně tři malé serverové funkce:

| Cesta | Soubor | K čemu |
| --- | --- | --- |
| `/api/auth`, `/api/callback` | `functions/api/auth.ts`, `callback.ts` | Přihlášení do administrace přes GitHub (OAuth) |
| `/api/cloudinary` | `functions/api/cloudinary.ts` | Podepisuje nahrávání fotek do Cloudinary – editorky nepotřebují účet v Cloudinary |
| `/api/inquiry` | `functions/api/inquiry.ts` | Odešle poptávku z formuláře na `/kontakt/` e-mailem přes Resend |
| `/mcp` | `functions/mcp.ts` | Read-only MCP server pro AI agenty |

## 1. Cloudflare Pages – jednorázově

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git** → repozitář `depthark/crystalinteriors.cz`.
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
   | `RESEND_API_KEY` | Resend API klíč (jen *Sending access*) – viz krok 4 | **Secret** |
   | `INQUIRY_FROM` | volitelně, výchozí `Crystal Interiors <web@crystalinteriors.cz>` | text |
   | `INQUIRY_TO` | volitelně – příjemci oddělení čárkou (jinak kontakty z CMS) | text |
   | `BUN_VERSION` | `1.4.3` | text |
   | `NODE_VERSION` | `24` (také v `.node-version`) | text |

4. **Custom domains** → `www.crystalinteriors.cz` (+ přesměrování z `crystalinteriors.cz`).

## 2. Přihlášení do administrace (GitHub OAuth)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: `https://www.crystalinteriors.cz`
   - Authorization callback URL: `https://www.crystalinteriors.cz/api/callback`
2. Zkopírujte **Client ID**, vygenerujte **Client secret** a vložte je do Cloudflare (tabulka výše). Redeploy.
3. Každá editorka potřebuje GitHub účet s právem **Write** do repozitáře (*Repo → Settings → Collaborators*).

> `public/admin/config.yml` má `base_url: https://www.crystalinteriors.cz` a `branch: main`.
> Přihlášení proto funguje na produkční doméně, ne na `*.pages.dev`.

## 3. Cloudinary (stejně jako anewstyle.cz)

**Jak to funguje**

1. Editorka v administraci nahraje fotky / videa (*Projekty → projekt → Nahrát fotky / videa*). Soubory jdou přímo z prohlížeče do Cloudinary, do složky `CrystalInteriors/Projekty/<projekt>` (např. `…/kuchyne-lesna`). Nahrání podepisuje `/api/cloudinary` – jen pro přihlášené s právem zápisu do repozitáře, editorky nepotřebují účet v Cloudinary.
2. CMS uloží do `src/data/content/projects/<projekt>.json` pořadí, popisky a skryté položky.
3. Při každém buildu `scripts/build-cloudinary-gallery.mjs` načte (Admin Search API, `CLOUDINARY_URL`) všechny fotky a videa ze složek sekcí, spojí je s údaji z CMS a zapíše `public/data/projects-gallery.json` (náhledy 4:3 se `srcset`, AVIF/WebP přes `f_auto`, videa MP4 + náhled). Stránka Projekty, schema.org, sitemap i `/agent/site.json` čtou tenhle soubor.

**Co se zobrazí**

- Sekce **má fotky v CMS** → přesně ty, v pořadí z CMS (skryté vynechá). Soubory, které jsou jen v Cloudinary, build vypíše a nezobrazí – editorka je přidá tlačítkem **Přidat z Cloudinary**.
- Sekce **nemá v CMS nic** → automaticky vše ze složky v Cloudinary (popisek z názvu souboru).
- Bez `CLOUDINARY_URL` (nebo při výpadku API) build projde a použije fotky z CMS; prázdné sekce zkusí za běhu tag list (viz níže).

**Nastavení účtu**

- **Settings → Security → Strict transformations: vypnuto** (web si říká o velikosti a formáty sám).
- **Allowed fetch domains**: domény původních obrázků (např. `d9775ec23a.clvaw-cdnwnd.com`, `duyn491kcolsw.cloudfront.net`), nebo nechte prázdné.
- Fotky webu (hero, služby, sdílení) z administrace jdou do `CrystalInteriors/Web`.
- *(Volitelné)* Za běhu: sekce bez jakýchkoli fotek načte fotky s tagem (`kuchyne`, `loznice`…) – vyžaduje **Security → Restricted media types → odškrtnout „Resource list“**.
- `DEPLOY_HOOK_URL` (volitelně): po nahrání lze web přestavět i bez publikování.

**GitHub Pages build** (dočasný hosting): v repozitáři *Settings → Secrets and variables → Actions* přidejte secret `CLOUDINARY_URL` a variable `PUBLIC_CLOUDINARY_CLOUD_NAME` – workflow je už předává do buildu.

## 4. E-mail – schránky na Webnode, formulář přes Resend

- **Schránky `@crystalinteriors.cz` zůstávají na Webnode** (`imap.mail.webnode.com`).
  Záznamy MX, SPF, DMARC, `autoconfig` a `_autodiscover._tcp` musí být v DNS
  beze změny (viz `ROLLBACK.md`). Předplatné Webnode nerušte, dokud schránky
  nejsou přesunuté jinam – jinak pošta přestane fungovat.
- **Formulář na `/kontakt/`** posílá poptávku přes `/api/inquiry` a Resend oběma
  designérkám (kontakty z *Nastavení* v CMS), `Reply-To` je adresa zákazníka.
  Když funkce není dostupná (GitHub Pages, chybí klíč, výpadek), stránka otevře
  připravený e-mail v programu návštěvníka (`mailto:`).

Nastavení Resend (jednorázově):

1. <https://resend.com> → **Domains → Add domain** → `crystalinteriors.cz`, region EU.
2. Do Cloudflare DNS přidejte záznamy, které Resend ukáže (DKIM `resend._domainkey`
   TXT a pro subdoménu `send` MX + SPF TXT). **Kořenový MX ani SPF neměňte** –
   patří Webnode poště.
3. Po ověření domény: **API Keys → Create** s oprávněním *Sending access* jen pro
   tuto doménu → do Cloudflare jako `RESEND_API_KEY` (Secret). Redeploy.
4. Test: odešlete formulář na `/kontakt/` – e-mail musí dorazit do obou schránek.

## 5. Jak editorky pracují (`/admin/`)

1. `https://www.crystalinteriors.cz/admin/` → **Přihlásit se přes GitHub**.
2. Při prvním otevření každé obrazovky se spustí **průvodce** (driver.js); kdykoli znovu přes **Nápověda** vlevo dole.
3. **Projekty** – jedna položka = jeden projekt: nadpis, podnadpis, popis (tučné písmo, odrážky, číslovaný seznam, odkazy) a galerie. *Nahrát fotky / videa* (i víc najednou, přetažením), *Přidat z Cloudinary* (soubory už nahrané ve složce projektu), doplnit *Popis fotky*, hvězdičkou vybrat hlavní fotku, šipkami pořadí.
4. **Stránky** – texty, služby, ceník, časté dotazy, SEO titulky a popisy.
5. **Nastavení** – kontakty, adresa, otevírací doba, sociální sítě.
6. **Uložit** → vznikne koncept (pull request, Cloudflare postaví náhled) → **Publikovat → Publikovat nyní**. Panel vpravo dole hlídá sestavení (`/build.json`) a ohlásí, až je změna na webu (2–3 min).

Před každým odebráním se administrace zeptá. Odebraná fotka v Cloudinary zůstává.

## 6. Lokální vývoj

```bash
bun install
bun run dev          # http://localhost:4321
bun run cms:local    # ve druhém terminálu → http://localhost:4321/admin/ (zapisuje přímo do souborů)
bun run build        # css → Cloudinary galerie → astro check + TS 7 → astro build
bun run gallery:build # jen načtení galerií z Cloudinary (potřebuje CLOUDINARY_URL v .env)
bun run icons        # přegeneruje favicony / PWA ikony ze scripts/generate-icons.mjs
```

## 7. Kontrola po nasazení

- `/admin/` – přihlášení, úprava textu, publikování.
- `/kontakt/` – testovací poptávka dorazí do obou schránek; pošta na `@crystalinteriors.cz` dál chodí.
- [Rich Results Test](https://search.google.com/test/rich-results) – LocalBusiness, FAQPage, BreadcrumbList, Service.
- Lighthouse (mobil) – výkon, přístupnost, SEO, PWA (instalace z prohlížeče).
- `/llms.txt`, `/agent/site.json`, `/sitemap.xml`
- MCP: `curl -s https://www.crystalinteriors.cz/mcp -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`
- Google Search Console → odeslat `sitemap.xml`.
