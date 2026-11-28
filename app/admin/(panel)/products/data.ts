import "server-only";
import { buildTree, flattenTree } from "@/lib/catalog";
import type { Database } from "@/lib/types";

export type SectionOption = { id: string; title: string; depth: number };

export function sectionOptions(db: Database): SectionOption[] {
  const depth = (id: string | null): number => {
    const s = id ? db.sections.find((x) => x.id === id) : undefined;
    return s ? 1 + depth(s.parentId) : 0;
  };
  return flattenTree(buildTree(db, { includeHidden: true })).map((s) => ({ id: s.id, title: s.title, depth: depth(s.parentId) }));
}

export type SeriesOption = { name: string; count: number };

/** Existing series names, most used first — feeds the datalist in the product form. */
export function seriesOptions(db: Database): SeriesOption[] {
  const map = new Map<string, SeriesOption>();
  for (const p of db.products) {
    const name = (p.series ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase().replace(/ё/g, "е");
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { name, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
}
