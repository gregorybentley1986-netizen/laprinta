import Image from "next/image";
import Link from "next/link";
import type { ArticleCard as Card } from "@/lib/articles";
import { Icon } from "@/components/ui/Icon";

export function ArticleCard({ article, priority = false }: { article: Card; priority?: boolean }) {
  return (
    <article className="acard">
      <div className="acard__media">
        {article.cover ? (
          <Image src={article.cover.url} alt={article.cover.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px" priority={priority} />
        ) : (
          <span className="acard__placeholder" aria-hidden="true">
            <Icon name="file" size={28} />
          </span>
        )}
      </div>
      <div className="acard__body">
        <p className="acard__meta">
          <time dateTime={article.dateIso}>{article.date}</time>
          <span aria-hidden="true">·</span>
          {article.minutes} мин чтения
        </p>
        <h2 className="acard__title">
          <Link href={`/articles/${article.slug}`} className="acard__link">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && <p className="acard__excerpt">{article.excerpt}</p>}
        <span className="acard__more" aria-hidden="true">
          Читать
          <Icon name="arrowRight" size={14} />
        </span>
      </div>
    </article>
  );
}

export function ArticleGrid({ articles, priorityCount = 0 }: { articles: Card[]; priorityCount?: number }) {
  return (
    <ul className="agrid" role="list">
      {articles.map((a, i) => (
        <li key={a.slug}>
          <ArticleCard article={a} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
