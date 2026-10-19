/**
 * Contact form → e-mail via Resend (Cloudflare Pages Function).
 *
 * POST /api/inquiry  { name, email, phone?, room?, message, website?, startedAt? }
 *   → 200 { ok: true }            sent to the designers
 *   → 400 { error }               invalid input (shown to the visitor)
 *   → 503 { error }               not configured / Resend down – the page
 *                                  falls back to a prepared mailto: e-mail
 *
 * Recipients are the contacts edited in the CMS (Nastavení → Kontakty,
 * src/data/content/settings.json), unless INQUIRY_TO overrides them. The
 * visitor's address is set as Reply-To, so "Odpovědět" in the mailbox
 * answers the visitor directly. Mailboxes stay on Webnode; Resend only sends.
 *
 * Spam: hidden `website` honeypot + minimum fill time (`startedAt`).
 *
 * Environment (Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY  – Resend API key, "Sending access" only (encrypted)
 *   INQUIRY_FROM    – optional, defaults to "Crystal Interiors <web@crystalinteriors.cz>"
 *                     (the domain must be verified in Resend)
 *   INQUIRY_TO      – optional comma-separated override of the recipients
 */
import settings from "../../src/data/content/settings.json";

interface Env {
  RESEND_API_KEY?: string;
  INQUIRY_FROM?: string;
  INQUIRY_TO?: string;
}

interface Context {
  request: Request;
  env: Env;
}

type Inquiry = Record<"name" | "email" | "phone" | "room" | "message" | "website" | "startedAt", string>;

const DEFAULT_FROM = "Crystal Interiors <web@crystalinteriors.cz>";
const MIN_FILL_MS = 3000;
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
const LIMITS = { name: 120, email: 200, phone: 40, room: 80, message: 4000 } as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

async function readBody(request: Request): Promise<Inquiry> {
  const type = request.headers.get("Content-Type") ?? "";
  const raw: Record<string, unknown> = type.includes("application/json")
    ? await request.json()
    : Object.fromEntries(await request.formData());
  const field = (key: keyof Inquiry) => String(raw[key] ?? "").trim();
  return {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    room: field("room"),
    message: field("message"),
    website: field("website"),
    startedAt: field("startedAt"),
  };
}

function validate(data: Inquiry): string | null {
  if (!data.name || !data.email || !data.message) return "Vyplňte jméno, e-mail a zprávu.";
  if (!EMAIL.test(data.email)) return "Zkontrolujte prosím e-mailovou adresu.";
  for (const [key, max] of Object.entries(LIMITS)) {
    if (data[key as keyof typeof LIMITS].length > max) return "Zpráva je příliš dlouhá.";
  }
  return null;
}

function recipients(env: Env): string[] {
  const list = env.INQUIRY_TO
    ? env.INQUIRY_TO.split(",")
    : settings.company.contacts.map((contact) => contact.email);
  return list.map((address) => address.trim()).filter((address) => EMAIL.test(address));
}

function compose(data: Inquiry) {
  const subject = `Poptávka z webu${data.room ? ` – ${data.room}` : ""} (${data.name})`;
  const details: [string, string][] = [
    ["Jméno", data.name],
    ["E-mail", data.email],
    ...(data.phone ? ([["Telefon", data.phone]] as [string, string][]) : []),
    ...(data.room ? ([["Typ prostoru", data.room]] as [string, string][]) : []),
  ];
  const text = [data.message, "", ...details.map(([label, value]) => `${label}: ${value}`)].join("\n");
  const html = `<p style="white-space:pre-line">${escapeHtml(data.message)}</p>
<table cellpadding="4" style="border-collapse:collapse;margin-top:16px">${details
    .map(([label, value]) => `<tr><th align="left">${label}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("")}</table>
<p style="color:#777;font-size:12px">Odesláno z formuláře na crystalinteriors.cz – odpovědí napíšete přímo zákazníkovi.</p>`;
  return { subject, text, html };
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let data: Inquiry;
  try {
    data = await readBody(request);
  } catch {
    return json({ error: "Neplatný požadavek." }, 400);
  }

  // Bots fill the hidden field or submit instantly – pretend success.
  const startedAt = Number(data.startedAt);
  if (data.website || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) return json({ ok: true });

  const invalid = validate(data);
  if (invalid) return json({ error: invalid }, 400);

  const to = recipients(env);
  if (!env.RESEND_API_KEY || to.length === 0) {
    return json({ error: "Odesílání z webu není nastavené." }, 503);
  }

  const { subject, text, html } = compose(data);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.INQUIRY_FROM || DEFAULT_FROM,
      to,
      reply_to: data.email,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    return json({ error: "Poptávku se nepodařilo odeslat." }, 503);
  }
  return json({ ok: true });
};
