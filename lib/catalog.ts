import "server-only";
import { readDb } from "./db";
import type { CatalogSection, Database, Product, ProductMedia, SectionNode } from "./types";

export const LOAD_BUCKETS = [
  { id: "0-2", label: "до 2 г", min: 0, max: 2 },
  { id: "2-5", label: "2–5 г", min: 2, max: 5 },
  { id: "5-10", label: "5–10 г", min: 5, max: 10 },
  { id: "10+", label: "от 10 г", min: 10, max: Infinity },
] as const;

export const SORTS = [
  { id: "default", label: "Рекомендуемые" },
  { id: "price-asc", label: "Сначала дешевле" },
  { id: "price-desc", label: "Сначала дороже" },
  { id: "load-asc", label: "По грузоподъёмности" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

export type CatalogFilters = {
  load: string[];
  material: string[];
  inStock: boolean;
  sort: SortId;
};

const bySort = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder;

export function buildTree(db: Database, opts: { includeHidden?: boolean; publishedOnly?: boolean } = {}): SectionNode[] {
  const visible = db.sections.filter((s) => opts.includeHidden || s.status === "published");
  const countFor = (id: string) =>
    db.products.filter((p) => p.sectionId === id && (!opts.publishedOnly || p.status !== "draft")).length;
  const make = (parentId: string | null): SectionNode[] =>
    visible
      .filter((s) => s.parentId === parentId)
      .sort(bySort)
      .map((s) => {
        const children = make(s.id);
        return { ...s, children, productCount: countFor(s.id) + children.reduce((n, c) => n + c.productCount, 0) };
      });
  return make(null);
}

export function flattenTree(nodes: SectionNode[]): SectionNode[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children)]);
}

export function ancestors(db: Database, sectionId: string): CatalogSection[] {
  const chain: CatalogSection[] = [];
  let cur = db.sections.find((s) => s.id === sectionId);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? db.sections.find((s) => s.id === cur!.parentId) : undefined;
  }
  return chain;
}

export function sectionHref(db: Database, sectionId: string) {
  return "/catalog/" + ancestors(db, sectionId).map((s) => s.slug).join("/");
}

export function resolveSectionPath(db: Database, slugs: string[]): CatalogSection | null {
  let parentId: string | null = null;
  let found: CatalogSection | undefined;
  for (const slug of slugs) {
    found = db.sections.find((s) => s.parentId === parentId && s.slug === slug && s.status === "published");
    if (!found) return null;
    parentId = found.id;
  }
  return found ?? null;
}

function descendantIds(db: Database, sectionId: string): string[] {
  const kids = db.sections.filter((s) => s.parentId === sectionId && s.status === "published");
  return [sectionId, ...kids.flatMap((k) => descendantIds(db, k.id))];
}

/** Section ids in depth-first display order, used to order products across subsections. */
function sectionOrder(db: Database): Map<string, number> {
  const order = new Map<string, number>();
  flattenTree(buildTree(db)).forEach((s, i) => order.set(s.id, i));
  return order;
}

export function isPublic(db: Database, p: Product) {
  if (p.status === "draft") return false;
  return ancestors(db, p.sectionId).every((s) => s.status === "published");
}

