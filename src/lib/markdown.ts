/**
 * Markdown from the CMS rich-text editor (bold, italics, lists, links).
 * Editors are trusted (GitHub login with push access), so HTML is rendered
 * as-is; links to other sites open in a new tab.
 */
import { Marked } from "marked";

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//i.test(href);
      const attrs = [
        `href="${href}"`,
        title ? `title="${title}"` : "",
        external ? 'target="_blank" rel="noopener"' : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<a ${attrs}>${text}</a>`;
    },
  },
});

export const renderMarkdown = (source = "") => marked.parse(source.trim(), { async: false }) as string;

/** Plain text for meta descriptions, schema.org, llms.txt and agents. */
export const markdownToText = (source = "") =>
  renderMarkdown(source)
    .replace(/<li>/g, "• ")
    .replace(/<\/(p|li|h\d)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();
