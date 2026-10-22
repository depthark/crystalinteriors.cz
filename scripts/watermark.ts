#!/usr/bin/env bun
/**
 * Watermark asset + previews.
 *
 *   bun scripts/watermark.ts
 *     public/images/logos/crystalinteriors_logo-white.svg → public/admin/watermark.png
 *     (transparent, square, white logo with a soft dark halo, opacity baked
 *     in). The CMS worker and scripts/image-set.ts both draw this one PNG.
 *
 *   bun scripts/watermark.ts preview <out-dir> <file-or-url>...
 *     Bakes the mark into photos the way an upload does (full size, then
 *     downscaled) and writes 1600 px JPEGs to look at.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import sharp from "sharp";
import { applyWatermark, load } from "./image-set.ts";

const LOGO = resolve("public/images/logos/crystalinteriors_logo-white.svg");
const WATERMARK_PNG = resolve("public/admin/watermark.png");
const SIZE = 1200;
/** Strength knobs: the white logo and the dark halo under it. */
const LOGO_OPACITY = 0.42;
const HALO_OPACITY = 0.2;
const HALO_BLUR = 6;

async function renderPng() {
  const svg = await readFile(LOGO);
  const logo = await sharp(svg, { density: (72 * SIZE) / 248 }).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = logo.info;
  const alpha = (opacity: number) => {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i += 1) out[i * 4 + 3] = Math.round(logo.data[i * 4 + 3] * opacity);
    return out;
  };
  const white = Buffer.from(alpha(LOGO_OPACITY));
  for (let i = 0; i < width * height; i += 1) white.fill(255, i * 4, i * 4 + 3);
  const halo = await sharp(alpha(HALO_OPACITY), { raw: { width, height, channels: 4 } }).blur(HALO_BLUR).png().toBuffer();
  const png = await sharp(halo)
    .composite([{ input: white, raw: { width, height, channels: 4 } }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(WATERMARK_PNG, png);
  console.log(`✓ ${WATERMARK_PNG}`);
}

async function preview(outDir: string, inputs: string[]) {
  await mkdir(outDir, { recursive: true });
  for (const input of inputs) {
    const original = await sharp(await load(input)).rotate().toBuffer();
    const marked = await applyWatermark(original);
    const name = basename(input.split("?")[0]).replace(/\.[a-z0-9]+$/i, "");
    const out = resolve(outDir, `${name}.jpg`);
    await sharp(marked).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(out);
    console.log(`✓ ${out}`);
  }
}

if (import.meta.main) {
  const [command, outDir, ...inputs] = process.argv.slice(2);
  if (command === "preview") {
    if (!outDir || !inputs.length) {
      console.error("Usage: bun scripts/watermark.ts preview <out-dir> <file-or-url>...");
      process.exit(1);
    }
    await preview(outDir, inputs);
  } else {
    await renderPng();
  }
}