export function listProducts(db: Database, sectionId: string | null, filters?: Partial<CatalogFilters>): Product[] {
  const ids = sectionId ? new Set(descendantIds(db, sectionId)) : null;
  const order = sectionOrder(db);
  let items = db.products.filter((p) => isPublic(db, p) && (!ids || ids.has(p.sectionId)));

  if (filters?.load?.length) {
    const buckets = LOAD_BUCKETS.filter((b) => filters.load!.includes(b.id));
    items = items.filter((p) => p.loadGrams != null && buckets.some((b) => p.loadGrams! >= b.min && p.loadGrams! < b.max));
  }
  if (filters?.material?.length) items = items.filter((p) => materialTokens(p).some((t) => filters.material!.includes(t)));
  if (filters?.inStock) items = items.filter((p) => p.inStock && p.status === "published");

  const defaultCmp = (a: Product, b: Product) =>
    (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0) || a.sortOrder - b.sortOrder;
  const price = (p: Product) => p.priceRub ?? Number.POSITIVE_INFINITY;
  const cmp: Record<SortId, (a: Product, b: Product) => number> = {
    default: defaultCmp,
    "price-asc": (a, b) => price(a) - price(b) || defaultCmp(a, b),
    "price-desc": (a, b) => (b.priceRub ?? -1) - (a.priceRub ?? -1) || defaultCmp(a, b),
    "load-asc": (a, b) => (a.loadGrams ?? 999) - (b.loadGrams ?? 999) || defaultCmp(a, b),
  };
  return [...items].sort(cmp[filters?.sort ?? "default"]);
}

export function materialTokens(p: Product) {
  return p.material
    .split(/[+,/]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function materialsIn(products: Product[]) {
  return [...new Set(products.flatMap(materialTokens))].sort((a, b) => a.localeCompare(b, "ru"));
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);
  const sort = SORTS.some((s) => s.id === sp.sort) ? (sp.sort as SortId) : "default";
  return { load: arr(sp.load), material: arr(sp.material), inStock: sp.stock === "1", sort };
}

export function coverOf(p: Product): ProductMedia | undefined {
  const images = p.media.filter((m) => m.type === "image").sort(bySort);
  return images.find((m) => m.isCover) ?? images[0];
}

export function sortedMedia(p: Product) {
  return [...p.media].sort(bySort);
}

/** Case/space-insensitive key so «Зима 1» и «зима  1» land in the same series. */
export function seriesKey(name: string) {
  return (name ?? "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/** Public products that share the product's series (the product itself included). */
export function productsInSeries(db: Database, product: Product): Product[] {
  const key = seriesKey(product.series);
  if (!key) return [];
  return listProducts(db, null).filter((p) => seriesKey(p.series) === key);
}

export type VariantAttribute = {
  label: string;
  options: { value: string; slug: string; current: boolean }[];
};

/**
 * Specs flagged `variant` turn into selectors on the card: every product of the
 * same series that carries the same attribute becomes an option, so a series can
 * differ by load capacity while the colour stays the same.
 */
export function variantAttributes(db: Database, product: Product): VariantAttribute[] {
  const flagged = product.specs.filter((s) => s.variant && s.value.trim());
  if (!flagged.length) return [];
  const members = productsInSeries(db, product);
  if (members.length < 2) return [];

  const out: VariantAttribute[] = [];
  const seen = new Set<string>();
  for (const spec of flagged) {
    const label = spec.label.trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const options: VariantAttribute["options"] = [];
    for (const m of members) {
      const value = m.specs.find((s) => s.label.trim().toLowerCase() === key)?.value.trim();
      if (!value) continue;
      const isCurrent = m.id === product.id;
      const existing = options.find((o) => o.value.toLowerCase() === value.toLowerCase());
      // Same value on several members: keep one chip, but never lose the marker
      // on the item being viewed.
      if (existing) {
        if (isCurrent) existing.current = true;
        continue;
      }
      options.push({ value, slug: m.slug, current: isCurrent });
    }
    if (options.length > 1) out.push({ label, options });
  }
  return out;
}

export function relatedProducts(db: Database, product: Product, limit = 4) {
  const all = listProducts(db, null).filter((p) => p.id !== product.id);
  const section = db.sections.find((s) => s.id === product.sectionId);
  const score = (p: Product) => {
    if (p.sectionId === product.sectionId) return 0;
    const ps = db.sections.find((s) => s.id === p.sectionId);
    return ps && section && ps.parentId === section.parentId ? 1 : 2;
  };
  return all.sort((a, b) => score(a) - score(b)).slice(0, limit);
}

export async function getCatalog() {
  return readDb();
}
