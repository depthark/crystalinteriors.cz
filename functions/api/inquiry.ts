/**
 * Contact form → e-mail via Resend (Cloudflare Pages Function).
 *
 * POST /api/inquiry  { name, email, phone?, room?, message, website?, elapsed }
 *   → 200 { ok: true }            sent to the designers + confirmation to the visitor
 *   → 400 { error }               invalid input (shown to the visitor)
 *   → 503 { error }               not configured / Resend down – the page
 *                                  falls back to a prepared mailto: e-mail
 *
 * Recipients are the contacts edited in the CMS (Nastavení → Kontakty,
 * src/data/content/settings.json), unless INQUIRY_TO overrides them. The
 * visitor's address is set as Reply-To, so "Odpovědět" in the mailbox
 * answers the visitor directly. Mailboxes stay on Webnode; Resend only sends.
 *
 * The visitor gets a confirmation e-mail with a copy of the message (texts in
 * the CMS: Stránky → Kontakt → Formulář). It is sent only after the inquiry
 * itself went out, and a failed confirmation never fails the request.
 *
 * Spam (bots get a fake 200 and nothing is sent, so they learn nothing):
 *   - hidden `website` honeypot field,
 *   - `elapsed` (time on the page, measured by the page script) missing or
 *     under 3 s – direct POSTs and instant submits,
 *   - more than two links in the message.
 *
 * Environment (Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY  – Resend API key, "Sending access" only (encrypted)
 *   INQUIRY_FROM    – optional, defaults to "Crystal Interiors <web@crystalinteriors.cz>"
 *                     (the domain must be verified in Resend)
 *   INQUIRY_TO      – optional comma-separated override of the recipients
 */
import contact from "../../src/data/content/contact.json";
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

type Inquiry = Record<"name" | "email" | "phone" | "room" | "message" | "website" | "elapsed", string>;

const DEFAULT_FROM = "Crystal Interiors <web@crystalinteriors.cz>";
const MIN_FILL_MS = 3000;
const MAX_LINKS = 2;
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
    elapsed: field("elapsed"),
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

/** Honeypot, time on page and link count – true means "a bot, drop it silently". */
function looksLikeSpam(data: Inquiry): boolean {
  const elapsed = Number(data.elapsed);
  const links = data.message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  return Boolean(data.website) || !(elapsed >= MIN_FILL_MS) || links > MAX_LINKS;
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

/** Confirmation for the visitor: thank-you text, copy of the message, contacts. */
function composeConfirmation(data: Inquiry) {
  const people = settings.company.contacts;
  const signature = [
    settings.name,
    ...people.map((person) => `${person.name} – ${person.phone} – ${person.email}`),
    "https://www.crystalinteriors.cz",
  ];
  const text = [contact.form.confirmationText, "", "—", data.message, "", ...signature].join("\n");
  const html = `<p style="white-space:pre-line">${escapeHtml(contact.form.confirmationText)}</p>
<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #7C50A8;background:#f6f3f9;white-space:pre-line">${escapeHtml(data.message)}</blockquote>
<p style="color:#555;font-size:14px;line-height:1.6">${signature.map(escapeHtml).join("<br>")}</p>`;
  return { subject: contact.form.confirmationSubject, text, html };
}

const sendEmail = (env: Env, email: Record<string, unknown>) =>
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.INQUIRY_FROM || DEFAULT_FROM, ...email }),
  });

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  let data: Inquiry;
  try {
    data = await readBody(request);
  } catch {
    return json({ error: "Neplatný požadavek." }, 400);
  }

  // Bots: pretend success, send nothing.
  if (looksLikeSpam(data)) return json({ ok: true });

  const invalid = validate(data);
  if (invalid) return json({ error: invalid }, 400);

  const to = recipients(env);
  if (!env.RESEND_API_KEY || to.length === 0) {
    return json({ error: "Odesílání z webu není nastavené." }, 503);
  }

  const response = await sendEmail(env, { to, reply_to: data.email, ...compose(data) });
  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    return json({ error: "Poptávku se nepodařilo odeslat." }, 503);
  }

  // Replies to the confirmation go to the designers, not to the robot sender.
  const confirmation = await sendEmail(env, { to: [data.email], reply_to: to, ...composeConfirmation(data) });
  if (!confirmation.ok) console.error("Confirmation error", confirmation.status, await confirmation.text());

  return json({ ok: true });
};
