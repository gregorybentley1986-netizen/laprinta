"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { CardProduct } from "@/lib/cards";

type Props = {
  name: string;
  items: CardProduct[];
  currentId: string;
};

const SIZES = "(max-width: 700px) 42vw, (max-width: 1200px) 22vw, 200px";

/**
 * Series carousel: products that share the same `series` value, shown as
 * preview cards in a swipeable strip (Ozon/WB style) with arrow buttons on
 * desktop. The current product is marked and links back to itself.
 */
export function SeriesCarousel({ name, items, currentId }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const scroll = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, Math.round(el.clientWidth * 0.8)), behavior: "smooth" });
  };

  const scrollable = edges.left || edges.right;

  return (
    <section className="series-block" aria-labelledby="series-title">
      <div className="series-block__head">
        <div className="series-block__title">
          <p className="series-block__overline">Серия</p>
          <h2 id="series-title">{name}</h2>
          <p className="series-block__count">
            {items.length} {items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"} в серии
          </p>
        </div>
        {scrollable && (
          <div className="series-block__nav">
            <button type="button" className="series-nav" aria-label="Предыдущие товары серии" disabled={!edges.left} onClick={() => scroll(-1)}>
              <Icon name="chevronDown" size={18} style={{ transform: "rotate(90deg)" }} />
            </button>
            <button type="button" className="series-nav" aria-label="Следующие товары серии" disabled={!edges.right} onClick={() => scroll(1)}>
              <Icon name="chevronDown" size={18} style={{ transform: "rotate(-90deg)" }} />
            </button>
          </div>
        )}
      </div>

      <ul className="series-track" ref={track} onScroll={sync} role="list">
        {items.map((it) => {
          const current = it.id === currentId;
          return (
            <li key={it.slug} className={`series-card${current ? " is-current" : ""}`}>
              <Link href={`/product/${it.slug}`} className="series-card__link" aria-current={current ? "page" : undefined}>
                <span className="series-card__media">
                  {it.cover ? (
                    <Image src={it.cover.url} alt={it.cover.alt} fill sizes={SIZES} className="series-card__img" />
                  ) : (
                    <span className="series-card__placeholder" aria-hidden="true">
                      <Icon name="image" size={22} />
                    </span>
                  )}
                  {it.status === "coming_soon" && <span className="series-card__flag">Скоро</span>}
                </span>
                <span className="series-card__body">
                  <span className="series-card__name">{it.name}</span>
                  <span className="series-card__meta">{it.sku}</span>
                  <span className="series-card__price">{it.price}</span>
                </span>
                {current && <span className="series-card__current">Этот товар</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
