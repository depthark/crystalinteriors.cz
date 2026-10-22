/**
 * Watermark for project photos – one rule set for the CMS (browser) and the
 * Bun scripts, so uploads and bulk imports look the same.
 *
 * - Mark: public/admin/watermark.png – the official logo in white with a soft
 *   dark halo (reads on light and dark photos), opacity baked in, rendered
 *   from the logo by scripts/watermark.ts.
 * - Only project galleries (/gallery/projekty/…) are marked; site photos
 *   (hero, parallax, service tiles) stay clean.
 * - Centred, drawn once on the full-size photo before any resize, so every
 *   width carries the same mark.
 *
 * Browser-safe (no Node APIs): bundled into public/admin/watermark-core.js by
 * `bun run admin:build` for the CMS image worker.
 */

/** Share of the photo's shorter side the (square) mark takes. */
export const MARK_SIZE = 0.32;

export interface WatermarkBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Image sets that get the mark: project gallery photos only. */
export const needsWatermark = (base: string) => base.startsWith("/gallery/projekty/");

export function placeWatermark(width: number, height: number): WatermarkBox {
  const size = Math.round(Math.min(width, height) * MARK_SIZE);
  return {
    left: Math.round((width - size) / 2),
    top: Math.round((height - size) / 2),
    width: size,
    height: size,
  };
}

/** Bakes the mark into a canvas that holds the full-size photo. */
export function drawWatermark(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  mark: CanvasImageSource,
) {
  const box = placeWatermark(ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mark, box.left, box.top, box.width, box.height);
}
