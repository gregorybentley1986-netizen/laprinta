import { buildTree, coverOf, flattenTree, sectionHref } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { ProductsBoard, type BoardProduct, type BoardSection } from "./ProductsBoard";

export const metadata = { title: "Товары" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const db = await readDb();
  const { section } = await searchParams;
  const flat = flattenTree(buildTree(db, { includeHidden: true }));
  const depth = (id: string | null): number => {
    const s = id ? db.sections.find((x) => x.id === id) : undefined;
    return s ? 1 + depth(s.parentId) : 0;
  };
  const sections: BoardSection[] = flat.map((s) => ({
    id: s.id,
    title: s.title,
    depth: depth(s.parentId),
    hidden: s.status === "hidden",
    href: sectionHref(db, s.id),
  }));
  const products: BoardProduct[] = [...db.products]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      sectionId: p.sectionId,
      priceRub: p.priceRub,
      status: p.status,
      cover: coverOf(p)?.url ?? null,
      mediaCount: p.media.length,
    }));

  return (
    <ProductsBoard
      sections={sections}
      products={products}
      initialSection={sections.some((s) => s.id === section) ? section! : null}
    />
  );
}
