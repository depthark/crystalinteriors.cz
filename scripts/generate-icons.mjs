#!/usr/bin/env node
/**
 * Generates the favicon / PWA icon set from the Crystal Interiors gem mark.
 * Run after changing the mark: `bun run icons`. Outputs are committed.
 */
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const OUT = "public/images/favicons";
const INK = "#1d1b18";

const FACETS = [
  ["176,140 216,216 106,216", "#b8925a"],
  ["176,140 256,140 216,216", "#dcc08b"],
  ["216,216 256,140 296,216", "#c9a46b"],
  ["256,140 336,140 296,216", "#ead5a8"],
  ["336,140 406,216 296,216", "#a9844f"],
  ["106,216 216,216 256,372", "#8f6d40"],
  ["216,216 296,216 256,372", "#b8925a"],
  ["296,216 406,216 256,372", "#75582f"],
];

/** scale < 1 shrinks the gem around the centre (maskable safe zone). */
const svg = ({ scale = 1, radius = 112 } = {}) => {
  const offset = (512 * (1 - scale)) / 2;
  const facets = FACETS.map(([points, fill]) => `<polygon points="${points}" fill="${fill}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><title>Crystal Interiors</title><rect width="512" height="512" rx="${radius}" fill="${INK}"/><g transform="translate(${offset} ${offset}) scale(${scale})">${facets}</g></svg>`;
};

const png = (source, size, file) =>
  sharp(Buffer.from(source), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);

const rounded = svg();
const maskable = svg({ scale: 0.72, radius: 0 });
const apple = svg({ scale: 0.86, radius: 0 });

await writeFile(`${OUT}/favicon.svg`, `${rounded}\n`);
await Promise.all([
  png(rounded, 512, "web-app-manifest-512x512.png"),
  png(rounded, 192, "web-app-manifest-192x192.png"),
  png(rounded, 96, "favicon-96x96.png"),
  png(rounded, 48, "favicon-48x48.png"),
  png(apple, 180, "apple-touch-icon.png"),
  png(maskable, 512, "maskable-512x512.png"),
  png(maskable, 192, "maskable-192x192.png"),
]);
console.log("icons written to", OUT);
