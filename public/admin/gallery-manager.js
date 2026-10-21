/**
 * "project-gallery" widget – one project's photos on one screen.
 *
 * Every card is one photo exactly as the website shows it: the 4:3 tile crop
 * (focus point), alt text, hide, order, remove. New photos are compressed in
 * the browser and committed to public/gallery/projekty/<slug>/
 * (photo-upload.js → image-pipeline.js + repo-store.js), then added to the end.
 *
 * Value: array of { src, alt, hidden, focus: { x, y } }.
 */
(() => {
  const { h, createClass } = window;
  // Resolved lazily: a stale cached photo-upload.js must not crash Decap.
  const CP = new Proxy({}, { get: (_, key) => window.CrystalPhotos?.[key] ?? (() => "") });

  const toArray = (value) => {
    const plain = value?.toJS ? value.toJS() : value;
    return Array.isArray(plain) ? plain : [];
  };
  const fileName = (src) => String(src || "").split("/").pop();
  const slugify = (value) =>
    String(value || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

  const ICONS = {
    up: "M6 15l6-6 6 6",
    down: "M6 9l6 6 6-6",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
    upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
    eyeOff: "M3 3l18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9.9 5.1A9.8 9.8 0 0 1 21 12a13 13 0 0 1-2.2 3.1 M6.6 6.6A13 13 0 0 0 3 12a9.8 9.8 0 0 0 11.4 5.6",
    alert: "M12 9v4 M12 17h.01 M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    focus: "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  };
  const icon = (name, size = 18) =>
    h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      h("path", { d: ICONS[name] }));

  const STYLE = `
  .rg{--brand:#6B3E95;--brand-bg:#F3EDF9;--line:#ddd4c6;--muted:#6b6357;font:14px/1.5 system-ui,sans-serif;color:#1f1d1a}
  .rg button,.rg input{font:inherit}
  .rg :focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .rg-help{margin:0 0 14px;padding:12px 16px;border-radius:10px;background:var(--brand-bg);color:#3F2A57}
  .rg-bar{position:sticky;top:0;z-index:2;display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 0;margin-bottom:14px;background:#fff;border-bottom:1px solid var(--line)}
  .rg-count{color:var(--muted)}
  .rg-warn{display:inline-flex;align-items:center;gap:6px;color:#9a5b00}
  .rg-primary{margin-left:auto;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:0;border-radius:10px;background:var(--brand);color:#fff;font-weight:600;cursor:pointer}
  .rg-primary:hover{background:#5B2C83}
  .rg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
  .rg-card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;transition:box-shadow .2s}
  .rg-card:hover{box-shadow:0 8px 24px rgb(0 0 0/.08)}
  .rg-card[data-hidden=true] .rg-thumb img{opacity:.35}
  .rg-thumb{position:relative;aspect-ratio:4/3;background:#eee;display:block;width:100%;padding:0;border:0;overflow:hidden;cursor:crosshair}
  .rg-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
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
        text: `„${fileName(this.items()[index].src)}“ zmizí z webu po uložení a publikování. Soubor zůstane uložený v repozitáři webu.`,
        ok: "Odebrat z webu",
      });
      if (ok) this.commit(this.items().filter((_, i) => i !== index));
    },

    async add() {
      const room = this.room();
      const uploaded = await CP.openDialog({
        multiple: true,
        group: `projekty/${room.slug}`,
        prefix: room.slug,
        label: room.title ? `Projekty → ${room.title}` : "",
      });
      if (!uploaded.length) return;
      this.commit([...this.items(), ...uploaded.map(({ src, focus }) => ({ src, alt: "", hidden: false, focus }))]);
    },

    async focus(index) {
      const item = this.items()[index];
      const next = await CP.editFocus({ src: item.src, focus: item.focus });
      if (next) this.update(index, { focus: next });
    },

    renderCard(item, index, count) {
      const name = fileName(item.src);
      const missingAlt = !String(item.alt || "").trim();
      return h("article", { key: item.src + index, className: "rg-card", "data-hidden": String(Boolean(item.hidden)) },
        h("button", { type: "button", className: "rg-thumb", onClick: () => this.focus(index), title: "Nastavit, co má být vidět v náhledu" },
          h("img", {
            src: CP.thumb(item.src),
            alt: item.alt || name,
            loading: "lazy",
            decoding: "async",
            style: item.focus ? { objectPosition: `${item.focus.x}% ${item.focus.y}%` } : undefined,
            onError: (e) => CP.onThumbError(e, item.src),
          }),
          h("div", { className: "rg-badges" },
            index === 0 && h("span", { className: "rg-badge cover" }, icon("star", 13), "Hlavní fotka"),
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
            h("button", { type: "button", className: "rg-icon", "aria-label": "Nastavit výřez náhledu", title: "Co má být vidět v náhledu (výřez 4:3)", onClick: () => this.focus(index) }, icon("focus")),
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
          h("strong", null, "První fotka"), " se zobrazí velká – vyberte tu nejhezčí (hvězdička). Kliknutím na fotku určíte, co má být vidět v náhledu. ",
          h("strong", null, "Popis fotky"), " čtou nevidomí návštěvníci a Google. Po úpravách klikněte nahoře na ",
          h("strong", null, "Uložit"), " a pak ", h("strong", null, "Publikovat"), "."),
        h("div", { className: "rg-bar", role: "toolbar", "aria-label": "Galerie" },
          h("span", { className: "rg-count" }, `${items.length} ${items.length === 1 ? "položka" : items.length >= 2 && items.length <= 4 ? "položky" : "položek"}${hidden ? ` · ${hidden} skryto` : ""}`),
          missing > 0 && h("span", { className: "rg-warn" }, icon("alert", 16), `${missing}× chybí popis`),
          h("button", { type: "button", className: "rg-primary", onClick: () => this.add() }, icon("upload"), "Nahrát fotky")),
        items.length
          ? h("div", { className: "rg-grid" }, ...items.map((item, index) => this.renderCard(item, index, items.length)))
          : h("div", { className: "rg-empty" },
              "Galerie je zatím prázdná. Klikněte na „Nahrát fotky“ – můžete vybrat víc fotek najednou."));
    },
  });

  const RoomGalleryPreview = createClass({
    render() {
      return h("p", null, `${toArray(this.props.value).length} fotek`);
    },
  });

  window.CMS.registerWidget("project-gallery", RoomGallery, RoomGalleryPreview);
})();
