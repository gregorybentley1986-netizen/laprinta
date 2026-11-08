import { formatArticleDate, isArticlePublic, todayMsk } from "@/lib/articles";
import { readDb } from "@/lib/db";
import { ArticlesBoard, type ArticleRow } from "./ArticlesBoard";

export const metadata = { title: "Статьи" };
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const db = await readDb();
  const today = todayMsk();
  const rows: ArticleRow[] = [...db.articles]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      cover: a.coverUrl,
      status: a.status,
      date: formatArticleDate(a.publishedAt),
      scheduled: a.status === "published" && a.publishedAt > today,
      publicUrl: isArticlePublic(a, today) ? `/articles/${a.slug}` : null,
    }));
  return <ArticlesBoard rows={rows} />;
}
