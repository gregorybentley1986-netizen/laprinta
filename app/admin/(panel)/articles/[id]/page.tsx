import { notFound } from "next/navigation";
import { readDb } from "@/lib/db";
import { ArticleForm } from "../ArticleForm";
import { productOptions, publicArticleUrl, toInput } from "../data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const db = await readDb();
  return { title: db.articles.find((a) => a.id === id)?.title ?? "Статья" };
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const db = await readDb();
  const article = db.articles.find((a) => a.id === id);
  if (!article) notFound();
  return <ArticleForm isNew={false} products={productOptions(db)} publicUrl={publicArticleUrl(article)} initial={toInput(article)} />;
}
