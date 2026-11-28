import "server-only";
import sanitizeHtml from "sanitize-html";
import { isAllowedEmbedSrc } from "./embed";
import { MEDIA_PREFIX } from "./paths";

// Allow-list for article HTML. Media must come from local uploads; iframes only
// from the canonical video-hosting URLs in lib/embed.ts.

const FIGURE_TYPES = new Set(["image", "video", "gallery", "embed", "model"]);
const isLocalMedia = (src?: string) => !!src && src.startsWith(MEDIA_PREFIX) && !src.includes("..");
const TEXT_ALIGN = { "text-align": [/^(left|right|center|justify)$/] };
const SIZE = [/^\d{1,4}px$/];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h2", "h3", "h4", "strong", "em", "u", "s", "code", "pre", "blockquote", "ul", "ol", "li", "a", "br", "hr",
    "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption", "div", "img", "video", "iframe", "model-viewer",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    ol: ["start"],
    table: ["style"],
    col: ["style"],
    th: ["colspan", "rowspan", "colwidth", "style"],
    td: ["colspan", "rowspan", "colwidth", "style"],
    figure: ["data-type", "class"],
    div: ["class"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    video: ["src", "poster", "controls", "preload", "playsinline"],
    iframe: ["src", "title", "allow", "allowfullscreen", "loading", "referrerpolicy"],
    "model-viewer": ["src", "poster", "alt", "camera-controls", "auto-rotate", "shadow-intensity", "exposure", "interaction-prompt", "touch-action"],
  },
  allowedClasses: {
    figure: ["article-figure", "article-video", "article-gallery", "article-embed", "article-model"],
    div: ["article-gallery__grid", "article-embed__frame", "table-wrap"],
  },
  allowedStyles: {
    p: TEXT_ALIGN,
    h2: TEXT_ALIGN,
    h3: TEXT_ALIGN,
    h4: TEXT_ALIGN,
    th: TEXT_ALIGN,
    td: TEXT_ALIGN,
    table: { "min-width": SIZE, width: SIZE },
    col: { "min-width": SIZE, width: SIZE },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: [], video: [], "model-viewer": [], iframe: ["https"] },
  allowProtocolRelative: false,
  allowedIframeHostnames: ["www.youtube-nocookie.com", "vk.com", "rutube.ru"],
  allowIframeRelativeUrls: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "");
      return {
        tagName,
        attribs: { href: attribs.href ?? "", ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}) },
      };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
    video: (tagName, attribs) => ({
      tagName,
      attribs: { src: attribs.src ?? "", ...(isLocalMedia(attribs.poster) ? { poster: attribs.poster } : {}), controls: "", preload: "metadata", playsinline: "" },
    }),
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        src: attribs.src ?? "",
        title: attribs.title || "Видео",
        allow: "encrypted-media; fullscreen; picture-in-picture",
        allowfullscreen: "",
        loading: "lazy",
        referrerpolicy: "strict-origin-when-cross-origin",
      },
    }),
    "model-viewer": (tagName, attribs) => ({
      tagName,
      attribs: {
        src: attribs.src ?? "",
        ...(isLocalMedia(attribs.poster) ? { poster: attribs.poster } : {}),
        alt: attribs.alt || "3D-модель",
        "camera-controls": "",
        "auto-rotate": "",
        "shadow-intensity": "1",
        "touch-action": "pan-y",
        "interaction-prompt": "none",
      },
    }),
  },
  exclusiveFilter: (frame) => {
    const { tag, attribs } = frame;
    if (tag === "img" || tag === "video" || tag === "model-viewer") {
      return !isLocalMedia(attribs.src);
    }
    if (tag === "iframe") return !isAllowedEmbedSrc(attribs.src ?? "");
    if (tag === "figure" && attribs["data-type"] && !FIGURE_TYPES.has(attribs["data-type"])) return true;
    return false;
  },
};

/** Sanitizes editor output before it is stored. */
export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, OPTIONS)
    .trim()
    .replace(/(?:<p>(?:<br \/>)?<\/p>\s*)+$/, "");
}

/** Sanitizes again at render time and wraps tables so they scroll horizontally on small screens. */
export function renderArticleHtml(html: string) {
  return sanitizeArticleHtml(html).replace(/<table\b[\s\S]*?<\/table>/g, (t) => `<div class="table-wrap">${t}</div>`);
}

export function articleText(html: string) {
  const spaced = html.replace(/<\/(p|h[2-4]|li|td|th|figcaption|blockquote|pre)>|<br\s*\/?>/gi, "$& ");
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
