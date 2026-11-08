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
