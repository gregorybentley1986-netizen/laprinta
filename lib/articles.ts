import "server-only";
import { articleText } from "./sanitize";
import type { Article, Database } from "./types";

/** Today's date (YYYY-MM-DD) in Moscow, used for scheduled publication. */
export function todayMsk(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(now);
}

export function isArticlePublic(a: Article, today = todayMsk()) {
  return a.status === "published" && a.publishedAt <= today;
}

export function listPublicArticles(db: Database) {
  const today = todayMsk();
  return db.articles.filter((a) => isArticlePublic(a, today)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatArticleDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function readingMinutes(html: string) {
  const words = articleText(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

/** Serializable summary for article cards. */
export type ArticleCard = {
  slug: string;
  title: string;
  excerpt: string;
  cover: { url: string; alt: string } | null;
  date: string;
  dateIso: string;
  minutes: number;
};

export function toArticleCard(a: Article): ArticleCard {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    cover: a.coverUrl ? { url: a.coverUrl, alt: a.coverAlt || a.title } : null,
    date: formatArticleDate(a.publishedAt),
    dateIso: a.publishedAt,
    minutes: readingMinutes(a.bodyHtml),
  };
}
