import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CatalogNav } from "@/components/site/CatalogNav";
import { FavButton } from "@/components/site/FavButton";
import { ProductGallery, type GalleryItem } from "@/components/site/ProductGallery";
import { ProductGrid } from "@/components/site/ProductCard";
import { Icon } from "@/components/ui/Icon";
import { ancestors, buildTree, coverOf, isPublic, listProducts, relatedProducts, sectionHref, sortedMedia } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { readDb } from "@/lib/db";
import { formatGrams, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const db = await readDb();
  const product = db.products.find((p) => p.slug === slug);
  if (!product || !isPublic(db, product)) return null;
  return { db, product };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return {};
  const { product } = data;
  const cover = coverOf(product);
  return {
    title: product.seo.title || product.name,
    description: product.seo.description || `${product.tagline}. ${formatPrice(product.priceRub, product.priceFrom)}.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: cover ? { images: [{ url: cover.url }] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { db, product } = data;

  const chain = ancestors(db, product.sectionId);
  const section = chain[chain.length - 1];
  const tree = buildTree(db, { publishedOnly: true });
  const related = relatedProducts(db, product).map((p) => toCard(db, p));
  const items: GalleryItem[] = sortedMedia(product).map((m) => ({
    id: m.id,
    type: m.type,
    url: m.url,
    posterUrl: m.posterUrl,
    alt: m.alt || product.name,
    width: m.width,
    height: m.height,
  }));

  const status =
    product.status === "coming_soon"
      ? { label: "Скоро в продаже", tone: "soon" }
      : product.inStock
        ? { label: "В наличии", tone: "ok" }
        : { label: "Нет в наличии", tone: "out" };

  const keyFacts = [
    product.loadGrams != null && { label: "Грузоподъёмность", value: formatGrams(product.loadGrams) },
    product.material && { label: "Материал", value: product.material },
    section && { label: "Раздел", value: section.title },
  ].filter(Boolean) as { label: string; value: string }[];

  const cover = coverOf(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.tagline,
    brand: { "@type": "Brand", name: "laprinta" },
    image: cover ? [new URL(cover.url, site.url).toString()] : undefined,
    offers:
      product.priceRub != null
        ? {
            "@type": "Offer",
            priceCurrency: "RUB",
            price: product.priceRub,
            availability: product.inStock && product.status === "published" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          }
        : undefined,
  };

  return (
    <div className="shell">
      <aside className="rail" aria-label="Каталог">
        <div className="rail__inner">
          <CatalogNav db={db} tree={tree} activeId={product.sectionId} openIds={chain.map((s) => s.id)} totalCount={listProducts(db, null).length} />
        </div>
      </aside>

      <article className="shell-main product" aria-labelledby="product-title">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <Breadcrumbs
          items={[
            { href: "/", label: "Главная" },
            { href: "/catalog", label: "Каталог" },
            ...chain.map((s) => ({ href: sectionHref(db, s.id), label: s.title })),
            { label: product.name },
          ]}
        />

        <header className="product__head">
          <p className="product__sku">{product.sku}</p>
          <h1 id="product-title" className="page-title">
            {product.name}
          </h1>
          {product.tagline && <p className="product__tagline">{product.tagline}</p>}
        </header>

        <div className="product__top">
          <ProductGallery items={items} name={product.name} />

          <aside className="buybox" aria-label="Цена и действия">
            <span className={`status status--${status.tone}`}>{status.label}</span>
            <p className="buybox__price">{formatPrice(product.priceRub, product.priceFrom)}</p>
            <p className="buybox__note">Цена за 1 шт. · ориентир для каталога</p>

            {product.colors.length > 0 && (
              <div className="buybox__colors">
                <p className="buybox__label">Расцветки</p>
                <ul role="list">
                  {product.colors.map((c) => (
                    <li key={c} className="color-chip">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="buybox__actions">
              <FavButton slug={product.slug} name={product.name} variant="button" />
              {product.marketplace.ozonUrl && (
                <a className="btn btn--ink" href={product.marketplace.ozonUrl} target="_blank" rel="noopener noreferrer">
                  Купить на Ozon
                  <Icon name="external" size={16} />
                </a>
              )}
              {product.marketplace.wildberriesUrl && (
                <a className="btn btn--ink" href={product.marketplace.wildberriesUrl} target="_blank" rel="noopener noreferrer">
                  Купить на Wildberries
                  <Icon name="external" size={16} />
                </a>
              )}
            </div>

            <dl className="facts-list">
              {keyFacts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>

            <a className="buybox__contact" href={`mailto:${site.email}?subject=${encodeURIComponent(`${product.name} (${product.sku})`)}`}>
              <Icon name="mail" size={16} />
              Вопрос по товару или опт
            </a>
          </aside>
        </div>

        <section className="product__details" aria-label="Описание и характеристики">
          <div className="product__desc">
            <h2>Описание</h2>
            {product.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {product.specs.length > 0 && (
            <div className="product__specs">
              <h2>Характеристики</h2>
              <table className="spec-table">
                <tbody>
                  {product.specs.map((s, i) => (
                    <tr key={i}>
                      <th scope="row">{s.label}</th>
                      <td>{s.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Артикул</th>
                    <td>{product.sku}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {related.length > 0 && (
          <section className="product__related" aria-labelledby="related-title">
            <h2 id="related-title" className="section-title">
              Смотреть ещё
            </h2>
            <ProductGrid products={related} />
          </section>
        )}
      </article>
    </div>
  );
}
