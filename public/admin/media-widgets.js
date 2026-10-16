/**
 * "cloud-image" widget – a single photo field (hero, services, share image).
 *
 * Shows a preview, "Nahrát / Vyměnit" and "Odebrat". New photos go to
 * Cloudinary (CrystalInteriors/Web); existing remote URLs keep working – the
 * website serves both through Cloudinary in AVIF/WebP.
 */
(() => {
  const { h, createClass } = window;
  const CC = new Proxy({}, { get: (_, key) => window.CrystalCloudinary?.[key] ?? (() => "") });

  const preview = (value) => {
    if (!value) return "";
    const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:v\d+\/)?(.+)$/.exec(value);
    return m ? `${m[1]}c_limit,f_auto,q_auto,w_560/${m[2]}` : value;
  };

  const STYLE = `
    .ciw{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font:14px/1.5 system-ui,sans-serif}
    .ciw-thumb{width:260px;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:#f1ece4;display:grid;place-items:center;color:#8a8174}
    .ciw-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .ciw-actions{display:flex;gap:8px;flex-wrap:wrap}
    .ciw button{min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #ddd4c6;background:#fff;font:inherit;cursor:pointer}
    .ciw button.primary{background:#7a5c33;border-color:#7a5c33;color:#fff;font-weight:600}
    .ciw button.danger{color:#b42318}
    .ciw button:focus-visible{outline:2px solid #7a5c33;outline-offset:2px}`;

  const CloudImage = createClass({
    async upload() {
      const [first] = await CC.openDialog({ folder: "CrystalInteriors/Web" });
      if (first) this.props.onChange(first.url);
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
        h("div", { className: "ciw-thumb" },
          value ? h("img", { src: preview(value), alt: "", loading: "lazy" }) : "Bez fotky"),
        h("div", { className: "ciw-actions" },
          h("button", { type: "button", className: "primary", onClick: () => this.upload() },
            value ? "Vyměnit fotku…" : "Nahrát fotku…"),
          value && h("button", { type: "button", className: "danger", onClick: () => this.remove() }, "Odebrat")));
    },
  });

  const Preview = createClass({
    render() {
      return this.props.value ? h("img", { src: preview(this.props.value), alt: "", style: { maxWidth: "100%" } }) : null;
    },
  });

  window.CMS.registerWidget("cloud-image", CloudImage, Preview);
})();
