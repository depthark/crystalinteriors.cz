# After the NSSET change – handoff for the next agent

Read this when the user says Webnode has switched the nameservers of
`crystalinteriors.cz` to Cloudflare. It lists what is already done, what to
verify first, and what is left. Also read `AGENTS.md`, `DEPLOY.md` and
`ROLLBACK.md`.

## State on 2026-10-21 (before the switch)

| Item | State |
| --- | --- |
| Website | Live on Cloudflare Pages, project `crystalinteriors-cz`, custom domain `www.crystalinteriors.cz` **Active, SSL enabled**. Builds on every push to `main` (`/build.json` shows the deployed commit). |
| Apex `crystalinteriors.cz` | Still on Webnode's servers (A `3.73.27.108`, `3.125.172.46`); Webnode answers with a 301 to `https://www.crystalinteriors.cz/<path>`. |
| Authoritative DNS | Webnode (`ns1/ns2.register.it`, NSSET `WEBNODE-TB`, DNSSEC KEYSET `M4WK-5CDA1`). `www` CNAME there already points to `crystalinteriors-cz.pages.dev.` |
| Cloudflare zone | `crystalinteriors.cz` in account `cd0a6bb94f3f52fc1bb5a13f6cde7b91` (Chylik.lukas@gmail.com), status **Pending**, assigned NS `lloyd.ns.cloudflare.com`, `michelle.ns.cloudflare.com`. Records mirror Webnode (table below). |
| NSSET request | Sent 2026-10-21 through Webnode's contact form (Domény → Nastavení domény, project `crystal-interiors-40`): change NSSET to lloyd/michelle **and remove KEYSET `M4WK-5CDA1`**. Reply goes to `chylik.lukas@gmail.com`. |
| E-mail | Mailboxes stay on Webnode (paid STANDARD package – must stay). MX/SPF/DKIM/DMARC/autoconfig/autodiscover are identical in both zones. |
| Contact form | Resend (account `lucka.voda`, EU region), domain `crystalinteriors.cz` **Verified** (domain id `3e0e22eb-1d74-4733-984c-87dfda32542c`). `RESEND_API_KEY` set as a Pages secret. Tested end to end: inquiry to both designers + confirmation to the customer, both *Delivered*. |
| CMS | Decap at `/admin/`, GitHub OAuth app "Crystal Interiors CMS" (callback `https://www.crystalinteriors.cz/api/callback`, token expiry off). `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` set as Pages secrets; `/api/auth` redirects to GitHub correctly. **First real login + photo upload through GitHub not tested yet.** |
| GitHub Pages | Switched off (site unpublished, workflow replaced by `.github/workflows/build.yml`, build check only). |
| Images | No image service: AVIF sets in `public/gallery/`, compressed in the CMS. Cloudinary is no longer used (its `CrystalInteriors` folder can be deleted). |
| Quality | Lighthouse 100/100/100/100 on all pages, mobile and desktop (`*.pages.dev` is `noindex` on purpose, so run SEO audits on `www`). |

### Expected DNS records (Cloudflare zone = Webnode zone, except `www`)

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `3.73.27.108` | DNS only – **replace in step 3** |
| A | `@` | `3.125.172.46` | DNS only – **replace in step 3** |
| CNAME | `www` | `crystalinteriors-cz.pages.dev` | **Proxied** |
| MX | `@` | `imap.mail.webnode.com` (priority 10) | DNS only |
| TXT | `@` | `v=spf1 a mx include:spfuser.webnode.com -all` | DNS only |
| CNAME | `_dmarc` | `_dmarc-user.webnode.com` | DNS only |
| CNAME | `mail._domainkey` | `dkimuser.webnode.com` | DNS only |
| CNAME | `key-wb001._domainkey` | `key-wb001._domainkey.webnode.com` | DNS only |
| CNAME | `key-wb002._domainkey` | `key-wb002._domainkey.webnode.com` | DNS only |
| CNAME | `autoconfig` | `tb-wb.securemail.pro` | DNS only |
| SRV | `_autodiscover._tcp` | `10 10 443 ms-wb.securemail.pro` | DNS only |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7xm2Yk9oPwK0inmuk1IwFrAAI4n7iyLONDM7f7r0upL9oL8aMNioryi7tOVJGYS4haIBe8ZnbSnllINCNrS+UcZ/hsbrpjmcHlBrjrtWBmDIYC2wMy3PgG3cXMX4YMPcVfNTQNqsJTyFwpwEjyJz79lCL5ud9WSD3kztAn1WJiwIDAQAB` | DNS only |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | DNS only |
| CNAME | `send` | `send.forge.rmta.net` | DNS only |

Never add Resend's "receiving" MX on `@` (priority 9 – it would take mail away
from Webnode). Never change the root MX or SPF.

## Ground rules

- DNS, registrar and Cloudflare settings change production. Confirm with the
  user before each change; the auto-mode classifier may block DNS edits –
  then give the user exact click-paths instead of working around it.
- Do not type secrets or passwords; the user enters them.
- Public DNS from the Mac terminal can be unreliable (sandbox); use DNS over
  HTTPS in the browser: `https://dns.google/query?name=<name>&rr_type=<TYPE>`.
