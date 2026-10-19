#!/usr/bin/env node
/**
 * Build-time Cloudinary gallery fetch (same approach as anewstyle.cz).
 *
 * For every project (src/data/content/projects/<slug>.json) this lists all
 * images and videos under `CrystalInteriors/Projekty/<slug>` via
 * the authenticated Admin Search API, merges them with the CMS metadata
 * (order, alt text, hidden) and writes optimized delivery URLs to
 * `public/data/projects-gallery.json`. Astro reads that file at build time
 * (src/lib/cloudinary-gallery.ts).
 *
 * Source of truth per project:
 *   - CMS lists photos  → exactly those, in CMS order (hidden ones dropped).
 *                         Assets only in Cloudinary are reported, not shown.
 *   - CMS list is empty → everything in the project's Cloudinary folder.
 *
 * Images use f_auto + q_auto (AVIF/WebP/JPEG per browser), g_auto crops.
 * Credentials: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 * (environment or git-ignored .env). Without it, or on any API error, the
 * build keeps the previous JSON (or writes an empty one) and exits 0.
 */
import { v2 as cloudinary } from "cloudinary";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_FOLDER = process.env.CLOUDINARY_ROOT_FOLDER || "CrystalInteriors";
const PROJECTS_FOLDER = `${ROOT_FOLDER}/Projekty`;
const PROJECTS_DIR = path.join(process.cwd(), "src", "data", "content", "projects");
const OUT_FILE = path.join(process.cwd(), "public", "data", "projects-gallery.json");

// Grid tiles are 4:3 (ProjectSection.astro); the lightbox keeps the aspect.
const TILE_RATIO = 4 / 3;
const TILE_WIDTHS = [360, 540, 800, 1080];
const TILE_WIDTH = 800;
const IMAGE_FULL_WIDTH = 2000;
const VIDEO_FULL_WIDTH = 1280;

async function loadEnv() {
  if (process.env.CLOUDINARY_URL) return;
  try {
    const raw = await readFile(path.join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^\s*CLOUDINARY_URL\s*=\s*(.+?)\s*$/.exec(line);
      if (match) process.env.CLOUDINARY_URL = match[1].replace(/^['"]|['"]$/g, "");
    }
  } catch {}
}

const exists = (file) => access(file).then(() => true, () => false);

async function writeOut(data) {
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** https://res.cloudinary.com/<cloud>/<image|video>/upload/…/v123/<public_id>.<ext> */
function parseCloudinaryUrl(url) {
  const match = String(url || "").match(
    /\/(image|video)\/upload\/(?:[^/]*,[^/]*\/)*(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i,
  );
  return match ? { resourceType: match[1], publicId: decodeURIComponent(match[2]) } : null;
}

async function loadProjects() {
  const files = (await readdir(PROJECTS_DIR).catch(() => [])).filter((file) => file.endsWith(".json"));
  const projects = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(PROJECTS_DIR, file), "utf8"))),
  );
  return projects.filter((project) => project?.slug);
}

const subtree = (folder) =>
  `(folder="${folder}" OR folder:${folder}/* OR asset_folder="${folder}" OR asset_folder:${folder}/*)`;

/** Page through the Search API until every matching asset is collected. */
async function searchAll(expression) {
  const all = [];
  let cursor;
  do {
    const query = cloudinary.search
      .expression(`${expression} AND (resource_type:image OR resource_type:video)`)
      .with_field("context")
      .sort_by("created_at", "asc")
      .max_results(500);
    if (cursor) query.next_cursor(cursor);
    const result = await query.execute();
    all.push(...(result?.resources ?? []));
    cursor = result?.next_cursor;
  } while (cursor);
  return all;
}

/** "kuchyne-bila_x7k2" → "Kuchyne bila" (fallback alt; editors refine it in the CMS). */
function toAlt(publicId, projectTitle) {
  const base = String(publicId).split("/").pop().replace(/_[a-z0-9]{6}$/i, "");
  const words = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? `${projectTitle} – ${words}` : projectTitle;
}

