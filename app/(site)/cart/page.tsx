import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { CartView } from "@/components/site/CartView";
import { listProducts } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { readDb } from "@/lib/db";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Корзина", robots: { index: false } };

export default async function CartPage() {
  const db = await readDb();
  const cards = listProducts(db, null).map((p) => toCard(db, p));
  return (
    <div className="page container">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Корзина" }]} />
      <header className="page-head">
        <h1 className="page-title">Корзина</h1>
        <p className="page-sub">Соберите позиции и скачайте спецификацию в PDF — её можно отправить нам для расчёта заказа.</p>
      </header>
      <CartView products={cards} email={site.email} />
    </div>
  );
}
