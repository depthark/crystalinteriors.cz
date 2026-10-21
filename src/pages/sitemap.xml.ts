/** sitemap.xml generated from the navigation, with image entries for galleries. */
import type { APIRoute } from "astro";
import { site } from "@/data/site";
import { getProjectMedia } from "@/lib/gallery";
import { absoluteUrl } from "@/lib/image-set";
import { shareImage } from "@/lib/structured-data";

const escape = (value: string) =>
  value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const imagesFor = (href: string): Array<{ loc: string; title: string }> => {
    if (href === "/")
      return [
        { loc: shareImage(site.hero.image), title: site.hero.imageAlt },
        ...site.services.map((service) => ({ loc: shareImage(service.image), title: service.title })),
      ];
    if (href === "/projekty/")
      return site.projects.flatMap((project) =>
        getProjectMedia(project).map(({ set, alt }) => ({ loc: absoluteUrl(site.siteUrl, set, 2400), title: alt })),
      );
    return [];
  };

  const urls = site.nav
    .map(({ href }) => {
      const images = imagesFor(href)
        .map((image) => `\n    <image:image><image:loc>${escape(image.loc)}</image:loc><image:title>${escape(image.title)}</image:title></image:image>`)
        .join("");
      return `  <url>\n    <loc>${site.siteUrl}${href}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${href === "/projekty/" ? "weekly" : "monthly"}</changefreq>\n    <priority>${href === "/" ? "1.0" : "0.8"}</priority>${images}\n  </url>`;
    })
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
