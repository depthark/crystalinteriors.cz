/**
 * schema.org JSON-LD built from the same content the pages render, so the
 * structured data can never drift from what visitors (and the CMS) see.
 *
 * Shared nodes (WebSite, business, people) go on every page; pages add their
 * own nodes (FAQPage, Service, ImageGallery, BreadcrumbList) through
 * BaseLayout's `schema` prop.
 */
import { site, type ReferenceRoom } from "@/data/site";
import { cloudinaryImage } from "@/lib/cloudinary";
import { galleryGeneratedAt, getRoomMedia } from "@/lib/cloudinary-gallery";

type Node = Record<string, unknown>;

export const ids = {
  website: `${site.siteUrl}/#website`,
  business: `${site.siteUrl}/#business`,
  catalog: `${site.siteUrl}/#catalog`,
  person: (index: number) => `${site.siteUrl}/#person-${index + 1}`,
};

const absolute = (path: string) => (/^https?:/i.test(path) ? path : `${site.siteUrl}${path}`);

export const shareImage = (source = site.shareImage) =>
  cloudinaryImage(source, { width: 1200, height: 630, fit: "fill" });

const people = (): Node[] =>
  site.company.contacts.map((person, index) => ({
    "@type": "Person",
    "@id": ids.person(index),
    name: person.name,
    jobTitle: person.role,
    email: `mailto:${person.email}`,
    telephone: person.phone,
    worksFor: { "@id": ids.business },
  }));

const offerCatalog = (): Node => ({
  "@type": "OfferCatalog",
  "@id": ids.catalog,
  name: "Ceník vizualizací a konzultací",
  itemListElement: site.pricing.map((item) => ({
    "@type": "Offer",
    name: item.title,
    description: item.price,
    itemOffered: { "@type": "Service", name: item.title },
    ...(typeof item.amount === "number"
      ? {
          priceCurrency: "CZK",
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "CZK",
            minPrice: item.amount,
          },
        }
      : {}),
  })),
});

const business = (): Node => {
  const { company } = site;
  return {
    "@type": ["ProfessionalService", "HomeAndConstructionBusiness"],
    "@id": ids.business,
    name: site.name,
    legalName: company.legalName,
    taxID: company.ico,
    slogan: site.tagline,
    description: site.description,
    url: `${site.siteUrl}/`,
    image: shareImage(),
    logo: `${site.siteUrl}/images/favicons/web-app-manifest-512x512.png`,
    telephone: company.phones[0],
    email: company.emails[0],
    priceRange: "$$",
    currenciesAccepted: "CZK",
    address: {
      "@type": "PostalAddress",
      streetAddress: company.street,
      postalCode: company.postalCode,
      addressLocality: company.city,
      addressRegion: company.region,
      addressCountry: "CZ",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: company.geo.latitude,
      longitude: company.geo.longitude,
    },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${company.geo.latitude},${company.geo.longitude}`,
    areaServed: [
      { "@type": "City", name: "Brno" },
      { "@type": "AdministrativeArea", name: company.region },
    ],
    openingHoursSpecification: company.openingHours.map((hours) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: hours.days,
      opens: hours.opens,
      closes: hours.closes,
    })),
    contactPoint: company.contacts.map((person) => ({
      "@type": "ContactPoint",
      contactType: "customer service",
      name: person.name,
      telephone: person.phone,
      email: person.email,
      availableLanguage: ["cs"],
      areaServed: "CZ",
    })),
    employee: company.contacts.map((_, index) => ({ "@id": ids.person(index) })),
    founder: company.contacts.map((_, index) => ({ "@id": ids.person(index) })),
    knowsAbout: [
      "Interiérový design",
      "Nábytek na míru",
      "Kuchyně na míru",
      "3D vizualizace interiéru",
      ...site.services.map((service) => service.title),
    ],
    hasOfferCatalog: { "@id": ids.catalog },
    sameAs: Object.values(site.social),
  };
};

const website = (): Node => ({
  "@type": "WebSite",
  "@id": ids.website,
  url: `${site.siteUrl}/`,
  name: site.name,
  description: site.description,
  inLanguage: "cs-CZ",
  publisher: { "@id": ids.business },
});

export const baseGraph = (): Node[] => [website(), business(), offerCatalog(), ...people()];

export const webPage = (
  canonical: string,
  title: string,
  description: string,
  type = "WebPage",
): Node => ({
  "@type": type,
  "@id": `${canonical}#webpage`,
  url: canonical,
  name: title,
  description,
  inLanguage: "cs-CZ",
  isPartOf: { "@id": ids.website },
  about: { "@id": ids.business },
  primaryImageOfPage: shareImage(),
});

export const breadcrumbList = (canonical: string, crumbs: Array<{ name: string; href: string }>): Node => ({
  "@type": "BreadcrumbList",
  "@id": `${canonical}#breadcrumbs`,
  itemListElement: crumbs.map((crumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: crumb.name,
    item: absolute(crumb.href),
  })),
});

export const faqPage = (items = site.faq): Node => ({
  "@type": "FAQPage",
  "@id": `${site.siteUrl}/#faq`,
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const serviceNodes = (): Node[] =>
  site.services.map((service, index) => ({
    "@type": "Service",
    "@id": `${site.siteUrl}/sluzby/#service-${index + 1}`,
    name: service.title,
    description: service.text,
    serviceType: service.title,
    image: cloudinaryImage(service.image, { width: 1200, height: 900, fit: "fill" }),
    provider: { "@id": ids.business },
    areaServed: { "@type": "City", name: "Brno" },
  }));

export const referenceGalleries = (rooms: ReferenceRoom[]): Node[] =>
  rooms
    .map((room) => ({ room, media: getRoomMedia(room) }))
    .filter(({ media }) => media.length)
    .map(({ room, media }) => ({
      "@type": "ImageGallery",
      "@id": `${site.siteUrl}/projekty/#${room.slug}`,
      name: `${room.title} – reference ${site.name}`,
      description: room.text,
      creator: { "@id": ids.business },
      image: media
        .filter((item) => item.type === "image")
        .map((item) => ({
          "@type": "ImageObject",
          contentUrl: item.full,
          thumbnailUrl: item.thumb,
          caption: item.alt,
          creator: { "@id": ids.business },
          copyrightHolder: { "@id": ids.business },
        })),
      video: media
        .filter((item) => item.type === "video")
        .map((item) => ({
          "@type": "VideoObject",
          name: item.alt,
          description: `${room.title} – ${item.alt}`,
          contentUrl: item.full,
          thumbnailUrl: item.poster ?? item.thumb,
          uploadDate: item.uploadedAt ?? galleryGeneratedAt() ?? undefined,
        })),
    }));
