/**
 * Single source of site content.
 *
 * Everything editable lives in `src/data/content/*.json`, which Decap CMS
 * (`/admin/`) reads and writes. This module only composes those files into
 * one typed object and derives convenience fields (address, phones, …), so
 * components never import JSON directly.
 */
import settings from "./content/settings.json";
import home from "./content/home.json";
import services from "./content/services.json";
import about from "./content/about.json";
import references from "./content/references.json";
import contact from "./content/contact.json";

export interface ReferenceImage {
  /** Cloudinary delivery URL (upload) or any public image URL. */
  src: string;
  alt?: string;
  hidden?: boolean;
}

export interface Project {
  order?: number;
  slug: string;
  title: string;
  /** Short line under the title, e.g. "Rodinný dům, Brno-Líšeň · 2025". */
  subtitle?: string;
  /** Description in Markdown (bold, italics, lists, links) from the CMS editor. */
  text: string;
  images: ReferenceImage[];
  /** Optional Cloudinary tag, used at runtime when the project has no media yet. */
  tag?: string;
}

// One file per project (CMS folder collection "Projekty"), sorted by `order`.
const projects = Object.values(
  import.meta.glob<Project>("./content/projects/*.json", { eager: true, import: "default" }),
).sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title, "cs"));

const company = settings.company;
const address = `${company.street}, ${company.postalCode} ${company.city}-${company.district}`;

export const site = {
  name: settings.name,
  tagline: settings.tagline,
  siteUrl:
    import.meta.env.PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.crystalinteriors.cz",
  description: settings.description,
  keywords: settings.keywords,
  googleSiteVerification: settings.googleSiteVerification,
  nav: [
    { href: "/", label: "Úvod" },
    { href: "/projekty/", label: "Projekty" },
    { href: "/sluzby/", label: "Služby" },
    { href: "/o-nas/", label: "O nás" },
    { href: "/kontakt/", label: "Kontakt" },
  ],
  social: settings.social,
  company: {
    ...company,
    address,
    phones: company.contacts.map((person) => person.phone).filter(Boolean),
    emails: company.contacts.map((person) => person.email).filter(Boolean),
  },
  hero: home.hero,
  home: {
    seo: home.seo,
    introTitle: home.intro.title,
    introText: home.intro.text,
    businessSentence: home.intro.statement,
    parallaxImage: home.intro.parallaxImage,
    cta: home.cta,
  },
  process: home.process,
  faq: home.faq,
  servicesPage: {
    seo: services.seo,
    intro: services.intro,
    pillars: services.pillars,
    pricingIntro: services.pricingIntro,
  },
  services: services.services as Array<{ slug: string; title: string; text: string; image: string }>,
  pricing: services.pricing as Array<{ title: string; price: string; amount?: number }>,
  about,
  referencesPage: { seo: references.seo, intro: references.intro },
  projects: projects.map((project) => ({ ...project, images: project.images ?? [] })),
  contactPage: contact,
};

export type SiteData = typeof site;

/** `+420 774 446 988` → `tel:+420774446988` */
export const telHref = (phone: string) => `tel:${phone.replace(/\s+/g, "")}`;
