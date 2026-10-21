# Nasazení a správa obsahu – Cloudflare Pages + Decap CMS

Web je statický Astro build na **Cloudflare Pages**. Složka `functions/` přidává
na stejné doméně pár malých serverových funkcí:

| Cesta | Soubor | K čemu |
| --- | --- | --- |
| `/api/auth`, `/api/callback` | `functions/api/auth.ts`, `callback.ts` | Přihlášení do administrace přes GitHub (OAuth) |
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
   | `PUBLIC_SITE_URL` | `https://www.crystalinteriors.cz` | text |
   | `GITHUB_CLIENT_ID` | z kroku 2 | text |
   | `GITHUB_CLIENT_SECRET` | z kroku 2 | **Secret** |
   | `DEPLOY_HOOK_URL` | volitelně – *Settings → Builds → Deploy hooks* | Secret |
   | `RESEND_API_KEY` | Resend API klíč (jen *Sending access*) – viz krok 4 | **Secret** |
   | `INQUIRY_FROM` | volitelně, výchozí `Crystal Interiors <web@crystalinteriors.cz>` | text |
   | `INQUIRY_TO` | volitelně – příjemci oddělení čárkou (jinak *Komu chodí poptávky* z CMS) | text |
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

## 3. Fotky – v repozitáři, bez obrazové služby

**Jak to funguje**

1. Editorka v administraci vybere fotky (*Projekty → projekt → Nahrát fotky*, nebo pole *Fotka* u hero / pásů / služeb).
2. **Prohlížeč je sám zmenší a zkomprimuje** do AVIF (kodek ze Squoosh, běží ve Web Workerech): šířky 400, 800, 1200, 1800 a 2400 px – menší fotky se nikdy nezvětšují. Zároveň spočítá **ohnisko** (co má zůstat vidět, když dlaždice fotku ořízne na 4:3); editorka ho může kliknutím upravit.
3. Soubory se uloží **jedním commitem** do `public/gallery/projekty/<projekt>/` (resp. `public/gallery/web/`) přes GitHub API s jejím přihlášením. Commit má `[skip ci]`, takže nahrání nespouští build – fotky se objeví na webu s nejbližším publikováním.
4. CMS uloží do `src/data/content/projects/<projekt>.json` cestu, popisek, skrytí a ohnisko. Web čte šířky a rozměry přímo ze souborů.

**Co web stahuje**: dlaždice max. 800 px (2× pro Retinu), první velká dlaždice 1200 px, zvětšení ve Fancyboxu 1200–2400 px podle displeje – telefon nikdy nestáhne 2400 px.

- Žádné účty ani klíče navíc – fotky i obsah jsou v GitHubu klienta.
- Odebraná fotka v repozitáři zůstává (lze ji vrátit).
- Hromadný import mimo administraci: `bun run image-set <soubor-nebo-url> /gallery/<skupina>/<název>`.

## 4. E-mail – schránky na Webnode, formulář přes Resend

- **Schránky `@crystalinteriors.cz` zůstávají na Webnode** (`imap.mail.webnode.com`).
  Záznamy MX, SPF, DMARC, DKIM (`mail`, `key-wb001`, `key-wb002._domainkey`), `autoconfig` a `_autodiscover._tcp` musí být v DNS
  beze změny (viz `ROLLBACK.md`). Předplatné Webnode nerušte, dokud schránky
  nejsou přesunuté jinam – jinak pošta přestane fungovat.
- **Formulář na `/kontakt/`** posílá poptávku přes `/api/inquiry` a Resend na adresy
  z CMS (*Stránky → Kontakt → Formulář → Komu chodí poptávky*, teď jen Lucie), `Reply-To` je adresa zákazníka.
  Když funkce není dostupná (chybí klíč, výpadek), stránka otevře
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
3. **Projekty** – jedna položka = jeden projekt: nadpis, podnadpis, popis (tučné písmo, odrážky, číslovaný seznam, odkazy) a galerie. *Nahrát fotky* (i víc najednou, přetažením – prohlížeč je zmenší a zkomprimuje), kliknutím na fotku nastavit výřez náhledu, doplnit *Popis fotky*, hvězdičkou vybrat hlavní fotku, šipkami pořadí.
4. **Stránky** – texty, služby, ceník, časté dotazy, SEO titulky a popisy.
5. **Nastavení** – kontakty, adresa, otevírací doba, sociální sítě.
6. **Uložit** → vznikne koncept (pull request, Cloudflare postaví náhled) → **Publikovat → Publikovat nyní**. Panel vpravo dole hlídá sestavení (`/build.json`) a ohlásí, až je změna na webu (2–3 min).

Před každým odebráním se administrace zeptá. Odebraná fotka v repozitáři zůstává.

## 6. Lokální vývoj

```bash
bun install
bun run dev          # http://localhost:4321
bun run cms:local    # ve druhém terminálu → http://localhost:4321/admin/ (zapisuje přímo do souborů)
bun run build        # css → astro check + TS 7 → astro build
bun run image-set <soubor-nebo-url> /gallery/<skupina>/<název>   # AVIF sada fotky lokálně
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
