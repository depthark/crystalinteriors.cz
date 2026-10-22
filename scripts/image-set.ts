#!/usr/bin/env bun
/**
 * Image sets: one photo → AVIF files in fixed widths, never upscaled.
 *
 *   public/gallery/<group>/<name>-400.avif, -800, -1200, -1800, -2400
 *
 * The website reads the widths and dimensions from the files themselves
 * (src/lib/image-set.ts), so content only stores the base path
 * `/gallery/<group>/<name>`. The CMS does the same in the browser
 * (public/admin/image-pipeline.js); this is the server-side twin for bulk
 * imports – TypeScript run directly by Bun (no build step).
 *
 * CLI:  bun scripts/image-set.ts <file-or-url> <base>   e.g. /gallery/web/hero
 * API:  makeImageSet(input, base) → { src, width, height, widths, focus }
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp, { type AvifOptions } from "sharp";
import smartcrop from "smartcrop-sharp";

export const WIDTHS = [400, 800, 1200, 1800, 2400];

export interface Focus {
  x: number;
  y: number;
}

export interface ImageSetResult {
  src: string;
  width: number;
  height: number;
  widths: number[];
  focus: Focus;
}
const AVIF: AvifOptions = { quality: 55, effort: 4, chromaSubsampling: "4:2:0" };

/**
 * Widths to generate for an original of `width` px: never upscale, and skip a
 * standard width the original barely exceeds (1225 px → 400, 800, 1225).
 */
export const widthsFor = (width: number): number[] => {
  if (width > WIDTHS.at(-1)!) return WIDTHS;
  return [...WIDTHS.filter((w) => w * 1.18 <= width), width];
};

async function load(input: string | Buffer): Promise<Buffer> {
  if (Buffer.isBuffer(input)) return input;
  if (/^https?:\/\//.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`${input}: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return sharp(input).toBuffer();
}

/** Focus point (percent) = centre of the best 4:3 crop. */
async function focusOf(buffer: Buffer, width: number, height: number): Promise<Focus> {
  const { topCrop } = await smartcrop.crop(buffer, { width: 400, height: 300 });
  return {
    x: Math.round(((topCrop.x + topCrop.width / 2) / width) * 100),
    y: Math.round(((topCrop.y + topCrop.height / 2) / height) * 100),
  };
}

export async function makeImageSet(
  input: string | Buffer,
  base: string,
  { root = "public" }: { root?: string } = {},
): Promise<ImageSetResult> {
  // Bake EXIF orientation in, drop all metadata.
  const buffer = await sharp(await load(input)).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(buffer).metadata();
  const widths = widthsFor(width);
  await mkdir(dirname(resolve(root, `.${base}`)), { recursive: true });
  for (const w of widths) {
    const out = await sharp(buffer).resize({ width: w }).avif(AVIF).toBuffer();
    await writeFile(resolve(root, `.${base}-${w}.avif`), out);
  }
  return { src: base, width, height, widths, focus: await focusOf(buffer, width, height) };
}

if (import.meta.main) {
  const [input, base] = process.argv.slice(2);
  if (!input || !base?.startsWith("/")) {
    console.error("Usage: bun scripts/image-set.ts <file-or-url> </gallery/group/name>");
    process.exit(1);
  }
  console.log(JSON.stringify(await makeImageSet(input, base)));
}
