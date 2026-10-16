/**
 * "room-gallery" widget – one room's photos on one screen.
 *
 * Every card is one photo or video exactly as the website shows it:
 * thumbnail, alt text, hide, order, remove. New files are uploaded straight
 * to Cloudinary (folder CrystalInteriors/Reference/<slug>) and added to the
 * end; "Přidat z Cloudinary" adds files already sitting in that folder (e.g.
 * uploaded in the Cloudinary console). The build script merges this list with
 * the folder (scripts/build-cloudinary-gallery.mjs).
 *
 * Value: array of { src, alt, hidden }.
 */
(() => {
  const { h, createClass } = window;
  // Resolved lazily: a stale cached cloudinary-upload.js must not crash Decap.
  const CC = new Proxy({}, { get: (_, key) => window.CrystalCloudinary?.[key] ?? (() => "") });

  const toArray = (value) => {
    const plain = value?.toJS ? value.toJS() : value;
    return Array.isArray(plain) ? plain : [];
  };
  const fileName = (src) => decodeURIComponent((CC.parse(src)?.id || src || "").split("/").pop());
  const slugify = (value) =>
    String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  const ICONS = {
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
    eyeOff: "M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.1A9.8 9.8 0 0 1 21 12a13 13 0 0 1-2.2 3.1 M6.6 6.6A13 13 0 0 0 3 12a9.8 9.8 0 0 0 11.4 5.6",
    alert: "M12 9v4 M12 17h.01 M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    video: "M3 6h13v12H3z M16 10l5-3v10l-5-3",
    cloud: "M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z M12 11v5 M9.5 13.5L12 11l2.5 2.5",
  };
  const icon = (name, size = 18) =>
    h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      h("path", { d: ICONS[name] }));

  const STYLE = `
  .rg{--brand:#7a5c33;--brand-bg:#f6f0e6;--line:#ddd4c6;--muted:#6b6357;font:14px/1.5 system-ui,sans-serif;color:#1f1d1a}
  .rg button,.rg input{font:inherit}
  .rg :focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .rg-help{margin:0 0 14px;padding:12px 16px;border-radius:10px;background:var(--brand-bg);color:#4a3d2a}
  .rg-bar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 0;margin-bottom:14px;background:#fff;border-bottom:1px solid var(--line)}
  .rg-count{color:var(--muted)}
  .rg-warn{display:inline-flex;align-items:center;gap:6px;color:#9a5b00}
  .rg-primary{margin-left:auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:0;border-radius:10px;background:var(--brand);color:#fff;font-weight:600;cursor:pointer}
  .rg-primary:hover{background:#654b29}
  .rg-secondary{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid var(--brand);border-radius:10px;background:#fff;color:var(--brand);font-weight:600;cursor:pointer}
  .rg-secondary:hover{background:var(--brand-bg)}
  .rg-pick{border:0;padding:0;border-radius:14px;width:min(52rem,calc(100vw - 2rem));max-height:calc(100vh - 2rem);font:14px/1.5 system-ui,sans-serif;color:#1f1d1a;box-shadow:0 24px 64px rgb(0 0 0/.35)}
  .rg-pick::backdrop{background:rgb(20 18 15/.55);backdrop-filter:blur(4px)}
  .rg-pick form{display:flex;flex-direction:column;gap:14px;padding:24px;max-height:calc(100vh - 2rem);box-sizing:border-box}
  .rg-pick h2{margin:0;font-size:19px}
  .rg-pick .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;overflow:auto;min-height:6rem}
  .rg-pick label{position:relative;display:block;border:2px solid transparent;border-radius:10px;overflow:hidden;cursor:pointer}
  .rg-pick label:has(:checked){border-color:#7a5c33}
  .rg-pick label:has(:focus-visible){outline:2px solid #7a5c33;outline-offset:2px}
  .rg-pick img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
  .rg-pick input{position:absolute;top:8px;left:8px;width:20px;height:20px;accent-color:#7a5c33}
  .rg-pick .row{display:flex;justify-content:flex-end;gap:8px}
  .rg-pick button{font:inherit;min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #d6cdbf;background:#fff;cursor:pointer}
  .rg-pick button[type=submit]{background:#7a5c33;border-color:#7a5c33;color:#fff;font-weight:600}
  .rg-pick .msg{margin:0;color:#6b6357}
  .rg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
  .rg-card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;transition:box-shadow .2s}
  .rg-card:hover{box-shadow:0 8px 24px rgb(0 0 0/.08)}
  .rg-card[data-hidden=true] .rg-thumb img{opacity:.35}
  .rg-thumb{position:relative;aspect-ratio:4/3;background:#eee;display:block}
  .rg-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .rg-badges{position:absolute;inset:8px 8px auto 8px;display:flex;flex-wrap:wrap;gap:6px}
  .rg-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;background:rgb(0 0 0/.68);color:#fff;font-size:12px;font-weight:600}
  .rg-badge.cover{background:var(--brand)}
  .rg-body{display:flex;flex-direction:column;gap:8px;padding:12px}
  .rg-name{font-size:12px;color:var(--muted);word-break:break-all}
  .rg-body label.alt{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:600;color:var(--muted)}
  .rg-body input[type=text]{min-height:38px;padding:0 10px;border:1px solid var(--line);border-radius:8px;font-weight:400;color:#1f1d1a}
  .rg-body input[type=text][data-empty=true]{border-color:#e0a440;background:#fffaf0}
  .rg-check{display:flex;align-items:center;gap:6px;min-height:36px;cursor:pointer}
  .rg-actions{display:flex;align-items:center;gap:6px}
  .rg-icon{display:inline-grid;place-items:center;width:38px;height:38px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;color:#1f1d1a}
  .rg-icon:hover:not(:disabled){border-color:var(--brand);color:var(--brand)}
  .rg-icon:disabled{opacity:.35;cursor:not-allowed}
  .rg-icon.danger{margin-left:auto;color:#b42318}
  .rg-empty{padding:40px 20px;text-align:center;border:2px dashed var(--line);border-radius:12px;color:var(--muted)}
  @media (prefers-reduced-motion:reduce){.rg *{transition:none!important}}`;

  const RoomGallery = createClass({
    items() {
      return toArray(this.props.value);
    },

    commit(next) {
      this.props.onChange(next);
    },

    update(index, patch) {
      this.commit(this.items().map((item, i) => (i === index ? { ...item, ...patch } : item)));
    },

    move(index, to) {
      const next = this.items().slice();
      if (to < 0 || to >= next.length) return;
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      this.commit(next);
    },

    room() {
      const data = this.props.entry?.get?.("data");
      const slug = slugify(data?.get?.("slug") || data?.get?.("title"));
      return { slug: slug || "nezarazene", title: data?.get?.("title") || "" };
    },

    async askRemove(index) {
      const ask = window.CrystalConfirm ?? (async () => window.confirm("Odebrat fotku z webu?"));
      const ok = await ask({
        title: "Odebrat fotku z galerie?",
        text: `„${fileName(this.items()[index].src)}“ zmizí z webu po uložení a publikování. Soubor v Cloudinary zůstane, takže ho lze vrátit.`,
        ok: "Odebrat z webu",
      });
      if (ok) this.commit(this.items().filter((_, i) => i !== index));
    },

    folder() {
      return `CrystalInteriors/Reference/${this.room().slug}`;
    },

    /** Files already in the room's Cloudinary folder that the CMS does not list yet. */
    async addFromCloudinary() {
      const dialog = document.createElement("dialog");
      dialog.className = "rg-pick";
      dialog.innerHTML = `<form method="dialog"><h2>Přidat z Cloudinary</h2>
        <p class="msg" role="status" aria-live="polite">Načítám složku ${this.folder()}…</p>
        <div class="grid"></div>
        <div class="row"><button type="button" value="cancel">Zavřít</button><button type="submit" disabled>Přidat vybrané</button></div></form>`;
      dialog.prepend(Object.assign(document.createElement("style"), { textContent: STYLE }));
      document.body.append(dialog);
      const close = () => { dialog.close(); dialog.remove(); };
      dialog.querySelector("button[value=cancel]").addEventListener("click", close);
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
      dialog.showModal();

      const msg = dialog.querySelector(".msg");
      const grid = dialog.querySelector(".grid");
      const submit = dialog.querySelector("button[type=submit]");
      try {
        const { items = [] } = await CC.api({ action: "list", folder: this.folder() });
        const known = new Set(this.items().map((item) => CC.parse(item.src)?.id));
        const fresh = items.filter((item) => !known.has(CC.parse(item.url)?.id));
        if (!fresh.length) {
          msg.textContent = items.length ? "Všechno ze složky už v galerii je." : "Složka je zatím prázdná – nahrajte fotky tlačítkem „Nahrát“.";
          return;
        }
        msg.textContent = `Ve složce je ${fresh.length} souborů, které ještě nejsou v galerii. Vyberte, které přidat.`;
        grid.innerHTML = fresh
          .map((item, i) => `<label><input type="checkbox" name="pick" value="${i}" checked aria-label="Přidat ${item.type === "video" ? "video" : "fotku"} ${i + 1}"><img src="${CC.thumbOf(item.url, 300)}" alt="" loading="lazy"></label>`)
          .join("");
        submit.disabled = false;
        dialog.querySelector("form").addEventListener("submit", (event) => {
          event.preventDefault();
          const chosen = [...dialog.querySelectorAll("input[name=pick]:checked")].map((input) => fresh[Number(input.value)]);
          if (chosen.length) {
            this.commit([...this.items(), ...chosen.map((item) => ({ src: item.url, alt: "", hidden: false }))]);
          }
          close();
        });
      } catch (error) {
        msg.textContent = `Nepodařilo se načíst složku: ${error.message}`;
      }
    },

    async add() {
      const room = this.room();
      const uploaded = await CC.openDialog({
        multiple: true,
        video: true,
        folder: this.folder(),
        label: room.title ? `Reference → ${room.title}` : "",
      });
      if (!uploaded.length) return;
      this.commit([...this.items(), ...uploaded.map(({ url }) => ({ src: url, alt: "", hidden: false }))]);
    },

    renderCard(item, index, count) {
      const name = fileName(item.src);
      const missingAlt = !String(item.alt || "").trim();
      return h("article", { key: item.src + index, className: "rg-card", "data-hidden": String(Boolean(item.hidden)) },
        h("a", { className: "rg-thumb", href: item.src, target: "_blank", rel: "noopener", title: "Otevřít originál v nové záložce" },
          h("img", { src: CC.thumbOf(item.src), alt: item.alt || name, loading: "lazy", decoding: "async" }),
          h("div", { className: "rg-badges" },
            index === 0 && h("span", { className: "rg-badge cover" }, icon("star", 13), "Hlavní fotka"),
            CC.parse(item.src)?.kind === "video" && h("span", { className: "rg-badge" }, icon("video", 13), "Video"),
            item.hidden && h("span", { className: "rg-badge" }, icon("eyeOff", 13), "Skryto"))),
        h("div", { className: "rg-body" },
          h("div", { className: "rg-name" }, name),
          h("label", { className: "alt" }, missingAlt ? "Popis fotky – doplňte prosím" : "Popis fotky",
            h("input", {
              type: "text",
              value: item.alt || "",
              "data-empty": String(missingAlt),
              placeholder: "např. Bílá kuchyň s ostrůvkem a dubovou deskou",
              onChange: (e) => this.update(index, { alt: e.target.value }),
            })),
          h("label", { className: "rg-check" },
            h("input", { type: "checkbox", checked: Boolean(item.hidden), onChange: (e) => this.update(index, { hidden: e.target.checked }) }),
            "Dočasně skrýt na webu"),
          h("div", { className: "rg-actions" },
            h("button", { type: "button", className: "rg-icon", "aria-label": "Nastavit jako hlavní fotku", title: "Nastavit jako hlavní (velkou) fotku", disabled: index === 0, onClick: () => this.move(index, 0) }, icon("star")),
            h("button", { type: "button", className: "rg-icon", "aria-label": "Posunout dříve", title: "Posunout dříve", disabled: index === 0, onClick: () => this.move(index, index - 1) }, icon("up")),
            h("button", { type: "button", className: "rg-icon", "aria-label": "Posunout později", title: "Posunout později", disabled: index === count - 1, onClick: () => this.move(index, index + 1) }, icon("down")),
            h("button", { type: "button", className: "rg-icon danger", "aria-label": `Odebrat ${name}`, title: "Odebrat z galerie", onClick: () => this.askRemove(index) }, icon("trash")))));
    },

    render() {
      const items = this.items();
      const missing = items.filter((item) => !String(item.alt || "").trim()).length;
      const hidden = items.filter((item) => item.hidden).length;

      return h("div", { className: `rg ${this.props.classNameWrapper || ""}`, id: this.props.forID },
        h("style", null, STYLE),
        h("p", { className: "rg-help" },
          "Pořadí karet = pořadí na webu. ",
          h("strong", null, "První fotka"), " se zobrazí velká – vyberte tu nejhezčí (hvězdička). ",
          h("strong", null, "Popis fotky"), " čtou nevidomí návštěvníci a Google. Po úpravách klikněte nahoře na ",
          h("strong", null, "Uložit"), " a pak ", h("strong", null, "Publikovat"), "."),
        h("div", { className: "rg-bar", role: "toolbar", "aria-label": "Galerie" },
          h("span", { className: "rg-count" }, `${items.length} ${items.length === 1 ? "položka" : items.length >= 2 && items.length <= 4 ? "položky" : "položek"}${hidden ? ` · ${hidden} skryto` : ""}`),
          missing > 0 && h("span", { className: "rg-warn" }, icon("alert", 16), `${missing}× chybí popis`),
          h("button", { type: "button", className: "rg-secondary", onClick: () => this.addFromCloudinary(), title: "Soubory, které už jsou ve složce této sekce v Cloudinary" }, icon("cloud"), "Přidat z Cloudinary"),
          h("button", { type: "button", className: "rg-primary", onClick: () => this.add() }, icon("upload"), "Nahrát fotky / videa")),
        items.length
          ? h("div", { className: "rg-grid" }, ...items.map((item, index) => this.renderCard(item, index, items.length)))
          : h("div", { className: "rg-empty" },
              "Galerie je zatím prázdná. Klikněte na „Nahrát fotky / videa“ (můžete vybrat víc souborů najednou), nebo „Přidat z Cloudinary“, pokud už fotky máte ve složce. Dokud je seznam prázdný, web ukazuje vše ze složky v Cloudinary."));
    },
  });

  const RoomGalleryPreview = createClass({
    render() {
      return h("p", null, `${toArray(this.props.value).length} fotek`);
    },
  });

  window.CMS.registerWidget("room-gallery", RoomGallery, RoomGalleryPreview);
})();
