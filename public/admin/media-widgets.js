/**
 * "photo" widget – a single photo field (hero, parallax strip, services).
 *
 * Shows a preview, "Nahrát / Vyměnit" and "Odebrat". New photos are
 * compressed in the browser and committed to public/gallery/web/
 * (photo-upload.js); the value is the image-set base path. Older plain paths
 * (e.g. /images/thumbnails/kuchyne.avif) keep working.
 */
(() => {
  const { h, createClass } = window;
  const CP = new Proxy({}, { get: (_, key) => window.CrystalPhotos?.[key] ?? (() => "") });

  const STYLE = `
    .ciw{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font:14px/1.5 system-ui,sans-serif}
    .ciw-thumb{width:260px;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:#f1ece4;display:grid;place-items:center;color:#8a8174}
    .ciw-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .ciw-actions{display:flex;gap:8px;flex-wrap:wrap}
    .ciw button{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #ddd4c6;background:#fff;font:inherit;cursor:pointer}
    .ciw button.primary{background:#6B3E95;border-color:#6B3E95;color:#fff;font-weight:600}
    .ciw button.danger{color:#b42318}
    .ciw button:focus-visible{outline:2px solid #6B3E95;outline-offset:2px}`;

  const image = (value, style) =>
    h("img", { src: CP.thumb(value), alt: "", loading: "lazy", style, onError: (e) => CP.onThumbError(e, value) });

  const Photo = createClass({
    async upload() {
      const label = this.props.field?.get?.("label") || "";
      const [first] = await CP.openDialog({ group: "web", prefix: CP.slugify(label) || "web", label: label ? `Web → ${label}` : "" });
      if (first) this.props.onChange(first.src);
    },
    async remove() {
      const ask = window.CrystalConfirm ?? (async () => window.confirm("Odebrat fotku?"));
      const ok = await ask({
        title: "Odebrat fotku?",
        text: "Pole zůstane prázdné. Soubor se nemaže a lze ho znovu nahrát.",
        ok: "Odebrat",
      });
      if (ok) this.props.onChange("");
    },
    render() {
      const { value, forID, classNameWrapper } = this.props;
      return h("div", { id: forID, className: `ciw ${classNameWrapper || ""}` },
        h("style", null, STYLE),
        h("div", { className: "ciw-thumb" }, value ? image(value) : "Bez fotky"),
        h("div", { className: "ciw-actions" },
          h("button", { type: "button", className: "primary", onClick: () => this.upload() },
            value ? "Vyměnit fotku…" : "Nahrát fotku…"),
          value && h("button", { type: "button", className: "danger", onClick: () => this.remove() }, "Odebrat")));
    },
  });

  const Preview = createClass({
    render() {
      return this.props.value ? image(this.props.value, { maxWidth: "100%" }) : null;
    },
  });

  window.CMS.registerWidget("photo", Photo, Preview);
})();
