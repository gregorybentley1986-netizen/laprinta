import "server-only";
import { readDb } from "./db";
import type { CatalogSection, Database, Product, ProductColor, ProductMedia, SectionNode } from "./types";

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

export type VariantChoice = {
  /** Stable id: sorted colour hexes for colour choices, normalised value for specs. */
  key: string;
  /** Rendered as chips. */
  text?: string;
  /** Rendered as a pie. */
  colors?: ProductColor[];
  current: boolean;
  /** Product page for this combination, or null when it does not exist. */
  slug: string | null;
};

export type VariantRow = {
  id: string;
  kind: "color" | "spec";
  label: string;
  choices: VariantChoice[];
};

/** Colour set identity: two products painted the same collapse into one swatch. */
const colorSignature = (p: Product) =>
  p.colors
    .map((c) => c.hex.toLowerCase())
    .sort()
    .join("|");

const specValue = (p: Product, label: string) =>
  p.specs.find((s) => s.label.trim().toLowerCase() === label.toLowerCase())?.value.trim() ?? "";

/**
 * Variant matrix for the buybox: colours (deduplicated across the series) and
 * every spec flagged `variant`. A combination is available only if a product
 * exists with the current colour *and* the current values of the other flagged
 * specs; otherwise the option is shown dimmed and cannot be clicked.
 */
export function variantRows(db: Database, product: Product): VariantRow[] {
  const members = productsInSeries(db, product);
  if (members.length < 2) return [];

  const labels: string[] = [];
  for (const s of product.specs) {
    const key = s.label.trim().toLowerCase();
    if (!s.variant || !key || !s.value.trim() || labels.some((l) => l.toLowerCase() === key)) continue;
    labels.push(s.label.trim());
  }

  const currentSignature = colorSignature(product);
  /** Same values for every flagged spec except `except` (colour is checked separately). */
  const specsMatch = (p: Product, except?: string) =>
    labels.every((label) => label.toLowerCase() === except?.toLowerCase() || specValue(p, label) === specValue(product, label));

  const rows: VariantRow[] = [];

  if (members.some((p) => p.colors.length > 0)) {
    const choices: VariantChoice[] = [];
    for (const m of members) {
      const signature = colorSignature(m);
      if (!signature || choices.some((c) => c.key === signature)) continue;
      const isCurrent = signature === currentSignature;
      // A colour is clickable when the series has a product painted that way with
      // the currently selected values of every flagged spec.
      const target = isCurrent ? null : members.find((p) => colorSignature(p) === signature && specsMatch(p));
      choices.push({ key: signature, colors: m.colors, current: isCurrent, slug: target?.slug ?? null });
    }
    if (choices.length > 1) rows.push({ id: "color", kind: "color", label: "Цвет", choices });
  }

  for (const label of labels) {
    const values: string[] = [];
    for (const m of members) {
      const value = specValue(m, label);
      if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) values.push(value);
    }
    const choices: VariantChoice[] = values.map((value) => {
      const isCurrent = specValue(product, label).toLowerCase() === value.toLowerCase();
      const target = isCurrent
        ? undefined
        : members.find(
            (p) =>
              specValue(p, label).toLowerCase() === value.toLowerCase() &&
              colorSignature(p) === currentSignature &&
              specsMatch(p, label),
          );
      return { key: value.toLowerCase(), text: value, current: isCurrent, slug: target?.slug ?? null };
    });
    if (choices.length > 1) rows.push({ id: `spec-${label.toLowerCase()}`, kind: "spec", label, choices });
  }

  return rows;
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
