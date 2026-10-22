// Generated from src/lib/watermark.ts by bun run admin:build – do not edit.

// src/lib/watermark.ts
var MARK_SIZE = 0.32;
var needsWatermark = (base) => base.startsWith("/gallery/projekty/");
function placeWatermark(width, height) {
  const size = Math.round(Math.min(width, height) * MARK_SIZE);
  return {
    left: Math.round((width - size) / 2),
    top: Math.round((height - size) / 2),
    width: size,
    height: size
  };
}
function drawWatermark(ctx, mark) {
  const box = placeWatermark(ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mark, box.left, box.top, box.width, box.height);
}
export {
  MARK_SIZE,
  drawWatermark,
  needsWatermark,
  placeWatermark
};
