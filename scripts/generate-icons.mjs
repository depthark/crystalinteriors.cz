#!/usr/bin/env node
/**
 * Generates the favicon / PWA icon set from the official Crystal Interiors
 * logo (public/images/logos/crystalinteriors_logo-white.svg) – white art on
 * the brand ink, never redrawn or recoloured.
 *
 *  - Large icons (app, maskable, apple-touch): the full round logo.
 *  - Small icons (favicon.svg / .ico / 96 px): the crystal mark only, cropped
 *    from the same artwork, because the wordmark is unreadable at 16–48 px.
 *
 * Run after the logo changes: `bun run icons`. Outputs are committed.
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const OUT = "public/images/favicons";
const LOGO = "public/images/logos/crystalinteriors_logo-white.svg";
const INK = "#1d1b18";

// Square around the crystal cluster, in the logo's own viewBox units.
const CRYSTAL_VIEWBOX = "68.3 31.1 103.3 103.3";

const source = await readFile(LOGO, "utf8");
const inner = source.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
const [vx, vy, vw, vh] = (/viewBox="([^"]+)"/.exec(source)?.[1] ?? "0 0 1024 1024").split(/\s+/).map(Number);

/** Logo art centred on an ink square; `scale` < 1 adds a safe-zone margin. */
function iconSvg({ viewBox, scale = 1, radius = 0 }) {
  const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
  const size = Math.max(w, h) / scale;
  const ox = x - (size - w) / 2;
  const oy = y - (size - h) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox} ${oy} ${size} ${size}"><title>Crystal Interiors</title><rect x="${ox}" y="${oy}" width="${size}" height="${size}" rx="${(radius * size) / 512}" fill="${INK}"/>${inner}</svg>`;
}

const fullLogo = `${vx} ${vy} ${vw} ${vh}`;
const favicon = iconSvg({ viewBox: CRYSTAL_VIEWBOX, scale: 0.8, radius: 112 });
const appIcon = iconSvg({ viewBox: fullLogo, scale: 0.94, radius: 112 });
const maskable = iconSvg({ viewBox: fullLogo, scale: 0.78 }); // logo inside the 80% safe zone
const apple = iconSvg({ viewBox: fullLogo, scale: 0.88 });

const png = (svg, size, file) =>
  sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);

await writeFile(`${OUT}/favicon.svg`, `${favicon}\n`);
await Promise.all([
  png(appIcon, 512, "web-app-manifest-512x512.png"),
  png(appIcon, 192, "web-app-manifest-192x192.png"),
  png(maskable, 512, "maskable-512x512.png"),
  png(maskable, 192, "maskable-192x192.png"),
  png(apple, 180, "apple-touch-icon.png"),
  png(favicon, 96, "favicon-96x96.png"),
  png(favicon, 48, "favicon-48x48.png"),
]);
console.log("icons written to", OUT, "– now run: convert favicon-48x48.png → favicon.ico (see README)");
