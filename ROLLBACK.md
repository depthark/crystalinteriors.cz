# Rollback – původní web (Webnode)

Snapshot pořízený **17. 10. 2026** před přepnutím na Cloudflare Pages.
Když nový web nefunguje, vraťte DNS / nameservery přesně na hodnoty níže.

## Doména `crystalinteriors.cz` (whois.nic.cz)

| Pole | Hodnota |
| --- | --- |
| Registrátor | `REG-MEDIA4WEB` (Webnode / Media4Web) |
| NSSET | `WEBNODE-TB` → `ns1.register.it`, `ns2.register.it` |
| KEYSET (DNSSEC) | `M4WK-5CDA1` – **DNSSEC je zapnutý** |
| Registrant | `REG-WEBSUPPORT-DP-1623389` |
| admin-c | `ACTIVE24` |
| tech-c | `WST-CZ` |
| Registrováno / expirace | 16. 08. 2024 / **16. 08. 2027** |

> ⚠️ Při změně nameserverů na Cloudflare je nutné nejdřív zrušit (nebo vyměnit)
> KEYSET `M4WK-5CDA1`, jinak validující resolvery doménu přestanou překládat.
> Při návratu na Webnode vraťte NSSET `WEBNODE-TB` a KEYSET `M4WK-5CDA1`.

## DNS záznamy (z `ns1.register.it`)

| Název | Typ | Hodnota |
| --- | --- | --- |
| `crystalinteriors.cz` | A | `3.73.27.108` |
| `crystalinteriors.cz` | A | `3.125.172.46` |
| `www.crystalinteriors.cz` | CNAME | `crystal-interiors-40.webnode.cz.` (→ `projects-lb.webnode.io.` → `3.79.173.192`, `18.185.25.67`) |
| `crystalinteriors.cz` | MX | `10 imap.mail.webnode.com.` |
| `crystalinteriors.cz` | TXT | `v=spf1 a mx include:spfuser.webnode.com -all` |
| `_dmarc.crystalinteriors.cz` | CNAME | `_dmarc-user.webnode.com.` (→ `v=DMARC1; p=none;`) |
| `autoconfig.crystalinteriors.cz` | CNAME | `tb-wb.securemail.pro.` |
| `_autodiscover._tcp.crystalinteriors.cz` | SRV | `10 10 443 ms-wb.securemail.pro.` |

## Cloudflare zóna (připravená 17. 10. 2026, zatím neaktivní)

- Nameservery: `lloyd.ns.cloudflare.com`, `michelle.ns.cloudflare.com`
- Záznamy zkopírované z Webnode, všechny **DNS only** (šedý mráček), takže
  přepnutí nameserverů samo o sobě nic nemění – web i pošta dál běží na Webnode.

Apex přesměrovává `301` na `https://www.crystalinteriors.cz/` (server `webnode`).

> 📧 **E-mail běží na Webnode** (`imap.mail.webnode.com`). MX, SPF, DMARC,
> `autoconfig` a `_autodiscover._tcp` musí zůstat stejné i po přechodu na
> Cloudflare, jinak přestane chodit pošta. Schránky `@crystalinteriors.cz` musí
> zůstat – **předplatné Webnode nerušte**, dokud nejsou přesunuté jinam.
> Resend (formulář) přidává jen vlastní záznamy (`resend._domainkey`, `send.`).

## Původní web

- Hosting: Webnode projekt `crystal-interiors-40.webnode.cz`
- Obrázky: `https://d9775ec23a.clvaw-cdnwnd.com/06dde8fa305f9cdafdc34740aa3f3c92/…`
- Nechte Webnode projekt i předplatné aktivní, dokud nový web neběží bez chyb
  aspoň několik týdnů.

## Jak se vrátit

1. **Pokud se měnily jen DNS záznamy** (zóna zůstala na Webnode): v administraci
   Webnode → Domény → DNS vraťte `www` CNAME a apex A záznamy z tabulky výše.
2. **Pokud se měnily nameservery na Cloudflare**: u registrátora (Webnode /
   Media4Web) vraťte NSSET `WEBNODE-TB` a KEYSET `M4WK-5CDA1`. Propagace
   v `.cz` trvá obvykle do 1 hodiny (TTL záznamů 1–3 h).
3. Ověření: `dig +short www.crystalinteriors.cz` musí vrátit
   `crystal-interiors-40.webnode.cz.` a `curl -sI https://crystalinteriors.cz`
   hlavičku `server: webnode`.
