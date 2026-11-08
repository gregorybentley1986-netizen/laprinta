import "server-only";
import { coverOf } from "./catalog";
import { formatGrams, formatPrice } from "./format";
import type { Database, Product } from "./types";

/** Serializable product summary for cards (also passed to client components). */
export type CardProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  meta: string;
  price: string;
  priceRub: number | null;
  priceFrom: boolean;
  status: Product["status"];
  inStock: boolean;
  hasVideo: boolean;
  has3d: boolean;
  cover: { url: string; alt: string; width?: number; height?: number } | null;
};

export function toCard(db: Database, p: Product): CardProduct {
  const section = db.sections.find((s) => s.id === p.sectionId);
  const cover = coverOf(p);
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    meta: [section?.title, formatGrams(p.loadGrams), p.material].filter(Boolean).join(" · "),
    price: formatPrice(p.priceRub, p.priceFrom),
    priceRub: p.priceRub,
    priceFrom: p.priceFrom,
    status: p.status,
    inStock: p.inStock,
    hasVideo: p.media.some((m) => m.type === "video"),
    has3d: p.media.some((m) => m.type === "glb"),
    cover: cover ? { url: cover.url, alt: cover.alt || p.name, width: cover.width, height: cover.height } : null,
  };
}
