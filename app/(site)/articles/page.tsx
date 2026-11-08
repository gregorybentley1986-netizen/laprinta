import type { Metadata } from "next";
import { ArticleGrid } from "@/components/site/ArticleCard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { listPublicArticles, toArticleCard } from "@/lib/articles";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Статьи laprinta о поплавках, оснастке и 3D-печати рыболовных снастей: как выбрать, из чего печатаем и как ухаживать.";

export const metadata: Metadata = {
  title: "Статьи",
  description: DESCRIPTION,
  alternates: { canonical: "/articles" },
  openGraph: { title: "Статьи · laprinta", description: DESCRIPTION, url: "/articles" },
};

export default async function ArticlesPage() {
  const db = await readDb();
  const articles = listPublicArticles(db).map(toArticleCard);
  return (
    <div className="page container">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Статьи" }]} />
      <header className="page-head">
        <h1 className="page-title">Статьи</h1>
        <p className="page-sub">Как выбрать поплавок, из чего мы печатаем снасти и как за ними ухаживать.</p>
      </header>
      {articles.length ? (
        <ArticleGrid articles={articles} priorityCount={3} />
      ) : (
        <div className="empty">
          <Icon name="file" size={32} />
          <h2>Статей пока нет</h2>
          <p>Скоро здесь появятся материалы о поплавках и 3D-печати снастей.</p>
        </div>
      )}
    </div>
  );
}
