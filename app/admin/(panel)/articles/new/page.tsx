import { todayMsk } from "@/lib/articles";
import { newId, readDb } from "@/lib/db";
import { ArticleForm } from "../ArticleForm";
import { productOptions } from "../data";

export const metadata = { title: "Новая статья" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const db = await readDb();
  return (
    <ArticleForm
      isNew
      products={productOptions(db)}
      publicUrl={null}
      initial={{
        id: newId(),
        title: "",
        slug: "",
        excerpt: "",
        coverUrl: null,
        coverAlt: "",
        bodyHtml: "",
        status: "draft",
        publishedAt: todayMsk(),
        relatedProductIds: [],
        seo: { title: "", description: "" },
      }}
    />
  );
}
