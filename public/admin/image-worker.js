/**
 * Image worker (module) – one photo → AVIF files in fixed widths.
 *
 * Runs off the main thread so the CMS stays responsive. Decodes the file
 * (EXIF orientation applied, metadata dropped), downsizes with Lanczos3 and
 * encodes each width with the AVIF codec from Squoosh (jSquash, vendored).
 *
 * In:  { id, file, standard: number[], quality }  (widths rule = scripts/image-set.ts)
 * Out: { id, type: "progress", done, total }
 *      { id, type: "done", width, height, files: [{ width, buffer }], preview }
 *      { id, type: "error", message }
 */
import encode from "./vendor/jsquash-avif/encode.js";
import initResize, { resize } from "./vendor/squoosh-resize/squoosh_resize.js";

const resizeReady = initResize();
const LANCZOS3 = 3;
const PREVIEW_WIDTH = 480;

/** Never upscale; skip a standard width the original barely exceeds. */
const widthsFor = (width, standard) =>
  width > standard.at(-1) ? standard : [...standard.filter((w) => w * 1.18 <= width), width];

async function decode(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function scale(image, width) {
  if (width >= image.width) return image;
  await resizeReady;
  const height = Math.round((image.height * width) / image.width);
  const out = resize(new Uint8Array(image.data.buffer), image.width, image.height, width, height, LANCZOS3, true, true);
  return new ImageData(new Uint8ClampedArray(out.buffer), width, height);
}

self.onmessage = async ({ data: { id, file, standard, quality = 55 } }) => {
  try {
    const original = await decode(file);
    if (original.width < standard[0]) {
      throw new Error(`too-small:${original.width}`);
    }
    const widths = widthsFor(original.width, standard);
    const files = [];
    for (const [index, width] of widths.entries()) {
      self.postMessage({ id, type: "progress", done: index, total: widths.length });
      const image = await scale(original, width);
      const buffer = await encode(image, { quality, speed: 6, subsample: 1 });
      files.push({ width, buffer });
    }
    const preview = await scale(original, Math.min(PREVIEW_WIDTH, original.width));
    self.postMessage(
      { id, type: "done", width: original.width, height: original.height, files, preview },
      files.map((f) => f.buffer),
    );
  } catch (error) {
    self.postMessage({ id, type: "error", message: error?.message || String(error) });
  }
};
