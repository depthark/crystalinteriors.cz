import { site } from "@/data/site";
import { imageSet, srcsetOf, urlOf, pick } from "@/lib/image-set";

/** Hero (LCP) image: one definition shared by the <img> and its preload. */
export const hero = {
  sizes: "100vw",
  width: 1800,
  height: 1200,
};

export const heroPreload = () => {
  const set = imageSet(site.hero.image);
  if (!set) return undefined;
  return { src: urlOf(set, pick(set, 1200)), srcset: srcsetOf(set), sizes: hero.sizes };
};
