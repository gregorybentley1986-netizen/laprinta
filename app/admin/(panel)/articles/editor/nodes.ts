import { Node, ReactNodeViewRenderer, type Attribute } from "@tiptap/react";
import { MediaNodeView } from "./MediaNodeView";

// Media blocks are atom nodes serialized as <figure data-type="…">. The public site renders
// the stored HTML (after sanitizing); the editor shows them through MediaNodeView.

const figcaption = (caption: string) => (caption ? [["figcaption", {}, caption]] : []);
const caption = (el: HTMLElement) => el.querySelector("figcaption")?.textContent?.trim() ?? "";
const attr = (selector: string, name: string, fallback: string | null = null): Partial<Attribute> => ({
  default: fallback,
  rendered: false,
  parseHTML: (el) => el.querySelector(selector)?.getAttribute(name) ?? fallback,
});
const num = (selector: string, name: string): Partial<Attribute> => ({
  default: null,
  rendered: false,
  parseHTML: (el) => {
    const v = Number(el.querySelector(selector)?.getAttribute(name));
    return Number.isFinite(v) && v > 0 ? v : null;
  },
});
const captionAttr: Partial<Attribute> = { default: "", rendered: false, parseHTML: caption };

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ""));

const base = { group: "block", atom: true, draggable: true, selectable: true } as const;

export const FigureImage = Node.create({
  name: "figureImage",
  ...base,
  addAttributes: () => ({ src: attr("img", "src"), alt: attr("img", "alt", ""), width: num("img", "width"), height: num("img", "height"), caption: captionAttr }),
  parseHTML: () => [{ tag: 'figure[data-type="image"]' }],
  renderHTML: ({ node }) => {
    const { src, alt, width, height, caption: c } = node.attrs;
    return ["figure", { "data-type": "image", class: "article-figure" }, ["img", clean({ src, alt: alt || c, width, height })], ...figcaption(c)];
  },
  addNodeView: () => ReactNodeViewRenderer(MediaNodeView),
});

export type GalleryImage = { src: string; alt: string; width?: number | null; height?: number | null };

export const Gallery = Node.create({
  name: "gallery",
  ...base,
  addAttributes: () => ({
    images: {
      default: [] as GalleryImage[],
      rendered: false,
      parseHTML: (el) =>
        [...el.querySelectorAll("img")].map((img) => ({
          src: img.getAttribute("src") ?? "",
          alt: img.getAttribute("alt") ?? "",
          width: Number(img.getAttribute("width")) || null,
          height: Number(img.getAttribute("height")) || null,
        })),
    },
    caption: captionAttr,
  }),
  parseHTML: () => [{ tag: 'figure[data-type="gallery"]' }],
  renderHTML: ({ node }) => {
    const images = node.attrs.images as GalleryImage[];
    return [
      "figure",
      { "data-type": "gallery", class: "article-gallery" },
      ["div", { class: "article-gallery__grid" }, ...images.map((i) => ["img", clean({ src: i.src, alt: i.alt, width: i.width, height: i.height })])],
      ...figcaption(node.attrs.caption),
    ];
  },
  addNodeView: () => ReactNodeViewRenderer(MediaNodeView),
});

export const FigureVideo = Node.create({
  name: "figureVideo",
  ...base,
  addAttributes: () => ({ src: attr("video", "src"), poster: attr("video", "poster"), caption: captionAttr }),
  parseHTML: () => [{ tag: 'figure[data-type="video"]' }],
  renderHTML: ({ node }) => {
    const { src, poster, caption: c } = node.attrs;
    return ["figure", { "data-type": "video", class: "article-video" }, ["video", clean({ src, poster, controls: "", preload: "metadata", playsinline: "" })], ...figcaption(c)];
  },
  addNodeView: () => ReactNodeViewRenderer(MediaNodeView),
});

export const Embed = Node.create({
  name: "embed",
  ...base,
  addAttributes: () => ({ src: attr("iframe", "src"), caption: captionAttr }),
  parseHTML: () => [{ tag: 'figure[data-type="embed"]' }],
  renderHTML: ({ node }) => {
    const { src, caption: c } = node.attrs;
    return [
      "figure",
      { "data-type": "embed", class: "article-embed" },
      ["div", { class: "article-embed__frame" }, ["iframe", { src, title: c || "Видео", allowfullscreen: "", loading: "lazy" }]],
      ...figcaption(c),
    ];
  },
  addNodeView: () => ReactNodeViewRenderer(MediaNodeView),
});

export const Model = Node.create({
  name: "model",
  ...base,
  addAttributes: () => ({ src: attr("model-viewer", "src"), poster: attr("model-viewer", "poster"), caption: captionAttr }),
  parseHTML: () => [{ tag: 'figure[data-type="model"]' }],
  renderHTML: ({ node }) => {
    const { src, poster, caption: c } = node.attrs;
    return [
      "figure",
      { "data-type": "model", class: "article-model" },
      ["model-viewer", clean({ src, poster, alt: c || "3D-модель", "camera-controls": "", "auto-rotate": "" })],
      ...figcaption(c),
    ];
  },
  addNodeView: () => ReactNodeViewRenderer(MediaNodeView),
});

export const MEDIA_NODES = [FigureImage, Gallery, FigureVideo, Embed, Model];
