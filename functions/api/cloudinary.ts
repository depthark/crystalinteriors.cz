/**
 * Cloudinary uploads for the CMS without a Cloudinary login
 * (Cloudflare Pages Function).
 *
 * POST /api/cloudinary  { action: "sign", folder }
 *   → { cloudName, apiKey, timestamp, signature, folder }
 *   The browser then uploads the file straight to Cloudinary, so big photos
 *   never pass through this function.
 *
 * POST /api/cloudinary  { action: "list", folder }
 *   → { items: [{ url, type, width, height, createdAt }] } – everything in
 *   that folder, so editors can add photos uploaded straight in Cloudinary.
 *
 * POST /api/cloudinary  { action: "rebuild" }
 *   → triggers the Pages deploy hook (optional).
 *
 * Every call must carry the editor's GitHub token from the Decap login
 * (`Authorization: Bearer <token>`). It is accepted only with push access to
 * the site repository – the same people who can publish in the CMS. Uploads
 * are limited to folders under CLOUDINARY_ROOT.
 *
 * Environment (Pages → Settings → Variables and Secrets):
 *   CLOUDINARY_URL   – cloudinary://API_KEY:API_SECRET@CLOUD_NAME (encrypted)
 *   CMS_REPO         – optional, defaults to depthark/crystalinteriors.cz
 *   DEPLOY_HOOK_URL  – optional Pages deploy hook URL
 */
interface Env {
  CLOUDINARY_URL?: string;
  CMS_REPO?: string;
  DEPLOY_HOOK_URL?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const DEFAULT_REPO = "depthark/crystalinteriors.cz";
const CLOUDINARY_ROOT = "CrystalInteriors";
// CrystalInteriors/Projekty/<project-slug> or CrystalInteriors/Web
const FOLDER = new RegExp(`^${CLOUDINARY_ROOT}/(Projekty/[a-z0-9-]{1,60}|Web)$`);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function parseCloudinaryUrl(value = "") {
  const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(value.trim());
  return match ? { apiKey: match[1], apiSecret: match[2], cloudName: match[3] } : null;
}

/** True when the GitHub token belongs to someone who can push to the repo. */
async function canPublish(request: Request, repo: string): Promise<boolean> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) return false;
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "crystalinteriors-cms",
    },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { permissions?: { push?: boolean } };
  return data.permissions?.push === true;
}

type Creds = { apiKey: string; apiSecret: string; cloudName: string };

/** Images and videos in a folder (fixed or dynamic folder mode), newest first. */
async function listFolder(creds: Creds, folder: string): Promise<Response> {
  const expression =
    `(folder="${folder}" OR asset_folder="${folder}") AND (resource_type:image OR resource_type:video)`;
  const res = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/search`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.apiKey}:${creds.apiSecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expression, sort_by: [{ created_at: "desc" }], max_results: 200 }),
  });
  if (!res.ok) return json({ error: `Cloudinary: HTTP ${res.status}` }, 502);
  const data = (await res.json()) as {
    resources?: Array<{ secure_url: string; resource_type: string; width: number; height: number; created_at: string }>;
  };
  return json({
    items: (data.resources ?? []).map((r) => ({
      url: r.secure_url,
      type: r.resource_type,
      width: r.width,
      height: r.height,
      createdAt: r.created_at,
    })),
  });
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!(await canPublish(request, env.CMS_REPO || DEFAULT_REPO))) {
    return json({ error: "Přihlaste se do administrace účtem s přístupem k webu." }, 401);
  }

  let body: { action?: string; folder?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  if (body.action === "rebuild") {
    if (!env.DEPLOY_HOOK_URL) return json({ rebuilt: false });
    const hook = await fetch(env.DEPLOY_HOOK_URL, { method: "POST" });
    return json({ rebuilt: hook.ok });
  }

  if (body.action !== "sign" && body.action !== "list") return json({ error: "Unknown action." }, 400);

  const folder = body.folder ?? "";
  if (!FOLDER.test(folder)) return json({ error: "Folder not allowed." }, 400);

  const creds = parseCloudinaryUrl(env.CLOUDINARY_URL);
  if (!creds) return json({ error: "CLOUDINARY_URL is not configured." }, 500);

  if (body.action === "list") return listFolder(creds, folder);

  // Cloudinary signs the alphabetically sorted params followed by the secret.
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${folder}&timestamp=${timestamp}&unique_filename=true&use_filename=true`;
  const signature = await sha1Hex(params + creds.apiSecret);

  return json({ cloudName: creds.cloudName, apiKey: creds.apiKey, timestamp, signature, folder });
};
