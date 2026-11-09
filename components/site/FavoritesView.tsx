"use client";

import Link from "next/link";
import type { CardProduct } from "@/lib/cards";
import { useFavorites } from "@/lib/favorites";
import { Icon } from "@/components/ui/Icon";
import { ProductGrid } from "./ProductCard";

export function FavoritesView({ products }: { products: CardProduct[] }) {
  const { ids } = useFavorites();
  const items = ids.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean) as CardProduct[];

  if (!items.length) {
    return (
      <div className="empty">
        <Icon name="heart" size={32} />
        <h2>Здесь пока пусто</h2>
        <p>Отмечайте понравившиеся модели сердечком — они сохранятся на этом устройстве.</p>
        <Link href="/catalog" className="btn btn--primary">
          Перейти в каталог
        </Link>
      </div>
    );
  }
  return <ProductGrid products={items} />;
}
