/**
 * Image pipeline for Decap CMS – photos are compressed in the editor's
 * browser, no image service or server involved.
 *
 *   ImagePipeline.process(file, { onProgress }) →
 *     { width, height, focus: { x, y }, files: [{ width, blob }] }
 *
 * Each photo becomes AVIF files in fixed widths (400, 800, 1200, 1800, 2400),
 * never upscaled – the same rule as scripts/image-set.ts. Encoding runs in a
 * small pool of module workers (image-worker.js), one photo per worker. The
 * focus point is the centre of smartcrop's best 4:3 crop; the website keeps
 * it in frame when tiles crop the photo.
 *
 * Project-agnostic: reuse it in other Decap sites as is.
 */
(() => {
  const STANDARD = [400, 800, 1200, 1800, 2400];
  const QUALITY = 55;
  const WORKER_URL = new URL("image-worker.js", document.currentScript?.src || location.href).href;
  const POOL = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));

  const idle = [];
  const waiting = [];
  let created = 0;
  let nextId = 0;

  const getWorker = () =>
    new Promise((resolve) => {
      if (idle.length) return resolve(idle.pop());
      if (created < POOL) {
        created += 1;
        return resolve(new Worker(WORKER_URL, { type: "module" }));
      }
      waiting.push(resolve);
    });

  const release = (worker) => {
    const next = waiting.shift();
    next ? next(worker) : idle.push(worker);
  };

  function encodeInWorker(file, onProgress) {
    return getWorker().then(
      (worker) =>
        new Promise((resolve, reject) => {
          const id = (nextId += 1);
          const onMessage = ({ data }) => {
            if (data.id !== id) return;
            if (data.type === "progress") return onProgress?.(data.done / data.total);
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            release(worker);
            data.type === "done" ? resolve(data) : reject(new Error(data.message));
          };
          const onError = (event) => {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            worker.terminate();
            created -= 1;
            reject(new Error(event.message || "Zpracování fotky selhalo."));
          };
          worker.addEventListener("message", onMessage);
          worker.addEventListener("error", onError);
          worker.postMessage({ id, file, standard: STANDARD, quality: QUALITY });
        }),
    );
  }

  /** Focus point (percent) from a small preview, via smartcrop (4:3 tile). */
  async function focusOf(preview) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = preview.width;
      canvas.height = preview.height;
      canvas.getContext("2d").putImageData(preview, 0, 0);
      const side = Math.min(preview.width, (preview.height * 4) / 3);
      const { topCrop } = await window.smartcrop.crop(canvas, { width: side, height: (side * 3) / 4 });
      return {
        x: Math.round(((topCrop.x + topCrop.width / 2) / preview.width) * 100),
        y: Math.round(((topCrop.y + topCrop.height / 2) / preview.height) * 100),
      };
    } catch {
      return { x: 50, y: 50 };
    }
  }

  async function process(file, { onProgress } = {}) {
    let result;
    try {
      result = await encodeInWorker(file, onProgress);
    } catch (error) {
      const small = /^too-small:(\d+)/.exec(error.message);
      if (small) {
        throw new Error(`Fotka je příliš malá (${small[1]} px na šířku). Nahrajte alespoň ${STANDARD[0]} px, ideálně 2400 px.`);
      }
      if (/decode|source image|InvalidState|EncodingError/i.test(error.message)) {
        throw new Error(`Soubor „${file.name}“ se nepodařilo otevřít. Použijte JPG, PNG nebo WebP (HEIC z iPhonu převeďte na JPG).`);
      }
      throw error;
    }
    onProgress?.(1);
    return {
      width: result.width,
      height: result.height,
      focus: await focusOf(result.preview),
      files: result.files.map(({ width, buffer }) => ({ width, blob: new Blob([buffer], { type: "image/avif" }) })),
    };
  }

  window.ImagePipeline = { STANDARD, process };
})();
