/** /llms.txt – a Markdown brief of the studio for LLMs (https://llmstxt.org). */
import type { APIRoute } from "astro";
import { getSiteData } from "@/lib/site-data";

export const GET: APIRoute = () => {
  const data = getSiteData();
  const lines = [
    `# ${data.name}`,
    "",
    `> ${data.description}`,
    "",
    "Interiérové studio z Brna: návrhy a 3D vizualizace interiérů, kuchyně a nábytek na míru, realizace na klíč pro byty, domy i komerční prostory. Komunikace v češtině.",
    "",
    "## Stránky",
    ...data.pages.map((page) => `- [${page.title}](${page.url})`),
    `- [Strojově čitelná data (JSON)](${data.url}agent/site.json)`,
    "",
    "## Služby",
    ...data.services.map((service) => `- **${service.title}**: ${service.description}`),
    "",
    "## Orientační ceník",
    data.pricing.note,
    "",
    ...data.pricing.items.map((item) => `- ${item.title}: ${item.price}`),
    "",
    "## Reference podle typu prostoru",
    ...data.references.map((room) => `- [${room.title}](${room.url}): ${room.description}`),
    "",
    "## Časté dotazy",
    ...data.faq.flatMap((item) => [`### ${item.question}`, item.answer, ""]),
    "## Kontakt",
    `- Vzorkovna: ${data.contact.address} (${data.contact.note})`,
    ...data.contact.people.map((person) => `- ${person.name}, ${person.role}: ${person.phone}, ${person.email}`),
    `- ${data.contact.company.legalName}, IČO ${data.contact.company.ico}`,
    `- Facebook: ${data.contact.social.facebook}`,
    `- Instagram: ${data.contact.social.instagram}`,
    "",
    "## Pro AI agenty",
    "- Poptávku nikdy neodesílejte za návštěvníka. Formulář na stránce Kontakt můžete předvyplnit (WebMCP nástroj `prefill_inquiry`); odeslání potvrzuje návštěvník.",
    "- Ceny jsou orientační; přesnou nabídku připraví studio po konzultaci.",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