function buildItem(resource, { alt }) {
  const publicId = resource.public_id;
  const nativeW = resource.width || 1600;
  const nativeH = resource.height || 1200;
  const tile = (width, extra = {}) =>
    cloudinary.url(publicId, {
      crop: "fill",
      gravity: "auto",
      width,
      height: Math.round(width / TILE_RATIO),
      quality: "auto",
      ...extra,
    });

  if (resource.resource_type === "video") {
    return {
      type: "video",
      alt,
      uploadedAt: resource.created_at,
      width: TILE_WIDTH,
      height: Math.round(TILE_WIDTH / TILE_RATIO),
      thumb: tile(TILE_WIDTH, { resource_type: "video", format: "jpg" }),
      thumbSrcset: TILE_WIDTHS.map((w) => `${tile(w, { resource_type: "video", format: "jpg" })} ${w}w`).join(", "),
      full: cloudinary.url(publicId, {
        resource_type: "video",
        format: "mp4",
        quality: "auto",
        crop: "limit",
        width: VIDEO_FULL_WIDTH,
      }),
      poster: cloudinary.url(publicId, { resource_type: "video", format: "jpg", quality: "auto", crop: "limit", width: VIDEO_FULL_WIDTH }),
    };
  }

  return {
    type: "image",
    alt,
    orientation: nativeH > nativeW ? "portrait" : "landscape",
    width: TILE_WIDTH,
    height: Math.round(TILE_WIDTH / TILE_RATIO),
    thumb: tile(TILE_WIDTH, { fetch_format: "auto" }),
    thumbSrcset: TILE_WIDTHS.map((w) => `${tile(w, { fetch_format: "auto" })} ${w}w`).join(", "),
    full: cloudinary.url(publicId, { fetch_format: "auto", quality: "auto", crop: "limit", width: IMAGE_FULL_WIDTH }),
    fullWidth: Math.min(IMAGE_FULL_WIDTH, nativeW),
    fullHeight: Math.round((Math.min(IMAGE_FULL_WIDTH, nativeW) * nativeH) / nativeW),
  };
}

async function buildProject(project) {
  const folder = `${PROJECTS_FOLDER}/${project.slug}`;
  const resources = await searchAll(subtree(folder));
  const byId = new Map(resources.map((r) => [r.public_id, r]));

  const cms = (Array.isArray(project.images) ? project.images : [])
    .map((image) => ({ ...image, parsed: parseCloudinaryUrl(image.src) }))
    .filter((image) => image.parsed);

  // CMS entries uploaded elsewhere (another folder) are fetched one by one.
  for (const image of cms) {
    if (byId.has(image.parsed.publicId) || image.hidden) continue;
    try {
      const resource = await cloudinary.api.resource(image.parsed.publicId, {
        resource_type: image.parsed.resourceType,
      });
      byId.set(resource.public_id, resource);
    } catch {
      console.warn(`  ⚠ ${project.slug}: CMS photo not found in Cloudinary: ${image.parsed.publicId}`);
    }
  }

  let picked;
  if (cms.length > 0) {
    const listed = new Set(cms.map((image) => image.parsed.publicId));
    const unlisted = resources.filter((r) => !listed.has(r.public_id));
    if (unlisted.length) {
      console.warn(
        `  ℹ ${project.slug}: ${unlisted.length} asset(s) in ${folder} are not in the CMS and stay hidden ` +
          `(add them in Projekty → ${project.title} → „Přidat z Cloudinary“).`,
      );
    }
    picked = cms
      .filter((image) => !image.hidden && byId.has(image.parsed.publicId))
      .map((image) => ({ resource: byId.get(image.parsed.publicId), alt: image.alt?.trim() }));
  } else {
    picked = resources.map((resource) => ({ resource, alt: resource.context?.custom?.alt }));
  }

  return picked.map(({ resource, alt }) =>
    buildItem(resource, { alt: alt || toAlt(resource.public_id, project.title) }),
  );
}

async function main() {
  await loadEnv();

  if (!process.env.CLOUDINARY_URL) {
    const keep = await exists(OUT_FILE);
    console.warn(
      `⚠ CLOUDINARY_URL not set – skipping Cloudinary gallery fetch.${keep ? " Keeping existing projects-gallery.json." : ""}`,
    );
    if (!keep) await writeOut({ generatedAt: null, projects: {} });
    return;
  }

  cloudinary.config(true); // re-read CLOUDINARY_URL (loadEnv may have just set it)
  cloudinary.config({ secure: true, analytics: false });

  const projects = await loadProjects();
  const out = {};
  for (const project of projects) out[project.slug] = await buildProject(project);

  await writeOut({ generatedAt: new Date().toISOString(), projects: out });

  const total = Object.values(out).reduce((sum, items) => sum + items.length, 0);
  const summary = Object.entries(out).map(([slug, items]) => `${slug} ${items.length}`).join(", ");
  if (total === 0) {
    console.warn(
      `⚠ Cloudinary gallery is EMPTY – credentials worked but nothing matched "${PROJECTS_FOLDER}/<project>". ` +
        "Check folder names and capitalisation in the media library.",
    );
  }
  console.log(`✓ Cloudinary gallery: ${total} items (${summary}) → public/data/projects-gallery.json`);
}

// The gallery is an enhancement, never a build blocker.
main().catch(async (error) => {
  console.warn("⚠ Cloudinary gallery fetch failed – deploying without fresh gallery data.");
  console.warn(`  ${error?.message ?? error}`);
  if (!(await exists(OUT_FILE))) await writeOut({ generatedAt: null, projects: {} });
});
