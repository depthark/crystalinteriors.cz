import { site } from "@/data/site";
import { cloudinaryImage, cloudinarySrcset } from "@/lib/cloudinary";

/** Hero (LCP) image: one definition shared by the <img> and its preload. */
export const hero = {
  widths: [640, 960, 1280, 1600, 2048],
  sizes: "100vw",
  width: 1800,
  height: 1200,
};

export const heroPreload = () => ({
  src: cloudinaryImage(site.hero.image, { width: hero.width, fit: "limit" }),
  srcset: cloudinarySrcset(site.hero.image, hero.widths, { fit: "limit" }),
  sizes: hero.sizes,
});
