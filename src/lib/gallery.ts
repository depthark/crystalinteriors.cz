/**
 * Photos of one project, as edited in the CMS: order, alt text, hidden flag
 * and focus point. Files live in public/gallery/projekty/<slug>/ (image sets,
 * see src/lib/image-set.ts); entries without files are skipped.
 */
import type { Project } from "@/data/site";
import { imageSet, type Focus, type ImageSet } from "@/lib/image-set";

export interface GalleryItem {
  alt: string;
  set: ImageSet;
  focus?: Focus;
}

export function getProjectMedia(project: Project): GalleryItem[] {
  return project.images
    .filter((image) => !image.hidden)
    .flatMap((image, index) => {
      const set = imageSet(image.src);
      if (!set) return [];
      return [{ alt: image.alt?.trim() || `${project.title} — foto ${index + 1}`, set, focus: image.focus }];
    });
}
