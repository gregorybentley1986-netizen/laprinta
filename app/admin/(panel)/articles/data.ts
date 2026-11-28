import "server-only";
import { isArticlePublic } from "@/lib/articles";
import type { Article, Database } from "@/lib/types";
import type { ArticleInput } from "../../article-actions";
import type { ProductOption } from "./ArticleForm";

export function productOptions(db: Database): ProductOption[] {
  return db.products
    .map((p) => ({ id: p.id, name: p.name, section: db.sections.find((s) => s.id === p.sectionId)?.title ?? "" }))
    .sort((a, b) => a.section.localeCompare(b.section, "ru") || a.name.localeCompare(b.name, "ru"));
}

export function toInput(a: Article): ArticleInput {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    coverUrl: a.coverUrl,
    coverAlt: a.coverAlt,
    bodyHtml: a.bodyHtml,
    status: a.status,
    publishedAt: a.publishedAt,
    relatedProductIds: a.relatedProductIds,
    seo: a.seo,
  };
}

export const publicArticleUrl = (a: Article) => (isArticlePublic(a) ? `/articles/${a.slug}` : null);
