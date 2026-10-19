/**
 * Machine-readable facts about the studio, derived from the CMS content.
 * Feeds /agent/site.json, /llms.txt, the WebMCP tools and the /mcp server.
 */
import { site } from "@/data/site";
import { getProjectMedia } from "@/lib/cloudinary-gallery";

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
    projects: site.projects.map((project) => ({
      title: project.title,
      location: project.location ?? null,
      year: project.year ?? null,
      description: project.text,
      url: url(`/projekty/#${project.slug}`),
      photos: getProjectMedia(project).filter((item) => item.type === "image").length,
      videos: getProjectMedia(project).filter((item) => item.type === "video").length,
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
