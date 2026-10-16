/**
 * Machine-readable facts about the studio, derived from the CMS content.
 * Feeds /agent/site.json, /llms.txt, the WebMCP tools and the /mcp server.
 */
import { site } from "@/data/site";

const url = (path: string) => `${site.siteUrl}${path}`;

export function getSiteData() {
  return {
    name: site.name,
    url: url("/"),
    language: "cs",
    description: site.description,
    services: site.services.map(({ title, text }) => ({ title, description: text })),
    pricing: {
      currency: "CZK",
      note: site.servicesPage.pricingIntro,
      items: site.pricing.map(({ title, price, amount }) => ({ title, price, from: amount ?? null })),
    },
    references: site.references.map((room) => ({
      title: room.title,
      description: room.text,
      url: url(`/projekty/#${room.slug}`),
      images: room.images.filter((image) => !image.hidden).length,
    })),
    faq: site.faq,
    process: site.process,
    contact: {
      address: site.company.address,
      geo: site.company.geo,
      note: site.company.openingNote,
      openingHours: site.company.openingHours,
      people: site.company.contacts,
      company: {
        legalName: site.company.legalName,
        ico: site.company.ico,
        registeredAddress: site.company.registeredAddress,
      },
      social: site.social,
      contactPage: url("/kontakt/"),
    },
    pages: site.nav.map((item) => ({ title: item.label, url: url(item.href) })),
  };
}

export type SiteFacts = ReturnType<typeof getSiteData>;
