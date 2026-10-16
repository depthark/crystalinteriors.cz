/**
 * Cloudinary delivery helpers.
 *
 * - Cloudinary upload URLs (from the CMS) get transformations inserted after
 *   `/upload/`, so they are served resized and in the best format.
 * - Any other remote image goes through Cloudinary *fetch* delivery when
 *   `PUBLIC_CLOUDINARY_CLOUD_NAME` is set, otherwise it is returned unchanged.
 *
 * `f_auto` lets Cloudinary pick AVIF → WebP → JPEG per browser, `q_auto`
 * picks the lowest visually lossless quality, `g_auto` keeps the subject in
 * frame when cropping.
 */
type Fit = "fill" | "fit" | "limit" | "pad" | "thumb";

export interface TransformOptions {
  width?: number;
  height?: number;
  quality?: string | number;
  fit?: Fit | "cover";
  gravity?: "auto" | "center";
}

const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME as
  | string
  | undefined;

const UPLOAD_URL =
  /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:(?:[a-z]{1,3}_[^/]*,?)+\/)?(.+)$/i;

export const isCloudinaryUpload = (source: string) => UPLOAD_URL.test(source);

const transformString = (options: TransformOptions) => {
  const fit = options.fit === "cover" ? "fill" : (options.fit ?? "fill");
  const cropping = Boolean(options.height) && (fit === "fill" || fit === "thumb");
  return [
    "f_auto",
    `q_${options.quality ?? "auto"}`,
    `c_${fit}`,
    cropping ? `g_${options.gravity ?? "auto"}` : "",
    options.width ? `w_${options.width}` : "",
    options.height ? `h_${options.height}` : "",
  ]
    .filter(Boolean)
    .join(",");
};

export function cloudinaryImage(source: string, options: TransformOptions = {}) {
  if (!source) return source;

  const upload = UPLOAD_URL.exec(source);
  if (upload) return `${upload[1]}${transformString(options)}/${upload[2]}`;

  if (!cloudName || !/^https?:\/\//i.test(source)) return source;
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformString(options)}/${encodeURIComponent(source)}`;
}

/** True when `cloudinaryImage` will actually resize this source. */
export const canTransform = (source: string) =>
  isCloudinaryUpload(source) || (Boolean(cloudName) && /^https?:\/\//i.test(source));

/**
 * `srcset` for the given widths. With a ratio, every candidate is cropped to
 * the same aspect so the reserved box (width/height attributes) never shifts.
 */
export function cloudinarySrcset(
  source: string,
  widths: number[],
  options: Omit<TransformOptions, "width" | "height"> & { ratio?: number } = {},
) {
  if (!canTransform(source)) return undefined;
  const { ratio, ...rest } = options;
  return widths
    .map((width) => {
      const height = ratio ? Math.round(width / ratio) : undefined;
      return `${cloudinaryImage(source, { ...rest, width, height })} ${width}w`;
    })
    .join(", ");
}