- A wrong move is reversible with `ROLLBACK.md`.

## 1. Verify the switch

1. `whois crystalinteriors.cz` → `nsset` no longer `WEBNODE-TB`, nameservers
   `lloyd`/`michelle.ns.cloudflare.com`, **no `keyset` line** (if a keyset is
   still there, the domain may fail DNSSEC validation – ask Webnode to remove
   it immediately, or roll back).
2. dns.google: `NS crystalinteriors.cz` → lloyd/michelle; `DS crystalinteriors.cz`
   → empty.
3. Cloudflare → `crystalinteriors.cz` overview → **Active** ("Check nameservers
   now" if still pending).
4. dns.google for every row of the table above → values match (answers now
   come from Cloudflare).
5. Mail: send a test message to and from a `@crystalinteriors.cz` mailbox
   (ask the user); `MX`, `SPF`, `mail._domainkey` resolve as above.

## 2. Website on the Cloudflare zone

1. Workers & Pages → `crystalinteriors-cz` → Custom domains:
   `www.crystalinteriors.cz` still **Active**. If it asks to re-verify, the
   proxied `www` CNAME is already in the zone.
2. `https://www.crystalinteriors.cz/build.json` → current commit
   (`git rev-parse HEAD`).

## 3. Apex → www redirect (Cloudflare instead of Webnode)

1. DNS: delete the two Webnode A records on `@` and add `A @ 192.0.2.1`
   **Proxied** (placeholder; the redirect rule answers before any origin).
2. Rules → Redirect Rules → template "Redirect from root to WWW" (or custom):
   when hostname equals `crystalinteriors.cz` → dynamic
   `concat("https://www.crystalinteriors.cz", http.request.uri.path)`,
   **301**, preserve query string.
3. Test: `curl -sI http://crystalinteriors.cz/projekty/?a=1` and the https
   variant → `301` to `https://www.crystalinteriors.cz/projekty/?a=1`.

## 4. Zone settings (same as vila-scala.cz in this account)

- SSL/TLS → **Full (strict)**; Edge Certificates → Always Use HTTPS **on**,
  Automatic HTTPS Rewrites **on**, minimum TLS 1.2.
- Speed: leave Pages defaults (Brotli, HTTP/3); no Rocket Loader, no
  Auto Minify (assets are already minified/inlined).
- AI Crawl Control: Search **Allow**, Agent **Allow**, Training **Disallow**.
- Don't enable anything that injects scripts (Zaraz, Web Analytics beacon)
  without asking – the Lighthouse 100 budget is in `AGENTS.md`.

## 5. DNSSEC back on

1. Cloudflare → DNS → Settings → DNSSEC → Enable → note the DS / DNSKEY
   values (algorithm 13).
2. Webnode can't set it from the UI: send the values through the contact form
   (Domény → Nastavení domény) asking them to create a KEYSET for
   `crystalinteriors.cz` with that DNSKEY. Draft the text for the user.
3. When Cloudflare shows DNSSEC "Success", verify `DS` on dns.google and that
   `https://dnsviz.net/d/crystalinteriors.cz/` is green.

## 6. Search & checks

- Google Search Console (property already verified by the meta tag kept from
  the old site): submit `https://www.crystalinteriors.cz/sitemap.xml`,
  inspect `/` and `/projekty/`, request indexing.
- Rich Results Test on `/` (FAQPage, organisation) and `/projekty/`
  (ImageGallery).
- Lighthouse on `https://www.crystalinteriors.cz/` (mobile + desktop) – expect
  100s; on `www` SEO must be 100 (no `noindex`).
- Contact form on `www`: one real test, check Resend → Emails shows two
  *Delivered* messages.

## 7. Still open (independent of the NSSET)

- CMS: user logs in at `/admin/` with GitHub; then test a photo upload in a
  project (AVIF files must land in `public/gallery/projekty/<slug>/` with a
  `[skip ci]` commit, and appear after "Publikovat"). Invite Lucie and Hanka
  as repo collaborators (`depthark/crystalinteriors.cz` → Settings →
  Collaborators).
- Optional, discussed: separate project pages `/projekty/<slug>/` for SEO.
- Cloudinary folder `CrystalInteriors` can be deleted (unused).

## 8. When done

Update `DEPLOY.md` and `ROLLBACK.md` (current NSSET, records, DNSSEC status),
shorten this file to a "done" note or delete it, commit and push to `main`.
