/**
 * Open Graph / Twitter share images (1200×630 JPEG), rendered at build time
 * with sharp: a darkened project photo, royal + lavender light, the official
 * logo and the page title in Playfair Display. Titles come from the CMS, so
 * the images follow content changes on every build.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { site } from "@/data/site";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const root = (path: string) => resolve(process.cwd(), path);
const FONT_SERIF = root("src/assets/fonts/PlayfairDisplay-Medium.ttf");
const FONT_SANS = root("src/assets/fonts/Inter-Medium.ttf");
const LOGO = root("public/images/logos/crystalinteriors_logo-white.svg");

export interface OgPage {
  slug: string;
  path: string;
  title: string;
  photo: string;
}

/** One share image per page; photos are local, so builds never hit the network. */
export const ogPages = (): OgPage[] => [
  { slug: "home", path: "/", title: "Interiéry, kuchyně a nábytek na míru", photo: "obyvaci-pokoje" },
  { slug: "projekty", path: "/projekty/", title: site.referencesPage.intro.title, photo: "kuchyne" },
  { slug: "sluzby", path: "/sluzby/", title: site.servicesPage.intro.title, photo: "satny-a-predsine" },
  { slug: "o-nas", path: "/o-nas/", title: site.about.title, photo: "loznice" },
  { slug: "kontakt", path: "/kontakt/", title: site.contactPage.title, photo: "kancelare" },
];

/** Absolute URL of the share image for a page path (falls back to home). */
export function ogImageFor(pathname: string): string {
  const page = ogPages().find((p) => p.path === pathname) ?? ogPages()[0];
  return `${site.siteUrl}/og/${page.slug}.jpg`;
}

const escapeMarkup = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function text(markup: string, fontfile: string, font: string, width: number, dpi: number) {
  return sharp({ text: { text: markup, font, fontfile, width, dpi, rgba: true, wrap: "word" } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

export async function renderOgImage(page: OgPage): Promise<Buffer> {
  const background = await sharp(root(`public/images/thumbnails/${page.photo}.avif`))
    .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
    .blur(3)
    .modulate({ saturation: 0.85 })
    .toBuffer();

  // Ink veil + royal glow (top left) + lavender glow (bottom right) + edge shade.
  const light = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
    <defs>
      <radialGradient id="royal" cx="0.12" cy="0" r="0.75"><stop offset="0" stop-color="#5B2C83" stop-opacity="0.55"/><stop offset="1" stop-color="#5B2C83" stop-opacity="0"/></radialGradient>
      <radialGradient id="lavender" cx="1" cy="1" r="0.7"><stop offset="0" stop-color="#BA9ADD" stop-opacity="0.22"/><stop offset="1" stop-color="#BA9ADD" stop-opacity="0"/></radialGradient>
      <linearGradient id="veil" x1="0" x2="1"><stop offset="0" stop-color="#16140f" stop-opacity="0.78"/><stop offset="1" stop-color="#16140f" stop-opacity="0.9"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#veil)"/>
    <rect width="100%" height="100%" fill="url(#royal)"/>
    <rect width="100%" height="100%" fill="url(#lavender)"/>
    <rect x="560" y="200" width="2" height="230" fill="#ffffff" fill-opacity="0.18"/>
  </svg>`);

  const logo = await sharp(await readFile(LOGO), { density: 300 }).resize(380, 380, { fit: "contain", background: "#0000" }).png().toBuffer();

  const columnX = 610;
  const columnWidth = OG_WIDTH - columnX - 70;
  const eyebrow = await text(
    `<span foreground="#BA9ADD" letter_spacing="5000">${escapeMarkup(site.name.toUpperCase())}</span>`,
    FONT_SANS, "Inter Medium", columnWidth, 110,
  );
  const title = await text(
    `<span foreground="#FFFFFF" line_height="1.1">${escapeMarkup(page.title)}</span>`,
    FONT_SERIF, "Playfair Display Medium", columnWidth, 240,
  );
  const subtitle = await text(
    `<span foreground="#E8E2D8">${escapeMarkup(site.company.areaServed)} · crystalinteriors.cz</span>`,
    FONT_SANS, "Inter Medium", columnWidth, 120,
  );

  const gap = 26;
  const blockHeight = eyebrow.info.height + gap + title.info.height + gap + 2 + gap + subtitle.info.height;
  let y = Math.round((OG_HEIGHT - blockHeight) / 2);
  const placed: OverlayOptions[] = [];
  placed.push({ input: eyebrow.data, left: columnX, top: y });
  y += eyebrow.info.height + gap;
  placed.push({ input: title.data, left: columnX, top: y });
  y += title.info.height + gap;
  placed.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="2"><rect width="64" height="2" fill="#B79AD6"/></svg>`),
    left: columnX,
    top: y,
  });
  y += 2 + gap;
  placed.push({ input: subtitle.data, left: columnX, top: y });

  return sharp(background)
    .composite([{ input: light }, { input: logo, left: 110, top: Math.round((OG_HEIGHT - 380) / 2) }, ...placed])
    .jpeg({ quality: 84, mozjpeg: true, progressive: true })
    .toBuffer();
}
