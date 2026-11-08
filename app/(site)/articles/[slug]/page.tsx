import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/site/ArticleBody";
import { ArticleGrid } from "@/components/site/ArticleCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { ProductGrid } from "@/components/site/ProductCard";
import { Icon } from "@/components/ui/Icon";
import { formatArticleDate, isArticlePublic, listPublicArticles, readingMinutes, toArticleCard } from "@/lib/articles";
import { toCard } from "@/lib/cards";
import { isPublic } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { renderArticleHtml } from "@/lib/sanitize";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const db = await readDb();
  const article = db.articles.find((a) => a.slug === slug);
  if (!article || !isArticlePublic(article)) return null;
  return { db, article };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).slug);
  if (!data) return {};
  const { article } = data;
  const title = article.seo.title || article.title;
  const description = article.seo.description || article.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/articles/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: article.coverUrl ? [{ url: article.coverUrl, alt: article.coverAlt || article.title }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const data = await load((await params).slug);
  if (!data) notFound();
  const { db, article } = data;

  const html = renderArticleHtml(article.bodyHtml);
  const related = article.relatedProductIds
    .map((id) => db.products.find((p) => p.id === id))
    .filter((p) => p && isPublic(db, p))
    .map((p) => toCard(db, p!));
  const more = listPublicArticles(db)
    .filter((a) => a.id !== article.id)
    .slice(0, 3)
    .map(toArticleCard);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    image: article.coverUrl ? [new URL(article.coverUrl, site.url).toString()] : undefined,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
    mainEntityOfPage: new URL(`/articles/${article.slug}`, site.url).toString(),
  };

  return (
    <article className="page container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { href: "/articles", label: "Статьи" }, { label: article.title }]} />
      <header className="article__head">
        <p className="article__meta">
          <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          {readingMinutes(article.bodyHtml)} мин чтения
        </p>
        <h1 className="page-title article__title">{article.title}</h1>
        {article.excerpt && <p className="article__lead">{article.excerpt}</p>}
      </header>
      {article.coverUrl && (
        <div className="article__cover">
          <Image src={article.coverUrl} alt={article.coverAlt || article.title} fill priority sizes="(max-width: 960px) 100vw, 1040px" />
        </div>
      )}
      <ArticleBody html={html} hasModel={html.includes("<model-viewer")} />

      {related.length > 0 && (
        <section className="article__related" aria-labelledby="related-title">
          <div className="band__head">
            <h2 id="related-title" className="band__title">
              Товары из статьи
            </h2>
            <Link href="/catalog" className="link-arrow">
              Весь каталог
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <ProductGrid products={related} className="pgrid--row" />
        </section>
      )}

      {more.length > 0 && (
        <section className="article__more" aria-labelledby="more-title">
          <div className="band__head">
            <h2 id="more-title" className="band__title">
              Ещё статьи
            </h2>
            <Link href="/articles" className="link-arrow">
              Все статьи
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <ArticleGrid articles={more} />
        </section>
      )}
    </article>
  );
}
