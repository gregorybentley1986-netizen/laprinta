import { buildTree, sectionHref } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { SectionsBoard, type AdminSectionNode } from "./SectionsBoard";

export const metadata = { title: "Разделы" };

export default async function SectionsPage() {
  const db = await readDb();
  const map = (nodes: ReturnType<typeof buildTree>): AdminSectionNode[] =>
    nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.title,
      slug: n.slug,
      description: n.description,
      status: n.status,
      productCount: n.productCount,
      directCount: db.products.filter((p) => p.sectionId === n.id).length,
      href: sectionHref(db, n.id),
      children: map(n.children),
    }));
  return <SectionsBoard tree={map(buildTree(db, { includeHidden: true }))} />;
}
