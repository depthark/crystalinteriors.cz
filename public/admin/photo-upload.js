/**
 * Photo uploads for the Crystal Interiors CMS – no image service.
 *
 * Picked photos are compressed in the browser (image-pipeline.js: AVIF in
 * 400–2400 px widths + focus point) and committed to the repository under
 * public/gallery/<group>/ (repo-store.js). Fields store only the base path
 * `/gallery/<group>/<name>`; the website builds srcset from the files.
 *
 * window.CrystalPhotos:
 *   openDialog({ group, prefix, label, multiple }) → [{ src, focus, width, height }]
 *   editFocus({ src, focus }) → focus | null
 *   thumb(src) → small preview URL,  onThumbError(event, src) – fallback
 */
(() => {
  const preview = new Map(); // src → object URL of this session's uploads

  const slugify = (value) =>
    String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  const isSet = (src) => /^\/gallery\/[^.]+$/.test(src || "");
  const thumb = (src) => preview.get(src) || (isSet(src) ? `${src}-400.avif` : src || "");

  /** Missing width → the 400 px file; not deployed yet → raw file on GitHub. */
  async function onThumbError(event, src) {
    const img = event.currentTarget;
    if (!isSet(src)) return;
    const step = Number(img.dataset.fallback || 0);
    img.dataset.fallback = String(step + 1);
    if (step === 0 && !img.src.endsWith("-400.avif")) {
      img.src = `${src}-400.avif`;
      return;
    }
    if (step <= 1) {
      const url = await window.RepoStore.fallbackUrl(`${src}-400.avif`);
      if (url) img.src = url;
    }
  }

  const css = `
    .cph{border:0;padding:0;border-radius:14px;width:min(36rem,calc(100vw - 2rem));font:15px/1.5 system-ui,sans-serif;color:#1f1d1a;box-shadow:0 24px 64px rgb(0 0 0/.35)}
    .cph::backdrop{background:rgb(20 18 15/.55);backdrop-filter:blur(4px)}
    .cph form{display:flex;flex-direction:column;gap:18px;padding:26px}
    .cph h2{margin:0;font-size:20px}
    .cph .where{margin:0;color:#5c554b;font-size:14px}
    .cph .drop{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 16px;border:2px dashed #B9A6CF;border-radius:12px;background:#FAF7FC;text-align:center;cursor:pointer;transition:border-color .2s,background .2s}
    .cph .drop.over,.cph .drop:hover{border-color:#6B3E95;background:#EEE5F7}
    .cph .drop:focus-within{outline:2px solid #6B3E95;outline-offset:2px}
    .cph .drop strong{font-size:16px}
    .cph .drop small{color:#6b6357}
    .cph .drop input{position:absolute;width:1px;height:1px;opacity:0}
    .cph .files{margin:0;padding:0;list-style:none;display:grid;gap:6px;font-size:13px;color:#3b362f;max-height:13rem;overflow:auto}
    .cph .files li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}
    .cph .files progress{grid-column:1/-1;width:100%;height:6px;accent-color:#6B3E95}
    .cph .files .state{color:#6b6357}
    .cph .files .err{grid-column:1/-1;color:#b42318}
    .cph .msg{margin:0;min-height:1.5em;font-size:14px}
    .cph .msg.err{color:#b42318}
    .cph .row{display:flex;justify-content:flex-end;gap:8px}
    .cph button{font:inherit;min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #d6cdbf;background:#fff;cursor:pointer}
    .cph button[type=submit]{background:#6B3E95;border-color:#6B3E95;color:#fff;font-weight:600}
    .cph button:focus-visible{outline:2px solid #6B3E95;outline-offset:2px}
    .cph button:disabled{opacity:.6;cursor:wait}
    .cph .stage{position:relative;display:grid;place-items:center;background:#1f1d1a;border-radius:10px;overflow:hidden;cursor:crosshair;touch-action:none}
    .cph .stage img{display:block;max-width:100%;max-height:min(55vh,28rem);user-select:none;-webkit-user-drag:none}
    .cph .dot{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 2px #6B3E95,0 2px 8px rgb(0 0 0/.5);pointer-events:none}
    .cph .tile{width:12rem;aspect-ratio:4/3;border-radius:8px;overflow:hidden;background:#eee}
    .cph .tile img{width:100%;height:100%;object-fit:cover;display:block}
    .cph .side{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap}
    .cph .side p{margin:0;flex:1;min-width:10rem;font-size:14px;color:#5c554b}`;

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rand = () => Math.random().toString(36).slice(2, 6);

  function openDialog({ group = "web", prefix = "foto", label = "", multiple = false } = {}) {
    return new Promise((resolve) => {
      const results = [];
      const dialog = document.createElement("dialog");
      dialog.className = "cph";
      dialog.setAttribute("aria-labelledby", "cph-title");
      dialog.innerHTML = `
        <style>${css}</style>
        <form method="dialog">
          <h2 id="cph-title">Nahrát ${multiple ? "fotky" : "fotku"}</h2>
          ${label ? `<p class="where">Fotky se přidají do: <strong>${escapeHtml(label)}</strong></p>` : ""}
          <label class="drop">
            <strong>Přetáhněte ${multiple ? "fotky" : "fotku"} sem</strong>
            <span>nebo klikněte a vyberte z počítače</span>
            <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" ${multiple ? "multiple" : ""} required>
            <small>JPG, PNG nebo WebP, ideálně 2400 px na šířku. Fotky zmenšíme a zkomprimujeme přímo v prohlížeči – chvilku to potrvá.</small>
          </label>
          <ul class="files" aria-label="Vybrané fotky"></ul>
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
      const msg = dialog.querySelector(".msg");
      const submit = form.querySelector("button[type=submit]");
      let picked = [];
      let busy = false;

      const close = () => {
        if (busy) return;
        dialog.close();
        dialog.remove();
        resolve(results);
      };
      const show = (files) => {
        picked = files.filter((f) => f.type.startsWith("image/"));
        if (!multiple) picked = picked.slice(0, 1);
        list.innerHTML = picked
          .map((f, i) => `<li data-i="${i}"><span>${escapeHtml(f.name)} · ${(f.size / 1048576).toFixed(1)} MB</span><span class="state">čeká</span><progress value="0" max="1"></progress></li>`)
          .join("");
        msg.className = "msg";
        msg.textContent = picked.length ? `Vybráno: ${picked.length}` : "";
      };
      const row = (i) => list.querySelector(`li[data-i="${i}"]`);

      dialog.querySelector("button[value=cancel]").addEventListener("click", close);
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
      input.addEventListener("change", () => show([...(input.files || [])]));
      ["dragenter", "dragover"].forEach((type) => drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((type) => drop.addEventListener(type, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (e) => { e.preventDefault(); show([...(e.dataTransfer?.files || [])]); });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!picked.length) { msg.className = "msg err"; msg.textContent = "Nejdřív vyberte fotku."; return; }
        busy = true;
        submit.disabled = true;
        msg.className = "msg";
        msg.textContent = "Zmenšuji a komprimuji fotky…";

        // 1. Compress every photo (in parallel workers).
        const processed = await Promise.all(
          picked.map(async (file, i) => {
            const li = row(i);
            const state = li.querySelector(".state");
            const bar = li.querySelector("progress");
            state.textContent = "zpracovávám";
            try {
              // Project galleries get the logo watermark (src/lib/watermark.ts).
              const out = await window.ImagePipeline.process(file, {
                onProgress: (p) => (bar.value = p * 0.9),
                watermark: group.startsWith("projekty/"),
              });
              const name = `${slugify(prefix)}-${slugify(file.name.replace(/\.\w+$/, "")) || "foto"}-${rand()}`;
              const src = `/gallery/${group}/${name}`;
              state.textContent = `${out.width} × ${out.height} px · ${(out.files.reduce((s, f) => s + f.blob.size, 0) / 1024).toFixed(0)} kB`;
              return { file, src, ...out };
            } catch (error) {
              bar.remove();
              state.textContent = "chyba";
              li.insertAdjacentHTML("beforeend", `<span class="err">${escapeHtml(error.message)}</span>`);
              return null;
            }
          }),
        );
        const ok = processed.filter(Boolean);
        if (!ok.length) {
          busy = false;
          submit.disabled = false;
          msg.className = "msg err";
          msg.textContent = "Žádnou fotku se nepodařilo zpracovat.";
          return;
        }

        // 2. One commit with all files.
        msg.textContent = `Ukládám ${ok.length} ${ok.length === 1 ? "fotku" : "fotek"} na web…`;
        try {
          const files = ok.flatMap((item) => item.files.map((f) => ({ path: `public${item.src}-${f.width}.avif`, blob: f.blob })));
          await window.RepoStore.commit(files, `content(media): ${ok.length} photo(s) → /gallery/${group}`, {
            onProgress: (p) => ok.forEach((_, i) => { const bar = row(processed.indexOf(ok[i]))?.querySelector("progress"); if (bar) bar.value = 0.9 + p * 0.1; }),
          });
          for (const item of ok) {
            const smallest = item.files[0];
            preview.set(item.src, URL.createObjectURL(smallest.blob));
            results.push({ src: item.src, focus: item.focus, width: item.width, height: item.height });
          }
          busy = false;
          const failed = processed.length - ok.length;
          msg.textContent = `Hotovo – nahráno ${ok.length}${failed ? `, ${failed} se nepodařilo` : ""}. Na webu se objeví po publikování.`;
          setTimeout(close, failed ? 2500 : 900);
        } catch (error) {
          busy = false;
          submit.disabled = false;
          msg.className = "msg err";
          msg.textContent = `Uložení selhalo: ${error.message}`;
        }
      });

      dialog.showModal();
    });
  }

  /** Click (or drag) on the full photo to set what stays in frame. */
  function editFocus({ src, focus = { x: 50, y: 50 } }) {
    return new Promise((resolve) => {
      let current = { ...focus };
      const dialog = document.createElement("dialog");
      dialog.className = "cph";
      dialog.setAttribute("aria-labelledby", "cph-focus-title");
      const large = preview.get(src) || (isSet(src) ? `${src}-800.avif` : src);
      dialog.innerHTML = `
        <style>${css}</style>
        <form method="dialog">
          <h2 id="cph-focus-title">Co má být vidět v náhledu</h2>
          <div class="stage"><img alt="Celá fotka" draggable="false"><span class="dot"></span></div>
          <div class="side">
            <div class="tile"><img alt="Náhled dlaždice na webu"></div>
            <p>Klikněte na to nejdůležitější na fotce. Dlaždice na webu fotku ořízne na 4:3 a tohle místo nechá vidět. Ve zvětšení je fotka vždy celá.</p>
          </div>
          <div class="row">
            <button type="button" value="reset">Na střed</button>
            <button type="button" value="cancel">Zrušit</button>
            <button type="submit">Použít</button>
          </div>
        </form>`;
      document.body.append(dialog);
      const stage = dialog.querySelector(".stage");
      const full = stage.querySelector("img");
      const dot = stage.querySelector(".dot");
      const tile = dialog.querySelector(".tile img");
      for (const img of [full, tile]) {
        img.addEventListener("error", (e) => onThumbError(e, src));
        img.src = img === tile ? thumb(src) : large;
      }

      const paint = () => {
        const box = full.getBoundingClientRect();
        const host = stage.getBoundingClientRect();
        dot.style.left = `${box.left - host.left + (box.width * current.x) / 100}px`;
        dot.style.top = `${box.top - host.top + (box.height * current.y) / 100}px`;
        tile.style.objectPosition = `${current.x}% ${current.y}%`;
      };
      const set = (event) => {
        const box = full.getBoundingClientRect();
        current = {
          x: Math.round(Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100))),
          y: Math.round(Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100))),
        };
        paint();
      };
      let dragging = false;
      stage.addEventListener("pointerdown", (e) => { dragging = true; stage.setPointerCapture(e.pointerId); set(e); });
      stage.addEventListener("pointermove", (e) => dragging && set(e));
      stage.addEventListener("pointerup", () => (dragging = false));
      full.addEventListener("load", paint);

      const finish = (value) => { dialog.close(); dialog.remove(); resolve(value); };
      dialog.querySelector("button[value=cancel]").addEventListener("click", () => finish(null));
      dialog.querySelector("button[value=reset]").addEventListener("click", () => { current = { x: 50, y: 50 }; paint(); });
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); finish(null); });
      dialog.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); finish(current); });
      dialog.showModal();
      paint();
    });
  }

  window.CrystalPhotos = { openDialog, editFocus, thumb, onThumbError, isSet, slugify };
})();
