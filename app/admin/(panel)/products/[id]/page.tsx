import { notFound } from "next/navigation";
import { readDb } from "@/lib/db";
import { isPublic } from "@/lib/catalog";
import { ProductForm } from "../ProductForm";
import { MediaManager } from "../MediaManager";
import { sectionOptions } from "../data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const p = db.products.find((x) => x.id === id);
  return { title: p?.name ?? "Товар" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const p = db.products.find((x) => x.id === id);
  if (!p) notFound();
  const media = [...p.media].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <ProductForm
      sections={sectionOptions(db)}
      publicUrl={isPublic(db, p) ? `/product/${p.slug}` : null}
      initial={{
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        tagline: p.tagline,
        description: p.description,
        sectionId: p.sectionId,
        priceRub: p.priceRub,
        priceFrom: p.priceFrom,
        inStock: p.inStock,
        status: p.status,
        loadGrams: p.loadGrams,
        material: p.material,
        colors: p.colors,
        specs: p.specs,
        marketplace: p.marketplace,
        seo: p.seo,
      }}
      media={<MediaManager productId={p.id} productName={p.name} media={media} />}
    />
  );
}
