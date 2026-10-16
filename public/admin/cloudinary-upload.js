/**
 * Cloudinary uploads for Decap CMS without a Cloudinary account.
 *
 * /api/cloudinary checks the editor's CMS (GitHub) login and signs each
 * upload; the file then goes straight from the browser to Cloudinary.
 * Photos over Cloudinary's 10 MB limit are downscaled in the browser first.
 *
 * Exposes window.CrystalCloudinary for the gallery and image widgets and
 * registers the "crystal-cloudinary" media library.
 */
(() => {
  const MAX_BYTES = 9.5 * 1024 * 1024;
  const MAX_EDGE = 4000;

  const token = () => {
    for (const key of ["decap-cms-user", "netlify-cms-user"]) {
      try {
        const user = JSON.parse(localStorage.getItem(key) || "null");
        if (user?.token) return user.token;
      } catch {}
    }
    return "";
  };

  const api = async (body) => {
    const res = await fetch("/api/cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  /** Large photos → max 4000 px JPEG, so they fit Cloudinary's upload limit. */
  async function shrink(file) {
    if (file.size <= MAX_BYTES || !file.type.startsWith("image/")) return file;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.72]) {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= MAX_BYTES) {
          return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
        }
      }
    } catch {}
    return file;
  }

  const upload = (file, sig, onProgress) =>
    new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);
      form.append("use_filename", "true");
      form.append("unique_filename", "true");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
        xhr.status < 300 ? resolve(data) : reject(new Error(data.error?.message || `HTTP ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Nahrávání selhalo – zkontrolujte připojení k internetu."));
      xhr.send(form);
    });

  /** res.cloudinary.com URL → { cloud, kind, id } */
  const parse = (url) => {
    const m = /res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:[^/]*,[^/]*\/)*(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i.exec(url || "");
    return m ? { cloud: m[1], kind: m[2], id: m[3] } : null;
  };

  /** Small thumbnail; the same 4:3 crop the website uses for gallery tiles. */
  const thumbOf = (url, w = 480) => {
    const p = parse(url);
    if (!p) return url || "";
    const crop = `q_auto,c_fill,g_auto,w_${w},h_${Math.round((w * 3) / 4)}`;
    return p.kind === "video"
      ? `https://res.cloudinary.com/${p.cloud}/video/upload/${crop}/${p.id}.jpg`
      : `https://res.cloudinary.com/${p.cloud}/image/upload/f_auto,${crop}/${p.id}`;
  };

  const css = `
    .ccu{border:0;padding:0;border-radius:14px;width:min(34rem,calc(100vw - 2rem));font:15px/1.5 system-ui,sans-serif;color:#1f1d1a;box-shadow:0 24px 64px rgb(0 0 0/.35)}
    .ccu::backdrop{background:rgb(20 18 15/.55);backdrop-filter:blur(4px)}
    .ccu form{display:flex;flex-direction:column;gap:18px;padding:26px}
    .ccu h2{margin:0;font-size:20px}
    .ccu .where{margin:0;color:#5c554b;font-size:14px}
    .ccu .drop{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 16px;border:2px dashed #b9ab95;border-radius:12px;background:#faf7f2;text-align:center;cursor:pointer;transition:border-color .2s,background .2s}
    .ccu .drop.over,.ccu .drop:hover{border-color:#7a5c33;background:#f3ece1}
    .ccu .drop:focus-within{outline:2px solid #7a5c33;outline-offset:2px}
    .ccu .drop strong{font-size:16px}
    .ccu .drop small{color:#6b6357}
    .ccu .drop input{position:absolute;width:1px;height:1px;opacity:0}
    .ccu .files{margin:0;padding:0;list-style:none;display:grid;gap:4px;font-size:13px;color:#3b362f;max-height:9rem;overflow:auto}
    .ccu progress{width:100%;height:8px;accent-color:#7a5c33}
    .ccu .msg{margin:0;min-height:1.5em;font-size:14px}
    .ccu .msg.err{color:#b42318}
    .ccu .row{display:flex;justify-content:flex-end;gap:8px}
    .ccu button{font:inherit;min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #d6cdbf;background:#fff;cursor:pointer}
    .ccu button[type=submit]{background:#7a5c33;border-color:#7a5c33;color:#fff;font-weight:600}
    .ccu button:focus-visible{outline:2px solid #7a5c33;outline-offset:2px}
    .ccu button:disabled{opacity:.6;cursor:wait}`;

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /**
   * Upload dialog. Resolves with [{ url, width, height, name }] for every
   * uploaded file (empty array when cancelled).
   */
  function openDialog({ folder = "CrystalInteriors/Web", label = "", multiple = false, video = false } = {}) {
    return new Promise((resolve) => {
      const results = [];
      const dialog = document.createElement("dialog");
      dialog.className = "ccu";
      dialog.setAttribute("aria-labelledby", "ccu-title");
      dialog.innerHTML = `
        <style>${css}</style>
        <form method="dialog">
          <h2 id="ccu-title">Nahrát ${multiple ? "fotky a videa" : "fotku"}</h2>
          ${label ? `<p class="where">Fotky se přidají do: <strong>${escapeHtml(label)}</strong></p>` : ""}
          <label class="drop">
            <strong>Přetáhněte ${multiple ? "fotky nebo videa" : "fotku"} sem</strong>
            <span>nebo klikněte a vyberte z počítače</span>
            <input type="file" name="file" accept="${video ? "image/*,video/*" : "image/*"}" ${multiple ? "multiple" : ""} required>
            <small>Fotky JPG, PNG, WebP nebo HEIC – ideálně alespoň 2000 px, velké zmenšíme automaticky.${video ? " Videa MP4 (H.264), 1080p, do 100 MB." : ""}</small>
          </label>
          <ul class="files" aria-label="Vybrané soubory"></ul>
          <progress value="0" max="1" hidden></progress>
          <p class="msg" role="status" aria-live="polite"></p>
          <div class="row">
            <button type="button" value="cancel">Zavřít</button>
            <button type="submit">Nahrát</button>
          </div>
        </form>`;
      document.body.append(dialog);

      const form = dialog.querySelector("form");
      const drop = dialog.querySelector(".drop");
      const input = form.elements.file;
      const list = dialog.querySelector(".files");
      const progress = dialog.querySelector("progress");
      const msg = dialog.querySelector(".msg");
      const submit = form.querySelector("button[type=submit]");
      let picked = [];

      const close = () => { dialog.close(); dialog.remove(); resolve(results); };
      const show = (files) => {
        picked = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name) || (video && f.type.startsWith("video/")));
        if (!multiple) picked = picked.slice(0, 1);
        list.innerHTML = picked.map((f) => `<li>${escapeHtml(f.name)} · ${(f.size / 1048576).toFixed(1)} MB</li>`).join("");
        msg.className = "msg";
        msg.textContent = picked.length ? `Vybráno: ${picked.length}` : "";
      };

      dialog.querySelector("button[value=cancel]").addEventListener("click", close);
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
      input.addEventListener("change", () => show([...(input.files || [])]));
      ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (e) => { e.preventDefault(); show([...(e.dataTransfer?.files || [])]); });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!picked.length) { msg.className = "msg err"; msg.textContent = "Nejdřív vyberte fotku."; return; }
        submit.disabled = true;
        progress.hidden = false;
        msg.className = "msg";
        try {
          for (const [i, original] of picked.entries()) {
            const prefix = picked.length > 1 ? `${i + 1} / ${picked.length}: ` : "";
            msg.textContent = `${prefix}připravuji ${original.name}…`;
            const file = await shrink(original);
            const sig = await api({ action: "sign", folder });
            const result = await upload(file, sig, (p) => {
              progress.value = (i + p) / picked.length;
              msg.textContent = `${prefix}nahrávám ${original.name} – ${Math.round(p * 100)} %`;
            });
            results.push({ url: result.secure_url, type: result.resource_type, width: result.width, height: result.height, name: original.name });
          }
          progress.value = 1;
          msg.textContent = picked.length > 1 ? `Hotovo – nahráno ${picked.length} fotek.` : "Hotovo – fotka je nahraná.";
          setTimeout(close, 700);
        } catch (error) {
          msg.className = "msg err";
          msg.textContent = `Chyba: ${error.message}`;
          submit.disabled = false;
        }
      });

      dialog.showModal();
    });
  }

  window.CrystalCloudinary = { api, upload, parse, thumbOf, openDialog };

  window.CMS.registerMediaLibrary({
    name: "crystal-cloudinary",
    init: ({ handleInsert }) => ({
      show: async ({ config = {} } = {}) => {
        const [first] = await openDialog({ folder: config.folder || "CrystalInteriors/Web" });
        if (first) handleInsert(first.url);
      },
      hide: () => {},
      enableStandalone: () => false,
    }),
  });
})();
