import Image from "next/image";
import Link from "next/link";
import type { CardProduct } from "@/lib/cards";
import { Icon } from "@/components/ui/Icon";
import { FavButton } from "./FavButton";

const SIZES = "(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 280px";

export function ProductCard({ product, priority = false }: { product: CardProduct; priority?: boolean }) {
  const { cover } = product;
  const tall = cover?.width && cover?.height ? cover.height / cover.width > 1.5 : false;
  return (
    <article className="pcard">
      <div className="pcard__media">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            sizes={SIZES}
            priority={priority}
            className={tall ? "is-contain" : undefined}
          />
        ) : (
          <div className="pcard__placeholder" aria-hidden="true">
            <Icon name="image" size={28} />
          </div>
        )}
        {product.status === "coming_soon" && <span className="tag tag--soon pcard__status">Скоро</span>}
        {(product.has3d || product.hasVideo) && (
          <div className="pcard__badges" aria-hidden="true">
            {product.has3d && (
              <span className="media-chip">
                <Icon name="cube" size={12} />
                3D
              </span>
            )}
            {product.hasVideo && (
              <span className="media-chip">
                <Icon name="play" size={11} />
                Видео
              </span>
            )}
          </div>
        )}
      </div>
      <div className="pcard__body">
        <span className="pcard__sku">{product.sku}</span>
        <h3 className="pcard__name">
          <Link href={`/product/${product.slug}`} className="pcard__link">
            {product.name}
          </Link>
        </h3>
        <p className="pcard__meta">{product.meta}</p>
        <div className="pcard__foot">
          <span className="pcard__price">{product.price}</span>
          <span className="pcard__more" aria-hidden="true">
            Смотреть
            <Icon name="arrowRight" size={14} />
          </span>
        </div>
      </div>
      <div className="pcard__fav">
        <FavButton slug={product.slug} name={product.name} />
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0, className = "" }: { products: CardProduct[]; priorityCount?: number; className?: string }) {
  return (
    <ul className={`pgrid ${className}`} role="list">
      {products.map((p, i) => (
        <li key={p.slug}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
