import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { FavoritesView } from "@/components/site/FavoritesView";
import { listProducts } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Избранное", robots: { index: false } };

export default async function FavoritesPage() {
  const db = await readDb();
  const cards = listProducts(db, null).map((p) => toCard(db, p));
  return (
    <div className="page container">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Избранное" }]} />
      <header className="page-head">
        <h1 className="page-title">Избранное</h1>
        <p className="page-sub">Сохранённые модели хранятся в браузере на этом устройстве.</p>
      </header>
      <FavoritesView products={cards} />
    </div>
  );
}
